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

  // ── Theme ────────────────────────────────────────────────────────────────
  const theme = isDark ? {
    appBg: "#0a0a0a", headerBg: "#0f0f0f", contentBg: "#121212",
    cardBg: "#18181b", border: "rgba(255,255,255,0.08)",
    text: "#ffffff", textSec: "rgba(255,255,255,0.7)",
    textMuted: "rgba(255,255,255,0.4)",
    primary: "#3b82f6", primaryMuted: "rgba(59,130,246,0.15)",
    danger: "#ef4444", dangerMuted: "rgba(239,68,68,0.1)",
    inputBg: "#1f1f22",
  } : {
    appBg: "#f4f4f5", headerBg: "#ffffff", contentBg: "#ffffff",
    cardBg: "#fafafa", border: "rgba(0,0,0,0.1)",
    text: "#09090b", textSec: "rgba(0,0,0,0.6)",
    textMuted: "rgba(0,0,0,0.4)",
    primary: "#2563eb", primaryMuted: "rgba(37,99,235,0.1)",
    danger: "#dc2626", dangerMuted: "rgba(220,38,38,0.1)",
    inputBg: "#ffffff",
  }

  const CustomToggle = ({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) => (
    <button
      role="switch" aria-checked={value} onClick={() => onChange(!value)}
      style={{
        position: "relative", width: 44, height: 24, borderRadius: 12, border: "none",
        background: value ? theme.primary : (isDark ? "#3f3f46" : "#e4e4e7"),
        cursor: "pointer", transition: "background 0.2s", flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute", top: 2, left: value ? 22 : 2, width: 20, height: 20,
        borderRadius: "50%", background: "#fff", transition: "left 0.2s", display: "block",
        boxShadow: "0 2px 4px rgba(0,0,0,0.2)",
      }} />
    </button>
  )

  const SidebarCard = ({
    iconEl, iconBg, title, desc, control, children,
  }: {
    iconEl: React.ReactNode; iconBg: string; title: string
    desc: string; control?: React.ReactNode; children?: React.ReactNode
  }) => (
    <div style={{ border: `1px solid ${theme.border}`, borderRadius: 12, padding: 16, marginBottom: 16, background: theme.cardBg }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
        <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            {iconEl}
          </div>
          <div>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 4 }}>{title}</div>
            <div style={{ fontSize: 12, color: theme.textMuted, lineHeight: 1.4 }}>{desc}</div>
          </div>
        </div>
        {control && <div style={{ marginTop: 2 }}>{control}</div>}
      </div>
      {children}
    </div>
  )

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) return (
    <div style={{ minHeight: "100vh", background: theme.appBg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <Loader2 size={32} color={theme.textMuted} style={{ animation: "spin 1s linear infinite" }} />
      <p style={{ color: theme.textMuted, fontSize: 14 }}>Loading module...</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  // ── Error ────────────────────────────────────────────────────────────────
  if (error || !module) return (
    <div style={{ minHeight: "100vh", background: theme.appBg, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 16 }}>
      <FileText size={40} color={theme.textMuted} />
      <p style={{ color: theme.textMuted, fontSize: 15 }}>{error ?? "Module not found"}</p>
      <button onClick={() => router.back()} style={{ background: theme.primary, border: "none", borderRadius: 8, padding: "10px 20px", color: "#fff", fontSize: 13, cursor: "pointer" }}>
        Go Back
      </button>
    </div>
  )

  // ── Render ───────────────────────────────────────────────────────────────
  return (
    <ProtectedRoute allowedRole="student">
      <div style={{ minHeight: "100vh", background: theme.appBg, color: theme.text, display: "flex", flexDirection: "column", transition: "all 0.3s ease" }}>

        {/* TOP NAV */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 24px", borderBottom: `1px solid ${theme.border}`,
          background: theme.headerBg, position: "sticky", top: 0, zIndex: 30,
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <button onClick={() => router.back()}
              style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: theme.textSec, cursor: "pointer", fontSize: 13, fontWeight: 500 }}>
              <ArrowLeft size={16} /> Back
            </button>
            <span style={{ color: theme.border }}>|</span>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <BookOpen size={18} color={theme.text} />
              <span style={{ fontSize: 15, fontWeight: 600 }}>{room?.name ?? "Classroom"}</span>
            </div>
            {room?.subject && (
              <span style={{ fontSize: 12, color: theme.textMuted, background: theme.cardBg, border: `1px solid ${theme.border}`, padding: "2px 10px", borderRadius: 20 }}>
                {room.subject}
              </span>
            )}
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={() => setIsDark(!isDark)}
              style={{ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 8, padding: 8, cursor: "pointer", display: "flex", color: theme.textSec }}>
              {isDark ? <Sun size={16} /> : <Moon size={16} />}
            </button>
            <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: "none", color: theme.textSec, fontSize: 13, cursor: "pointer" }}>
              <Globe size={15} /> English <ChevronRight size={13} />
            </button>
            <button style={{ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 8, padding: 8, cursor: "pointer", display: "flex", color: theme.textSec }}>
              <MessageSquare size={16} />
            </button>
            <button style={{ background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 8, padding: 8, cursor: "pointer", display: "flex", color: theme.textSec }}>
              <Video size={16} />
            </button>
            <button style={{ display: "flex", alignItems: "center", gap: 6, background: theme.dangerMuted, border: `1px solid ${theme.border}`, borderRadius: 6, padding: "7px 16px", color: theme.danger, fontSize: 13, fontWeight: 600, cursor: "pointer" }}>
              <LogOut size={15} /> Logout
            </button>
          </div>
        </div>

        {/* MODULE TITLE */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 24px", borderBottom: `1px solid ${theme.border}`,
          background: theme.headerBg,
        }}>
          <div>
            <h2 style={{ fontSize: 22, fontWeight: 700, margin: 0 }}>{module.name}</h2>
            {module.description && (
              <p style={{ fontSize: 13, color: theme.textMuted, marginTop: 4 }}>{module.description}</p>
            )}
            <p style={{ fontSize: 11, color: theme.textMuted, marginTop: 4 }}>
              {docs.length} document{docs.length !== 1 ? "s" : ""} · uploaded {module.created_at.split("T")[0]}
            </p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 6, padding: "8px 16px", color: theme.textSec, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              <ChevronLeft size={16} /> Previous
            </button>
            <button style={{ display: "flex", alignItems: "center", gap: 6, background: "transparent", border: `1px solid ${theme.border}`, borderRadius: 6, padding: "8px 16px", color: theme.textSec, fontSize: 13, fontWeight: 500, cursor: "pointer" }}>
              Next <ChevronRight size={16} />
            </button>
          </div>
        </div>

        {/* BODY */}
        <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

          {/* Content panel */}
          <div style={{ flex: 1, overflowY: "auto", background: theme.contentBg, display: "flex", flexDirection: "column" }}>

            {/* Tab strip */}
            <div style={{ padding: "0 24px", borderBottom: `1px solid ${theme.border}`, display: "flex", gap: 32, background: theme.headerBg }}>
              {MAIN_TABS.map(tab => (
                <button key={tab.id} onClick={() => setMainTab(tab.id)} style={{
                  background: "none", border: "none", padding: "16px 0", fontSize: 14,
                  fontWeight: mainTab === tab.id ? 600 : 500,
                  color: mainTab === tab.id ? theme.text : theme.textMuted,
                  cursor: "pointer",
                  borderBottom: mainTab === tab.id ? `2px solid ${theme.text}` : "2px solid transparent",
                  transition: "all 0.2s",
                }}>
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ padding: "32px 24px", flex: 1 }}>
              {mainTab === "content" && (
                docs.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
                    <FileText size={48} color={theme.textMuted} />
                    <p style={{ fontSize: 16, fontWeight: 600, color: theme.text }}>No documents yet</p>
                    <p style={{ fontSize: 13, color: theme.textMuted, maxWidth: 320 }}>
                      Your teacher hasn't uploaded any documents to this module yet. Check back soon!
                    </p>
                  </div>
                ) : (
                  <ContentTab documents={contentTabDocs} theme={theme} isDark={isDark} command={command} />
                )
              )}
              {mainTab === "interactive" && <InteractiveTab theme={theme} />}
              {mainTab === "3dmodels" && <ThreeDModelTab theme={theme} />}
              {mainTab === "quiz" && <QuizTab theme={theme} moduleId={moduleId} />}
            </div>
          </div>

          {/* SIDEBAR */}
          <div style={{ width: 300, flexShrink: 0, borderLeft: `1px solid ${theme.border}`, background: theme.headerBg, overflowY: "auto", padding: "24px 16px" }}>

            <SidebarCard
              iconEl={<Sparkles size={18} color="#eab308" />}
              iconBg={isDark ? "rgba(250,204,21,0.1)" : "#fef08a"}
              title="Emotion Detection"
              desc="Adapts content based on your emotional state"
              control={<CustomToggle value={emotionOn} onChange={setEmotionOn} />}
            />

            <SidebarCard
              iconEl={
                isListening ? <MicOff size={18} color="#ef4444" /> : <Mic size={18} />
              }
              iconBg={
                isListening
                  ? isDark
                    ? "rgba(239,68,68,0.1)"
                    : "#fee2e2"
                  : isDark
                    ? "rgba(148,163,184,0.1)"
                    : "#f1f5f9"
              }
              title="Voice Control"
              desc={isListening ? "Listening..." : "Hold SPACE to talk"}
              control={
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {/* Mic Indicator */}
                  <div
                    style={{
                      width: 10,
                      height: 10,
                      borderRadius: "50%",
                      background: isListening ? "#ef4444" : theme.border,
                      transition: "all 0.2s",
                    }}
                  />

                  {/* Command (inline, truncated) */}
                  <span
                    style={{
                      fontSize: 12,
                      color: theme.textMuted,
                      maxWidth: 120,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {command || "Say a command..."}
                  </span>
                </div>
              }
            />

            <SidebarCard
              iconEl={<Languages size={18} color="#8b5cf6" />}
              iconBg={isDark ? "rgba(167,139,250,0.1)" : "#ddd6fe"}
              title="Sign Language"
              desc="Converts audio to sign language"
              control={<CustomToggle value={signLangOn} onChange={setSignLangOn} />}
            />

            <SidebarCard
              iconEl={<MessageSquare size={18} color="#06b6d4" />}
              iconBg={isDark ? "rgba(34,211,238,0.1)" : "#a5f3fc"}
              title="Telegram Bot"
              desc="Get updates and homework reminders"
            >
              <button style={{
                marginTop: 16, width: "100%", padding: "10px 0", borderRadius: 8,
                background: "transparent", border: `1px solid ${theme.border}`,
                color: theme.text, fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}
                onMouseOver={e => (e.currentTarget.style.background = isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)")}
                onMouseOut={e => (e.currentTarget.style.background = "transparent")}
              >
                Connect to Telegram
              </button>
            </SidebarCard>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}
