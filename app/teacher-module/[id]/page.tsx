"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { UploadCloud, Plus, Trash2 } from "lucide-react"
import { Header } from "@/components/header"
import { useParams } from "next/navigation"
import { createClient } from "@/lib/supabase/client"
import { useAuth } from "@/lib/auth-context"
import ProtectedRoute from "@/lib/route-guards"

const classroomName = "Physics 101"
const moduleName = "Forces & Motion"

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

export default function ModuleContentPage() {

    const params = useParams()
    const moduleId = params.id as string
    const supabase = createClient()
    const { user } = useAuth()

    const [module, setModule] = useState<Module>();

    const [active, setActive] = useState<"pdf" | "interactive" | "models" | "quiz">("pdf")
    const [pdf, setPdf] = useState<File | null>(null)
    const [model, setModel] = useState<File | null>(null)

    const [blocks, setBlocks] = useState<string[]>([])
    const [blockInput, setBlockInput] = useState("")

    const [questions, setQuestions] = useState<Question[]>([])
    const [q, setQ] = useState({ question: "", options: ["", "", "", ""], answer: "" })

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

        if (error) {
            console.error("Error fetching module:", error)
            return null
        }

        setModule(data);
    }

    useEffect(() => {
        if (!moduleId || !user) return
        fetchModule()
    }, [user])

    const handlePdfUpload = async () => {
        if (!pdf || !moduleId) return

        try {
            const fileExt = pdf.name.split(".").pop()
            const fileName = `docs/${moduleId}.${fileExt}`

            // 1. Upload to storage
            const { error: uploadError } = await supabase.storage
                .from("docs")
                .upload(fileName, pdf)

            if (uploadError) throw uploadError

            // 2. Get public URL
            const { data: urlData } = supabase.storage
                .from("docs")
                .getPublicUrl(fileName)

            const publicUrl = urlData.publicUrl

            // 3. Insert into docs table
            const { error: dbError } = await supabase.from("docs").insert({
                module_id: moduleId,
                name: pdf.name,
                url: publicUrl,
            })

            if (dbError) throw dbError

            console.log("PDF uploaded successfully")

            await fetch("/api/parse-pdf", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    moduleId,
                    filePath: fileName,
                }),
            })

        } catch (err) {
            console.error("Upload failed:", err)
        }
    }

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
                                    className={`p-3 rounded-lg cursor-pointer capitalize flex justify-between items-center ${active === item ? "bg-background shadow" : "hover:bg-background"
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

                        {/* Toolbar */}
                        <div className="flex justify-between items-center">
                            <h2 className="text-xl font-semibold capitalize">{active}</h2>
                            <div className="flex gap-2">
                                <Button variant="secondary">Save Draft</Button>
                                <Button>Add Section</Button>
                            </div>
                        </div>

                        {/* PDF */}
                        {active === "pdf" && (
                            <div className="grid grid-cols-2 gap-6">
                                <Card className="h-[500px] flex flex-col justify-center items-center border-dashed">
                                    <UploadCloud className="mb-4 text-muted-foreground" />
                                    <p className="text-muted-foreground mb-2">Upload PDF</p>
                                    <Input
                                        type="file"
                                        accept="application/pdf"
                                        className="max-w-xs"
                                        onChange={(e) => setPdf(e.target.files?.[0] || null)}
                                    />
                                    {pdf && <p className="mt-2 text-sm">{pdf.name}</p>}
                                    <Button className="mt-4" onClick={handlePdfUpload}>Upload</Button>
                                </Card>

                                <Card className="p-4 h-[500px] flex flex-col">
                                    <CardTitle>Preview</CardTitle>

                                    <div className="mt-4 flex-1 border rounded-md overflow-hidden">
                                        {pdf ? (
                                            // preview BEFORE upload (local file)
                                            <iframe
                                                src={URL.createObjectURL(pdf)}
                                                className="w-full h-full"
                                            />
                                        ) : (
                                            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
                                                No file uploaded
                                            </div>
                                        )}
                                    </div>
                                </Card>
                            </div>
                        )}

                        {active === "interactive" && (
                            <div className="grid grid-cols-2 gap-6">

                                {/* Input Panel */}
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

                                {/* Blocks List */}
                                <Card className="p-5 space-y-3">
                                    <CardHeader>
                                        <CardTitle>Learning Flow</CardTitle>
                                    </CardHeader>

                                    <CardContent className="space-y-3">
                                        {blocks.length === 0 && (
                                            <p className="text-sm text-muted-foreground">
                                                No blocks yet. Keep content short, visual, and step-by-step.
                                            </p>
                                        )}

                                        {blocks.map((b, i) => (
                                            <div
                                                key={i}
                                                className="p-3 border rounded-lg flex flex-col gap-2 bg-background"
                                            >
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

                        {/* Models */}
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
                                    <div className="mt-4 text-sm text-muted-foreground">
                                        3D viewer will render here
                                    </div>
                                </Card>
                            </div>
                        )}

                        {/* Quiz */}
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
                                                {ques.options.map((o, idx) => (
                                                    <li key={idx}>{o}</li>
                                                ))}
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