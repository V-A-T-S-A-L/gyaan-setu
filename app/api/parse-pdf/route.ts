export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { promises as fs } from "fs"
import { v4 as uuidv4 } from "uuid"
import PDFParser from "pdf2json"
import os from "os"
import path from "path"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const fixBrokenSpacing = (text: string) => {
  return text
    .replace(/-+Page.*?-+/gi, "")
    .replace(/\s+/g, " ")
    .replace(/(\b\w\b(?:\s\w\b)+)/g, (m) => m.replace(/\s/g, ""))
    .replace(/\b(\d\s)+\d\b/g, (m) => m.replace(/\s/g, ""))
    .replace(/\s+/g, " ")
    .trim()
}

export async function POST(req: NextRequest) {
  try {
    // ✅ CHANGE 1: Accept docId alongside moduleId and filePath
    const { moduleId, filePath, docId } = await req.json()

    if (!moduleId || !filePath) {
      return NextResponse.json(
        { error: "Missing moduleId or filePath" },
        { status: 400 }
      )
    }

    console.log("📥 Fetching file from:", filePath)

    const { data: signedData, error: signedError } =
      await supabase.storage.from("docs").createSignedUrl(filePath, 60)

    if (signedError || !signedData?.signedUrl) {
      throw new Error("Failed to create signed URL")
    }

    const res = await fetch(signedData.signedUrl, { cache: "no-store" })
    if (!res.ok) throw new Error("Failed to fetch PDF via signed URL")

    const buffer = Buffer.from(await res.arrayBuffer())
    console.log("📄 File size:", buffer.length)

    if (buffer.length < 1000) {
      throw new Error("File too small — likely wrong file")
    }

    const tempFilePath = path.join(os.tmpdir(), `${uuidv4()}-${Date.now()}.pdf`)
    await fs.writeFile(tempFilePath, buffer)

    const pdfParser = new (PDFParser as any)(null, 1)

    const rawText: string = await new Promise((resolve, reject) => {
      pdfParser.on("pdfParser_dataError", (errData: any) =>
        reject(errData.parserError)
      )
      pdfParser.on("pdfParser_dataReady", () => {
        const text = pdfParser.getRawTextContent() as string
        resolve(text)
      })
      pdfParser.loadPDF(tempFilePath)
    })

    await fs.unlink(tempFilePath)

    if (!rawText || rawText.trim().length === 0) {
      throw new Error("No text extracted from PDF")
    }

    console.log("📝 Raw preview:", rawText.slice(0, 200))

    let cleanedText = fixBrokenSpacing(rawText)

    const sentenceRegex = /(?<=[.!?])\s+(?=[A-Z])/g
    let sentences = cleanedText
      .split(sentenceRegex)
      .map((s) => s.trim())
      .filter((s) => s.length > 10 && s.length < 500)

    if (sentences.length === 0) sentences = [cleanedText]

    console.log("✅ Sentences:", sentences.length)

    const structured = {
      meta: {
        moduleId,
        totalSentences: sentences.length,
        createdAt: new Date().toISOString(),
      },
      sentences: sentences.map((text, i) => ({ id: i, text })),
    }

    const jsonPath = `parsed/${moduleId}.json`

    const { error: uploadError } = await supabase.storage
      .from("docs")
      .upload(jsonPath, JSON.stringify(structured), {
        upsert: true,
        contentType: "application/json",
      })

    if (uploadError) throw uploadError

    const { data: urlData } = supabase.storage
      .from("docs")
      .getPublicUrl(jsonPath)

    const parsedUrl = urlData?.publicUrl

    // ✅ CHANGE 2: Update by docId (precise) if provided, fallback to moduleId
    const updateQuery = supabase.from("docs").update({ parsed_url: parsedUrl })

    if (docId) {
      await updateQuery.eq("id", docId)
    } else {
      await updateQuery.eq("module_id", moduleId)
    }

    return NextResponse.json({
      success: true,
      sentences: sentences.length,
      parsedUrl,
    })
  } catch (err: any) {
    console.error("❌ PDF PARSE ERROR:", err)
    return NextResponse.json(
      { error: "Parsing failed", details: err.message },
      { status: 500 }
    )
  }
}
