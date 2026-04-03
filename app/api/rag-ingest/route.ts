export const runtime = "nodejs"

import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"
import { GoogleGenerativeAI } from "@google/generative-ai"

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Gemini — FREE embedding model only (Groq has no embeddings)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
const EMBED_MODEL        = "text-embedding-004"  // 768-dim, free
const SENTENCES_PER_CHUNK = 8
const OVERLAP_SENTENCES   = 2

export async function POST(req: NextRequest) {
  try {
    const { docId, moduleId } = await req.json()

    if (!docId || !moduleId) {
      return NextResponse.json(
        { error: "docId and moduleId are required" },
        { status: 400 }
      )
    }

    // ── 1. Fetch doc row ──────────────────────────────────────────────────────
    const { data: doc, error: docErr } = await supabase
      .from("docs")
      .select("id, name, parsed_url")
      .eq("id", docId)
      .single()

    if (docErr || !doc) {
      return NextResponse.json({ error: "Doc not found" }, { status: 404 })
    }

    if (!doc.parsed_url) {
      return NextResponse.json(
        { error: "parsed_url is empty — run /api/parse-pdf first" },
        { status: 422 }
      )
    }

    // ── 2. Get room_id from module ────────────────────────────────────────────
    const { data: moduleData, error: moduleErr } = await supabase
      .from("modules")
      .select("id, room_id")
      .eq("id", moduleId)
      .single()

    if (moduleErr || !moduleData?.room_id) {
      return NextResponse.json({ error: "Module or room not found" }, { status: 404 })
    }

    const roomId = moduleData.room_id

    // ── 3. Skip if already ingested ───────────────────────────────────────────
    const { count } = await supabase
      .from("doc_chunks")
      .select("id", { count: "exact", head: true })
      .eq("doc_id", docId)

    if ((count ?? 0) > 0) {
      console.log(`[rag-ingest] Already ingested — skipping`)
      return NextResponse.json({ success: true, skipped: true, chunks: count })
    }

    // ── 4. Fetch parsed JSON from storage ─────────────────────────────────────
    console.log(`[rag-ingest] Fetching JSON from: ${doc.parsed_url}`)
    const jsonRes = await fetch(doc.parsed_url, { cache: "no-store" })
    if (!jsonRes.ok) throw new Error(`Failed to fetch parsed JSON: ${jsonRes.status}`)

    const parsedData = await jsonRes.json()
    // Structure from parse-pdf: { meta, sentences: [{ id, text }] }
    const sentences: string[] = parsedData.sentences.map(
      (s: { id: number; text: string }) => s.text
    )

    console.log(`[rag-ingest] Loaded ${sentences.length} sentences`)

    if (sentences.length === 0) {
      return NextResponse.json({ error: "No sentences in parsed JSON" }, { status: 422 })
    }

    // ── 5. Build overlapping chunks ───────────────────────────────────────────
    const chunks: string[] = []
    const step = SENTENCES_PER_CHUNK - OVERLAP_SENTENCES  // slide by 6

    for (let i = 0; i < sentences.length; i += step) {
      const slice = sentences.slice(i, i + SENTENCES_PER_CHUNK)
      if (slice.length < 2) break
      chunks.push(slice.join(" "))
    }

    console.log(`[rag-ingest] Created ${chunks.length} chunks`)

    // ── 6. Embed via Gemini text-embedding-004 ────────────────────────────────
    const embedModel  = genAI.getGenerativeModel({ model: EMBED_MODEL })
    const BATCH_SIZE  = 20
    const embeddings: number[][] = []

    for (let i = 0; i < chunks.length; i += BATCH_SIZE) {
      const batch = chunks.slice(i, i + BATCH_SIZE)
      console.log(
        `[rag-ingest] Embedding batch ${Math.floor(i / BATCH_SIZE) + 1}/` +
        `${Math.ceil(chunks.length / BATCH_SIZE)}`
      )

      const batchEmbeddings = await Promise.all(
        batch.map(async (text) => {
          const result = await embedModel.embedContent(text)
          return result.embedding.values  // float[]
        })
      )
      embeddings.push(...batchEmbeddings)

      // Respect free tier rate limit (100 req/min)
      if (i + BATCH_SIZE < chunks.length) {
        await new Promise((r) => setTimeout(r, 500))
      }
    }

    // ── 7. Upsert into doc_chunks ─────────────────────────────────────────────
    const rows = chunks.map((content, idx) => ({
      doc_id      : docId,
      module_id   : moduleId,
      room_id     : roomId,
      chunk_index : idx,
      content,
      embedding   : embeddings[idx],  // vector(768)
    }))

    for (let i = 0; i < rows.length; i += 50) {
      const { error: insertErr } = await supabase
        .from("doc_chunks")
        .insert(rows.slice(i, i + 50))
      if (insertErr) throw new Error(`Insert failed: ${insertErr.message}`)
    }

    console.log(`[rag-ingest] ✅ ${chunks.length} chunks stored for doc ${docId}`)

    return NextResponse.json({
      success    : true,
      doc_id     : docId,
      chunks     : chunks.length,
      sentences  : sentences.length,
      embed_model: EMBED_MODEL,
    })

  } catch (err: any) {
    console.error("[rag-ingest] ❌", err)
    return NextResponse.json(
      { error: "Ingestion failed", details: err.message },
      { status: 500 }
    )
  }
}

// DELETE /api/rag-ingest?docId=xxx — clear chunks to re-ingest
export async function DELETE(req: NextRequest) {
  const docId = new URL(req.url).searchParams.get("docId")
  if (!docId) return NextResponse.json({ error: "docId required" }, { status: 400 })

  const { error } = await supabase.from("doc_chunks").delete().eq("doc_id", docId)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
