"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import {
  ArrowLeft, BookOpen, ChevronLeft, ChevronRight,
  Globe, Languages, LogOut, MessageSquare,
  Mic, MicOff, Moon, Sparkles, Sun, Video,
  FileText, Loader2,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"

import ContentTab from "@/components/module/ContentTab"
import InteractiveTab from "@/components/module/InteractiveTab"
import ThreeDModelTab from "@/components/module/ThreeDModelTab"
import QuizTab from "@/components/module/QuizTab"
import ProtectedRoute from "@/lib/route-guards"
import AccessibilityControls from "@/components/module/AccessibilityControls"
import { Button } from "@base-ui/react"
import { useTheme } from "next-themes"
import { GoogleTranslate } from "@/components/google-translate"

// ── Types ────────────────────────────────────────────────────────────────────
interface Doc {
  id: string
  module_id: string
  name: string
  url: string | null         // Supabase storage URL → rendered in <iframe>
  parsed_url: string | null  // extracted text URL or raw parsed string
  created_at: string
}

interface Module {
  id: string
  name: string
  description: string | null
  room_id: string
  created_at: string
}

interface Room {
  id: string
  name: string
  subject: string
}

const MAIN_TABS = [
  { id: "content", label: "Content" },
  { id: "interactive", label: "Interactive" },
  { id: "3dmodels", label: "3D Models" },
  { id: "quiz", label: "Quiz" },
]

// ── Page ─────────────────────────────────────────────────────────────────────
export default function ModuleDetailPage() {
  const params = useParams()
  const router = useRouter()
  const supabase = createClient()
  const moduleId = params?.moduleId as string

  const [module, setModule] = useState<Module | null>(null)
  const [room, setRoom] = useState<Room | null>(null)
  const [docs, setDocs] = useState<Doc[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [isDark, setIsDark] = useState(true)
  const [mainTab, setMainTab] = useState("content")
  const [emotionOn, setEmotionOn] = useState(true)
  const [signLangOn, setSignLangOn] = useState(true)
  const [isListening, setIsListening] = useState(false)
  const [command, setComamand] = useState<string>("")
  const recognitionRef = useRef<any>(null)
  const isSpaceHeld = useRef(false)
  const { theme, setTheme } = useTheme()

  useEffect(() => {
    if (typeof window === "undefined") return

    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition

    if (!SpeechRecognition) {
      console.error("Speech Recognition not supported")
      return
    }

    const recognition = new SpeechRecognition()
    recognition.continuous = true
    recognition.interimResults = false
    recognition.lang = "en-US"

    recognition.onresult = (event: any) => {
      const transcript =
        event.results[event.results.length - 1][0].transcript

      console.log("Heard:", transcript)
      setComamand(transcript)

      // 👉 later: handleCommand(transcript)
    }

    recognition.onerror = (err: any) => {
      console.error("Speech error:", err)
    }

    recognitionRef.current = recognition
  }, [])

  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      return (
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        (target as HTMLElement)?.isContentEditable
      )
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping(e.target)) {
        e.preventDefault()
        e.stopPropagation()

        if (!isSpaceHeld.current) {
          isSpaceHeld.current = true

          if (recognitionRef.current && !isListening) {
            recognitionRef.current.start()
            setIsListening(true)
          }
        }
      }
    }

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === "Space" && !isTyping(e.target)) {
        e.preventDefault()
        e.stopPropagation()

        isSpaceHeld.current = false

        if (recognitionRef.current && isListening) {
          recognitionRef.current.stop()
          setIsListening(false)
        }
      }
    }

    // 🔥 attach to DOCUMENT (not window)
    document.addEventListener("keydown", handleKeyDown, {
      capture: true,
      passive: false,
    })

    document.addEventListener("keyup", handleKeyUp, {
      capture: true,
      passive: false,
    })

    return () => {
      document.removeEventListener("keydown", handleKeyDown, true)
      document.removeEventListener("keyup", handleKeyUp, true)
    }
  }, [isListening])


  useEffect(() => { return () => { window.speechSynthesis?.cancel() } }, [])

  useEffect(() => {
    if (!moduleId) return
    fetchData()
  }, [moduleId])

  // ── Data fetching ────────────────────────────────────────────────────────
  const fetchData = async () => {
    setLoading(true)
    setError(null)

    // 1. Module
    const { data: moduleData, error: moduleErr } = await supabase
      .from("modules")
      .select("id, name, description, room_id, created_at")
      .eq("id", moduleId)
      .single()

    if (moduleErr || !moduleData) {
      setError("Module not found.")
      setLoading(false)
      return
    }
    setModule(moduleData)

    // 2. Room
    const { data: roomData } = await supabase
      .from("rooms")
      .select("id, name, subject")
      .eq("id", moduleData.room_id)
      .single()

    if (roomData) setRoom(roomData)

    // 3. Docs — table: "docs", FK: module_id
    const { data: docsData, error: docsErr } = await supabase
      .from("docs")
      .select("id, module_id, name, url, parsed_url, created_at")
      .eq("module_id", moduleId)
      .order("created_at", { ascending: true })

    if (docsErr) console.error("Docs fetch error:", docsErr)
    setDocs(docsData ?? [])
    setLoading(false)
  }

  // ── Transform docs → ContentTab format ──────────────────────────────────
  // parsed_url may be:
  //   (a) a URL  → fetch the text from it
  //   (b) raw text stored directly as a string
  // We handle both. Sentences are split client-side from the text.
  const contentTabDocs = docs.map(doc => ({
    id: doc.id,
    title: doc.name,
    file_url: doc.url,         // → iframe PDF viewer
    parsed_url: doc.parsed_url,  // → passed to ContentTab for text fetching
    sentences: [] as string[],  // ContentTab fetches/splits this itself
  }))

  const languages = [
    { label: "English", value: "en", src: "https://flagcdn.com/h60/us.png" },
    // Add additional languages as needed
  ];

  // ── Theme ────────────────────────────────────────────────────────────────

  const CustomToggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      role="switch" aria-checked={value} onClick={() => onChange(!value)}
      className={`relative w-11 h-6 rounded-full border-none cursor-pointer transition-colors flex-shrink-0 ${value ? "bg-primary" : "bg-muted"
        }`}
    >
      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-background transition-all block shadow-sm ${value ? "left-[22px]" : "left-0.5"
        }`} />
    </button>
  )

  const SidebarCard = ({
    iconEl, iconBg, title, desc, control, children,
  }: {
    iconEl: React.ReactNode; iconBg: string; title: string
    desc: string; control?: React.ReactNode; children?: React.ReactNode
  }) => (
    <div className="border border-border rounded-xl p-4 mb-4 bg-card">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ background: iconBg }}
          >
            {iconEl}
          </div>
          <div>
            <div className="text-sm font-semibold mb-1 text-card-foreground">{title}</div>
            <div className="text-xs text-muted-foreground leading-snug">{desc}</div>
          </div>
        </div>
        {control && <div className="mt-0.5">{control}</div>}
      </div>
      {children}
    </div>
  )

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
      <Loader2 size={32} className="text-muted-foreground animate-spin" />
      <p className="text-muted-foreground text-sm">Loading module...</p>
    </div>
  )

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !module) return (
    <div className="min-h-screen bg-background flex items-center justify-center flex-col gap-4">
      <FileText size={40} className="text-muted-foreground" />
      <p className="text-muted-foreground text-[15px]">{error ?? "Module not found"}</p>
      <button
        onClick={() => router.back()}
        className="bg-primary text-primary-foreground border-none rounded-lg px-5 py-2.5 text-sm cursor-pointer"
      >
        Go Back
      </button>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute allowedRole="student">
      <div className="min-h-screen bg-background text-foreground flex flex-col transition-all duration-300">

        {/* TOP NAV */}
        <div className="flex items-center justify-between px-6 py-3 border-b border-border bg-card sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="flex items-center gap-1.5 bg-transparent border-none text-muted-foreground cursor-pointer text-sm font-medium"
            >
              <ArrowLeft size={16} /> Back
            </button>
            <span className="text-border">|</span>
            <div className="flex items-center gap-2">
              <BookOpen size={18} className="text-foreground" />
              <span className="text-[15px] font-semibold">{room?.name ?? "Classroom"}</span>
            </div>
            {room?.subject && (
              <span className="text-xs text-muted-foreground bg-muted border border-border px-2.5 py-0.5 rounded-full">
                {room.subject}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
              className="mr-5 cursor-pointer"
            >
              {theme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </Button>
            <GoogleTranslate />
            {/* <button className="flex items-center gap-1.5 bg-transparent border-none text-muted-foreground text-sm cursor-pointer">
              <Globe size={15} /> English <ChevronRight size={13} />
            </button> */}
            <button className="bg-transparent border border-border rounded-lg p-2 cursor-pointer flex text-muted-foreground">
              <MessageSquare size={16} />
            </button>
            <button className="bg-transparent border border-border rounded-lg p-2 cursor-pointer flex text-muted-foreground">
              <Video size={16} />
            </button>
            <button className="flex items-center gap-1.5 bg-destructive/10 border border-border rounded-md px-4 py-[7px] text-destructive text-sm font-semibold cursor-pointer">
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>

        {/* MODULE TITLE */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-border bg-card">
          <div>
            <h2 className="text-[22px] font-bold m-0">{module.name}</h2>
            {module.description && (
              <p className="text-sm text-muted-foreground mt-1">{module.description}</p>
            )}
            <p className="text-[11px] text-muted-foreground mt-1">
              {docs.length} document{docs.length !== 1 ? "s" : ""} · uploaded {module.created_at.split("T")[0]}
            </p>
          </div>
          <div className="flex gap-2.5">
            <button className="flex items-center gap-1.5 bg-transparent border border-border rounded-md px-4 py-2 text-muted-foreground text-sm font-medium cursor-pointer">
              <ChevronLeft size={16} /> Previous
            </button>
            <button className="flex items-center gap-1.5 bg-transparent border border-border rounded-md px-4 py-2 text-muted-foreground text-sm font-medium cursor-pointer">
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div className="flex flex-1 overflow-hidden">

          {/* Content panel */}
          <div className="flex-1 overflow-y-auto bg-background flex flex-col">

            {/* Tab strip */}
            <div className="px-6 border-b border-border flex gap-8 bg-card">
              {MAIN_TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setMainTab(tab.id)}
                  className={`bg-transparent border-none py-4 text-sm cursor-pointer transition-all border-b-2 ${mainTab === tab.id
                    ? "font-semibold text-foreground border-foreground"
                    : "font-medium text-muted-foreground border-transparent"
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="p-8 flex-1">
              {mainTab === "content" && (
                docs.length === 0 ? (
                  <div className="text-center py-20 flex flex-col items-center gap-3">
                    <FileText size={48} className="text-muted-foreground" />
                    <p className="text-base font-semibold text-foreground">No documents yet</p>
                    <p className="text-sm text-muted-foreground max-w-xs">
                      Your teacher hasn't uploaded any documents to this module yet. Check back soon!
                    </p>
                  </div>
                ) : (
                  <ContentTab documents={contentTabDocs} command={command} />
                )
              )}
              {mainTab === "interactive" && (
                docs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <FileText size={48} color={theme.textMuted} />
                    <p style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>No document to chat with yet</p>
                    <p style={{ fontSize: 13, color: theme.textMuted, maxWidth: 320 }}>
                      Your teacher hasn't uploaded a PDF yet. Check back soon!
                    </p>
                  </div>
                ) : (
                  <InteractiveTab
                    theme={theme}
                    docId={docs[0].id}
                    docTitle={docs[0].name}
                  />
                )
              )}              {mainTab === "3dmodels" && <ThreeDModelTab theme={theme} />}
              {mainTab === "quiz" && <QuizTab theme={theme} moduleId={moduleId} />}
            </div>
          </div>

          {/* SIDEBAR */}
          <div className="w-[300px] flex-shrink-0 border-l border-border bg-card overflow-y-auto px-4 py-6">

            <SidebarCard
              iconEl={<Sparkles size={18} color="#eab308" />}
              iconBg="rgba(250,204,21,0.15)"
              title="Emotion Detection"
              desc="Adapts content based on your emotional state"
              control={<CustomToggle value={emotionOn} onChange={setEmotionOn} />}
            />

            <SidebarCard
              iconEl={
                isListening
                  ? <MicOff size={18} className="text-destructive" />
                  : <Mic size={18} className="text-muted-foreground" />
              }
              iconBg={isListening ? "rgba(239,68,68,0.1)" : "rgba(148,163,184,0.1)"}
              title="Voice Control"
              desc={isListening ? "Listening..." : "Hold SPACE to talk"}
              control={
                <div className="flex items-center gap-2">
                  <div className={`w-2.5 h-2.5 rounded-full transition-all ${isListening ? "bg-destructive" : "bg-border"}`} />
                  <span className="text-xs text-muted-foreground max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
                    {command || "Say a command..."}
                  </span>
                </div>
              }
            />

            <SidebarCard
              iconEl={<Languages size={18} color="#8b5cf6" />}
              iconBg="rgba(167,139,250,0.15)"
              title="Sign Language"
              desc="Converts audio to sign language"
              control={<CustomToggle value={signLangOn} onChange={setSignLangOn} />}
            />

            <SidebarCard
              iconEl={<MessageSquare size={18} color="#06b6d4" />}
              iconBg="rgba(6,182,212,0.15)"
              title="Telegram Bot"
              desc="Get updates and homework reminders"
            >
              <button className="mt-4 w-full py-2.5 rounded-lg bg-transparent border border-border text-foreground text-sm font-semibold cursor-pointer hover:bg-muted transition-colors">
                Connect to Telegram
              </button>
            </SidebarCard>

            <AccessibilityControls />
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
