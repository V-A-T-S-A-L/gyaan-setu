"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { UploadCloud, Plus, Trash2, CheckCircle2, Loader2, AlertCircle } from "lucide-react"
import { Header } from "@/components/header"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import ProtectedRoute from "@/lib/route-guards"

type Question = {
  question: string
  options: string[]
  answer: string
}

type Module = {
  id: number
  name: string
  description: string
  created_at: string
}

type UploadStatus =
  | "idle"
  | "uploading"
  | "parsing"
  | "ingesting"
  | "done"
  | "error"

const RAG_SERVICE_URL = process.env.NEXT_PUBLIC_RAG_SERVICE_URL ?? "http://localhost:8000"

export default function ModuleContentPage() {
  const params   = useParams()
  const moduleId = params.id as string
  const supabase = createClient()
  const { user } = useAuth()

  const [module,      setModule]      = useState<Module>()
  const [active,      setActive]      = useState<"pdf" | "interactive" | "models" | "quiz">("pdf")
  const [pdf,         setPdf]         = useState<File | null>(null)
  const [model,       setModel]       = useState<File | null>(null)
  const [blocks,      setBlocks]      = useState<string[]>([])
  const [blockInput,  setBlockInput]  = useState("")
  const [questions,   setQuestions]   = useState<Question[]>([])
  const [q,           setQ]           = useState({ question: "", options: ["", "", "", ""], answer: "" })
  const [uploadStatus,setUploadStatus]= useState<UploadStatus>("idle")
  const [uploadError, setUploadError] = useState<string>("")
  const [chunkCount,  setChunkCount]  = useState<number>(0)

  const addBlock = () => {
    if (!blockInput) return
    setBlocks([...blocks, blockInput])
    setBlockInput("")
  }

  const addQuestion = () => {
    if (!q.question) return
    setQuestions([...questions, q])
    setQ({ question: "", options: ["", "", "", ""], answer: "" })
  }

  const fetchModule = async () => {
    const { data, error } = await supabase
      .from("modules")
      .select("*")
      .eq("id", moduleId)
      .single()
    if (error) { console.error("Error fetching module:", error); return }
    setModule(data)
  }

  useEffect(() => {
    if (!moduleId || !user) return
    fetchModule()
  }, [user])

  // ── PDF Upload → Parse → RAG Ingest ──────────────────────────────────────
  const handlePdfUpload = async () => {
    if (!pdf || !moduleId) return

    setUploadError("")
    setChunkCount(0)

    try {
      // ── STEP 1: Upload PDF to Supabase Storage ────────────────────────────
      setUploadStatus("uploading")

      const fileExt  = pdf.name.split(".").pop()
      const fileName = `docs/${moduleId}.${fileExt}`

      const { error: storageError } = await supabase.storage
        .from("docs")
        .upload(fileName, pdf, { upsert: true })

      if (storageError) throw new Error(`Storage upload failed: ${storageError.message}`)

      const { data: urlData } = supabase.storage.from("docs").getPublicUrl(fileName)
      const publicUrl = urlData.publicUrl

      // Insert into docs table — capture the row ID
      const { data: insertedDoc, error: dbError } = await supabase
        .from("docs")
        .insert({ module_id: moduleId, name: pdf.name, url: publicUrl })
        .select()
        .single()

      if (dbError) throw new Error(`DB insert failed: ${dbError.message}`)

      // ── STEP 2: Parse PDF → extract sentences → store JSON in Storage ─────
      setUploadStatus("parsing")

      const parseRes = await fetch("/api/parse-pdf", {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          docId   : insertedDoc.id,
          moduleId,
          filePath: fileName,
        }),
      })

      if (!parseRes.ok) {
        const err = await parseRes.json()
        throw new Error(err.details ?? "PDF parsing failed")
      }

      // ✅ Capture parsedUrl from parse-pdf response
      const parseData = await parseRes.json()
      const parsedUrl = parseData.parsedUrl

      if (!parsedUrl) throw new Error("parse-pdf did not return a parsedUrl")

      // ── STEP 3: Send to Python RAG service → embed into ChromaDB ──────────
      setUploadStatus("ingesting")

      const ingestRes = await fetch(`${RAG_SERVICE_URL}/ingest`, {
        method : "POST",
        headers: { "Content-Type": "application/json" },
        body   : JSON.stringify({
          doc_id    : insertedDoc.id,   // UUID from docs table
          parsed_url: parsedUrl,         // public URL of parsed JSON in Storage
        }),
      })

      if (!ingestRes.ok) {
        const err = await ingestRes.json()
        throw new Error(err.detail ?? "RAG ingestion failed")
      }

      const ingestData = await ingestRes.json()
      setChunkCount(ingestData.chunks_stored ?? 0)
      setUploadStatus("done")

    } catch (err: any) {
      console.error("Upload pipeline failed:", err)
      setUploadError(err.message ?? "Something went wrong")
      setUploadStatus("error")
    }
  }

  const statusLabel: Record<UploadStatus, string> = {
    idle     : "Upload",
    uploading: "Uploading PDF...",
    parsing  : "Extracting text...",
    ingesting: "Building AI index...",
    done     : "Done!",
    error    : "Retry",
  }

  const isLoading = ["uploading", "parsing", "ingesting"].includes(uploadStatus)

  return (
    <ProtectedRoute allowedRole="teacher">
      <div className="h-screen w-full flex flex-col">
        <Header />

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar */}
          <div className="w-64 border-r bg-muted/40 flex flex-col">
            <div className="border-b px-4 py-4">
              <h1 className="text-lg font-semibold">{module?.name}</h1>
              <p className="text-xs text-muted-foreground">{module?.description}</p>
            </div>

            <div className="flex-1 p-3 space-y-2">
              {["pdf", "interactive", "models", "quiz"].map((item) => (
                <div
                  key={item}
                  onClick={() => setActive(item as any)}
                  className={`p-3 rounded-lg cursor-pointer capitalize flex justify-between items-center ${
                    active === item ? "bg-background shadow" : "hover:bg-background"
                  }`}
                >
                  {item}
                </div>
              ))}
            </div>

            <div className="p-4 border-t space-y-2">
              <Button className="w-full">Preview</Button>
              <Button className="w-full">Publish</Button>
            </div>
          </div>

          {/* Main */}
          <div className="flex-1 p-8 overflow-y-auto space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold capitalize">{active}</h2>
              <div className="flex gap-2">
                <Button variant="secondary">Save Draft</Button>
                <Button>Add Section</Button>
              </div>
            </div>

            {/* ── PDF Tab ───────────────────────────────────────────────── */}
            {active === "pdf" && (
              <div className="grid grid-cols-2 gap-6">
                <Card className="h-[500px] flex flex-col justify-center items-center border-dashed p-6 gap-3">
                  <UploadCloud className="text-muted-foreground" size={36} />
                  <p className="text-muted-foreground text-sm">Upload a PDF for this module</p>

                  <Input
                    type="file"
                    accept="application/pdf"
                    className="max-w-xs"
                    disabled={isLoading}
                    onChange={(e) => {
                      setPdf(e.target.files?.[0] || null)
                      setUploadStatus("idle")
                      setUploadError("")
                    }}
                  />

                  {pdf && (
                    <p className="text-sm text-muted-foreground truncate max-w-xs">{pdf.name}</p>
                  )}

                  <Button
                    className="mt-2 min-w-[160px]"
                    onClick={handlePdfUpload}
                    disabled={!pdf || isLoading || uploadStatus === "done"}
                  >
                    {isLoading ? (
                      <span className="flex items-center gap-2">
                        <Loader2 size={14} className="animate-spin" />
                        {statusLabel[uploadStatus]}
                      </span>
                    ) : uploadStatus === "done" ? (
                      <span className="flex items-center gap-2">
                        <CheckCircle2 size={14} />
                        {statusLabel[uploadStatus]}
                      </span>
                    ) : (
                      statusLabel[uploadStatus]
                    )}
                  </Button>

                  {/* Progress steps */}
                  {(isLoading || uploadStatus === "done") && (
                    <div className="flex flex-col gap-1 w-full max-w-xs mt-2">
                      {[
                        { key: "uploading", label: "Upload to storage" },
                        { key: "parsing",   label: "Extract text from PDF" },
                        { key: "ingesting", label: "Build AI search index" },
                      ].map((step) => {
                        const statusOrder = ["uploading", "parsing", "ingesting", "done"]
                        const currentIdx  = statusOrder.indexOf(uploadStatus)
                        const stepIdx     = statusOrder.indexOf(step.key)
                        const isDone      = currentIdx > stepIdx || uploadStatus === "done"
                        const isCurrent   = uploadStatus === step.key

                        return (
                          <div key={step.key} className="flex items-center gap-2 text-xs">
                            {isDone ? (
                              <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                            ) : isCurrent ? (
                              <Loader2 size={12} className="animate-spin text-blue-500 shrink-0" />
                            ) : (
                              <div className="w-3 h-3 rounded-full border border-muted-foreground shrink-0" />
                            )}
                            <span className={
                              isDone    ? "text-green-600" :
                              isCurrent ? "text-blue-500"  :
                                          "text-muted-foreground"
                            }>
                              {step.label}
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  )}

                  {/* Success */}
                  {uploadStatus === "done" && (
                    <p className="text-xs text-green-600 text-center">
                      ✅ PDF ready — {chunkCount} chunks indexed for student Q&A
                    </p>
                  )}

                  {/* Error */}
                  {uploadStatus === "error" && (
                    <div className="flex items-center gap-2 text-xs text-red-500">
                      <AlertCircle size={12} />
                      {uploadError}
                    </div>
                  )}
                </Card>

                <Card className="p-4 h-[500px] flex flex-col">
                  <CardTitle>Preview</CardTitle>
                  <div className="mt-4 flex-1 border rounded-md overflow-hidden">
                    {pdf ? (
                      <iframe src={URL.createObjectURL(pdf)} className="w-full h-full" />
                    ) : (
                      <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                        No file selected
                      </div>
                    )}
                  </div>
                </Card>
              </div>
            )}

            {/* ── Interactive Tab ───────────────────────────────────────── */}
            {active === "interactive" && (
              <div className="grid grid-cols-2 gap-6">
                <Card className="p-5 space-y-4">
                  <CardHeader>
                    <CardTitle>Create Learning Block</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <Input
                      placeholder="Simple title (e.g. What is Force?)"
                      value={blockInput}
                      onChange={(e) => setBlockInput(e.target.value)}
                    />
                    <Textarea
                      placeholder="Explain in short, clear sentences..."
                      className="min-h-[120px] leading-relaxed"
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <Button variant="secondary">+ Add Image</Button>
                      <Button variant="secondary">+ Add Audio</Button>
                      <Button variant="secondary">+ Add Hint</Button>
                      <Button variant="secondary">+ Add Example</Button>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={addBlock} className="flex-1 flex gap-2">
                        <Plus size={16} /> Add Block
                      </Button>
                      <Button variant="outline">Preview</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card className="p-5 space-y-3">
                  <CardHeader><CardTitle>Learning Flow</CardTitle></CardHeader>
                  <CardContent className="space-y-3">
                    {blocks.length === 0 && (
                      <p className="text-sm text-muted-foreground">
                        No blocks yet. Keep content short, visual, and step-by-step.
                      </p>
                    )}
                    {blocks.map((b, i) => (
                      <div key={i} className="p-3 border rounded-lg flex flex-col gap-2 bg-background">
                        <div className="flex justify-between items-center">
                          <span className="text-sm font-medium">Step {i + 1}</span>
                          <Trash2
                            size={16}
                            className="cursor-pointer text-muted-foreground hover:text-destructive"
                            onClick={() => setBlocks(blocks.filter((_, idx) => idx !== i))}
                          />
                        </div>
                        <p className="text-sm leading-relaxed">{b}</p>
                        <div className="flex gap-2 flex-wrap">
                          <span className="text-xs px-2 py-1 bg-muted rounded">Text</span>
                          <span className="text-xs px-2 py-1 bg-muted rounded">Visual</span>
                          <span className="text-xs px-2 py-1 bg-muted rounded">Optional Audio</span>
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>
            )}

            {/* ── Models Tab ────────────────────────────────────────────── */}
            {active === "models" && (
              <div className="grid grid-cols-2 gap-6">
                <Card className="h-[400px] flex flex-col justify-center items-center border-dashed">
                  <UploadCloud className="mb-4 text-muted-foreground" />
                  <p className="text-muted-foreground mb-2">Upload 3D Model</p>
                  <Input
                    type="file"
                    accept=".glb,.gltf"
                    className="max-w-xs"
                    onChange={(e) => setModel(e.target.files?.[0] || null)}
                  />
                  {model && <p className="mt-2 text-sm">{model.name}</p>}
                  <Button className="mt-4">Upload</Button>
                </Card>
                <Card className="p-4">
                  <CardTitle>Preview</CardTitle>
                  <div className="mt-4 text-sm text-muted-foreground">3D viewer will render here</div>
                </Card>
              </div>
            )}

            {/* ── Quiz Tab ──────────────────────────────────────────────── */}
            {active === "quiz" && (
              <div className="grid grid-cols-2 gap-6">
                <Card className="p-4 space-y-3">
                  <Input
                    placeholder="Question"
                    value={q.question}
                    onChange={(e) => setQ({ ...q, question: e.target.value })}
                  />
                  {q.options.map((opt, i) => (
                    <Input
                      key={i}
                      placeholder={`Option ${String.fromCharCode(65 + i)}`}
                      value={opt}
                      onChange={(e) => {
                        const newOpts = [...q.options]
                        newOpts[i] = e.target.value
                        setQ({ ...q, options: newOpts })
                      }}
                    />
                  ))}
                  <Input
                    placeholder="Correct Answer"
                    value={q.answer}
                    onChange={(e) => setQ({ ...q, answer: e.target.value })}
                  />
                  <Button onClick={addQuestion}>Add Question</Button>
                </Card>

                <Card className="p-4 space-y-2">
                  <CardTitle>Questions</CardTitle>
                  {questions.map((ques, i) => (
                    <div key={i} className="p-3 border rounded space-y-1">
                      <p className="font-medium text-sm">{ques.question}</p>
                      <ul className="text-xs text-muted-foreground">
                        {ques.options.map((o, idx) => <li key={idx}>{o}</li>)}
                      </ul>
                      <p className="text-xs">Ans: {ques.answer}</p>
                    </div>
                  ))}
                </Card>
              </div>
            )}
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
