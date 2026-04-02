"use client"

import { useRef, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import {
  ArrowLeft,
  BookOpen,
  Brain,
  Boxes,
  ChevronLeft,
  ChevronRight,
  FileText,
  Globe,
  Languages,
  MessageSquare,
  Mic,
  MicOff,
  Pause,
  Play,
  Settings2,
  Sparkles,
  Video,
  Volume2,
  VolumeX,
  Zap,
} from "lucide-react"

// ─── Static module data ───────────────────────────────────────────────
const MODULES_DATA: Record<string, {
  title: string
  documents: { id: string; title: string; sentences: string[] }[]
}> = {
  "1": {
    title: "Chapter 1: Introduction to Biology",
    documents: [
      {
        id: "d1", title: "What is Biology.pdf",
        sentences: [
          "Biology is the scientific study of life and living organisms.",
          "It encompasses a wide range of topics, from the molecular mechanisms of cells to the ecology of entire ecosystems.",
          "The word 'biology' comes from the Greek words 'bios' (life) and 'logos' (study).",
          "All living organisms share certain characteristics: they are made of cells, grow, reproduce, and respond to their environment.",
        ],
      },
    ],
  },
  "2": {
    title: "Chapter 2: Cell Theory",
    documents: [
      {
        id: "d2", title: "Cell Theory Overview.pdf",
        sentences: [
          "Cell theory is one of the foundational principles of modern biology.",
          "It states that all living things are composed of one or more cells.",
          "The cell is the basic unit of structure, function, and organisation in organisms.",
          "All cells arise from pre-existing cells through the process of cell division.",
        ],
      },
    ],
  },
  "3": {
    title: "Chapter 3: Cell Structure",
    documents: [
      {
        id: "d3", title: "Cell Structure Introduction.pdf",
        sentences: [
          "Mitochondria are membrane-bound cell organelles found in the cells of most eukaryotes, including animals, plants, and fungi.",
          "They generate most of the chemical energy needed to power the cell's biochemical reactions by producing adenosine triphosphate (ATP) through a process called oxidative phosphorylation.",
          "The nucleus is the control centre of the cell, containing the genetic material (DNA) that directs all cellular activities.",
          "The endoplasmic reticulum is a network of membranes involved in protein and lipid synthesis.",
        ],
      },
      {
        id: "d4", title: "Organelles Explained.pdf",
        sentences: [
          "Ribosomes are the molecular machines responsible for protein synthesis in all living cells.",
          "The cytoskeleton provides structural support and facilitates cell movement and division.",
          "Lysosomes contain digestive enzymes that break down waste materials and cellular debris.",
          "The cell membrane is a selectively permeable barrier that controls the entry and exit of substances.",
        ],
      },
    ],
  },
  "4": {
    title: "Chapter 4: DNA & Genetics",
    documents: [
      {
        id: "d5", title: "DNA Structure.pdf",
        sentences: [
          "DNA, or deoxyribonucleic acid, is the molecule that carries the genetic instructions for all known living organisms.",
          "It consists of two long polymer strands forming a double helix structure.",
          "The sequence of nucleotide bases — adenine, thymine, guanine, and cytosine — encodes genetic information.",
          "During replication, the double helix unwinds and each strand serves as a template for a new complementary strand.",
        ],
      },
    ],
  },
}

const VOICES = [
  "Microsoft David - English (United States) (en-US)",
  "Microsoft Zira - English (United States) (en-US)",
  "Google US English",
]

// ─── Toggle ───────────────────────────────────────────────────────────
function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      style={{
        position: "relative",
        width: 44,
        height: 24,
        borderRadius: 12,
        border: "none",
        background: value ? "#3b82f6" : "#374151",
        cursor: "pointer",
        transition: "background 0.2s",
        flexShrink: 0,
      }}
    >
      <span style={{
        position: "absolute",
        top: 2,
        left: value ? 22 : 2,
        width: 20,
        height: 20,
        borderRadius: "50%",
        background: "#fff",
        transition: "left 0.2s",
        display: "block",
      }} />
    </button>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────
export default function ModuleDetailPage() {
  const params   = useParams()
  const router   = useRouter()
  const moduleId = (params?.moduleId as string) ?? "3"
  const data     = MODULES_DATA[moduleId] ?? MODULES_DATA["3"]

  const [activeDocIdx, setActiveDocIdx] = useState(0)
  const activeDoc = data.documents[activeDocIdx]

  // TTS
  const [isPlaying, setIsPlaying] = useState(false)
  const [voice,     setVoice]     = useState(VOICES[0])
  const [speed,     setSpeed]     = useState(1)
  const [pitch,     setPitch]     = useState(1)
  const [volume,    setVolume]    = useState(1)
  const [sentIdx,   setSentIdx]   = useState(0)
  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)

  // Sidebar
  const [emotionOn,   setEmotionOn]   = useState(false)
  const [voiceNavOn,  setVoiceNavOn]  = useState(false)
  const [signLangOn,  setSignLangOn]  = useState(false)
  const [isListening, setIsListening] = useState(false)

  const sentences = activeDoc.sentences
  const wordCount = sentences.join(" ").split(/\s+/).length
  const charCount = sentences.join(" ").length

  const speakFrom = (idx: number) => {
    if (!sentences[idx]) return
    window.speechSynthesis?.cancel()
    const utter = new SpeechSynthesisUtterance(sentences[idx])
    utter.rate = speed; utter.pitch = pitch; utter.volume = volume
    const match = window.speechSynthesis?.getVoices().find(v => v.name === voice)
    if (match) utter.voice = match
    utter.onend = () => {
      if (idx < sentences.length - 1) { const n = idx + 1; setSentIdx(n); speakFrom(n) }
      else setIsPlaying(false)
    }
    utterRef.current = utter
    window.speechSynthesis?.speak(utter)
    setIsPlaying(true); setSentIdx(idx)
  }

  const togglePlay = () => {
    if (isPlaying) { window.speechSynthesis?.pause(); setIsPlaying(false) }
    else if (window.speechSynthesis?.paused) { window.speechSynthesis.resume(); setIsPlaying(true) }
    else speakFrom(sentIdx)
  }

  const switchDoc = (idx: number) => {
    window.speechSynthesis?.cancel()
    setIsPlaying(false); setSentIdx(0); setActiveDocIdx(idx)
  }

  return (
    <div style={{ minHeight: "100vh", background: "#111", color: "#fff", fontFamily: "inherit", display: "flex", flexDirection: "column" }}>

      {/* ── TOP NAV ─────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)",
        background: "#1a1a1a", position: "sticky", top: 0, zIndex: 30,
      }}>
        {/* Left: back + title */}
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <button
            onClick={() => router.push("/modules")}
            style={{ display: "flex", alignItems: "center", gap: 6, background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 13 }}
          >
            <ArrowLeft size={15} /> Back to Dashboard
          </button>
          <span style={{ color: "rgba(255,255,255,0.12)", fontSize: 18 }}>|</span>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <BookOpen size={16} color="#60a5fa" />
            <span style={{ fontSize: 14, fontWeight: 600 }}>{data.title}</span>
          </div>
        </div>

        {/* Right: controls */}
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <button style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: "5px 12px", color: "rgba(255,255,255,0.6)", fontSize: 12, cursor: "pointer" }}>
            <Globe size={13} /> English <ChevronRight size={11} />
          </button>
          <button style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: 7, cursor: "pointer", display: "flex" }}>
            <MessageSquare size={15} color="rgba(255,255,255,0.5)" />
          </button>
          <button style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, padding: 7, cursor: "pointer", display: "flex" }}>
            <Video size={15} color="rgba(255,255,255,0.5)" />
          </button>
          <button style={{ background: "rgba(220,38,38,0.15)", border: "1px solid rgba(220,38,38,0.3)", borderRadius: 8, padding: "5px 14px", color: "#f87171", fontSize: 12, cursor: "pointer" }}>
            Logout
          </button>
        </div>
      </div>

      {/* ── CHAPTER TITLE ROW + PREV/NEXT ──────────────────────────── */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "14px 20px", borderBottom: "1px solid rgba(255,255,255,0.06)",
      }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>{data.title}</h2>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => activeDocIdx > 0 && switchDoc(activeDocIdx - 1)}
            disabled={activeDocIdx === 0}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, padding: "6px 14px", color: "rgba(255,255,255,0.55)", fontSize: 13,
              cursor: activeDocIdx === 0 ? "not-allowed" : "pointer", opacity: activeDocIdx === 0 ? 0.35 : 1,
            }}
          >
            <ChevronLeft size={14} /> Previous
          </button>
          <button
            onClick={() => activeDocIdx < data.documents.length - 1 && switchDoc(activeDocIdx + 1)}
            disabled={activeDocIdx >= data.documents.length - 1}
            style={{
              display: "flex", alignItems: "center", gap: 4,
              background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: 8, padding: "6px 14px", color: "rgba(255,255,255,0.55)", fontSize: 13,
              cursor: activeDocIdx >= data.documents.length - 1 ? "not-allowed" : "pointer",
              opacity: activeDocIdx >= data.documents.length - 1 ? 0.35 : 1,
            }}
          >
            Next <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* ── MAIN AREA ───────────────────────────────────────────────── */}
      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* LEFT: tabs + content */}
        <div style={{ flex: 1, overflowY: "auto" }}>

          {/* 4 main tabs — white filled active pill */}
          <Tabs defaultValue="content">
            <div style={{ borderBottom: "1px solid rgba(255,255,255,0.06)", padding: "0 20px", background: "#1a1a1a" }}>
              <TabsList style={{ background: "transparent", padding: 0, height: 44, gap: 0, borderRadius: 0 }}>
                {[
                  { value: "content",     label: "Content"     },
                  { value: "interactive", label: "Interactive" },
                  { value: "3dmodels",    label: "3D Models"   },
                  { value: "quiz",        label: "Quiz"        },
                ].map(({ value, label }) => (
                  <TabsTrigger
                    key={value}
                    value={value}
                    style={{ borderRadius: 6, fontSize: 13, padding: "4px 16px", marginRight: 4 }}
                    className="
                      data-[state=active]:bg-white data-[state=active]:text-black data-[state=active]:font-semibold
                      data-[state=inactive]:text-white/40 data-[state=inactive]:bg-transparent
                      hover:text-white/70 transition-colors
                    "
                  >
                    {label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>

            {/* ── CONTENT TAB ─────────────────────────────────────── */}
            <TabsContent value="content" style={{ margin: 0, padding: "16px 20px" }}>

              {/* Doc selector pills */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}>
                {data.documents.map((doc, i) => (
                  <button
                    key={doc.id}
                    onClick={() => switchDoc(i)}
                    style={{
                      display: "flex", alignItems: "center", gap: 7,
                      padding: "6px 14px", borderRadius: 8, fontSize: 13, cursor: "pointer",
                      border: activeDocIdx === i ? "1px solid rgba(96,165,250,0.5)" : "1px solid rgba(255,255,255,0.1)",
                      background: activeDocIdx === i ? "rgba(59,130,246,0.2)" : "rgba(255,255,255,0.04)",
                      color: activeDocIdx === i ? "#93c5fd" : "rgba(255,255,255,0.45)",
                      transition: "all 0.15s",
                    }}
                  >
                    <FileText size={13} color="#f87171" />
                    {doc.title}
                  </button>
                ))}
              </div>

              {/* Doc meta bar */}
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: 10, padding: "10px 16px", marginBottom: 14,
              }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <FileText size={15} color="#f87171" />
                  <span style={{ fontSize: 14, fontWeight: 500 }}>{activeDoc.title}</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                  <span>{wordCount} words</span>
                  <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
                  <span>{charCount} characters</span>
                  <span style={{ color: "rgba(255,255,255,0.1)" }}>|</span>
                  <span>Method: demo</span>
                </div>
              </div>

              {/* Reader / Document sub-tabs */}
              <Tabs defaultValue="reader">
                {/* filled dark pill toggle — exactly like reference */}
                <TabsList style={{
                  display: "grid", gridTemplateColumns: "1fr 1fr",
                  background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)",
                  borderRadius: 10, padding: 4, marginBottom: 14, height: "auto",
                }}>
                  <TabsTrigger
                    value="reader"
                    style={{ borderRadius: 7, fontSize: 13, padding: "7px 0" }}
                    className="
                      data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white data-[state=active]:font-semibold
                      data-[state=inactive]:text-white/35 data-[state=inactive]:bg-transparent
                    "
                  >
                    Reader
                  </TabsTrigger>
                  <TabsTrigger
                    value="document"
                    style={{ borderRadius: 7, fontSize: 13, padding: "7px 0" }}
                    className="
                      data-[state=active]:bg-[#2a2a2a] data-[state=active]:text-white data-[state=active]:font-semibold
                      data-[state=inactive]:text-white/35 data-[state=inactive]:bg-transparent
                    "
                  >
                    Document
                  </TabsTrigger>
                </TabsList>

                {/* ── READER ────────────────────────────────────── */}
                <TabsContent value="reader" style={{ margin: 0 }}>

                  {/* TTS card */}
                  <div style={{
                    background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14, padding: 20, marginBottom: 14,
                  }}>
                    {/* Header row */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 20 }}>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 15 }}>Text-to-Speech Reader</div>
                        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 3 }}>Customize your reading experience</div>
                      </div>
                      <button
                        onClick={togglePlay}
                        style={{
                          display: "flex", alignItems: "center", gap: 7,
                          background: "#2563eb", border: "none", borderRadius: 8,
                          padding: "8px 16px", color: "#fff", fontSize: 13, fontWeight: 500, cursor: "pointer",
                        }}
                      >
                        {isPlaying ? <><Pause size={14} /> Pause</> : <><Play size={14} /> Read Aloud</>}
                      </button>
                    </div>

                    {/* Controls grid */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 24px" }}>

                      {/* Voice */}
                      <div>
                        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Voice Type</label>
                        <select
                          value={voice}
                          onChange={e => setVoice(e.target.value)}
                          style={{
                            width: "100%", background: "#2a2a2a", border: "1px solid rgba(255,255,255,0.1)",
                            borderRadius: 8, padding: "8px 10px", color: "#fff", fontSize: 12,
                          }}
                        >
                          {VOICES.map(v => <option key={v} value={v} style={{ background: "#1e1e1e" }}>{v}</option>)}
                        </select>
                      </div>

                      {/* Speed */}
                      <div>
                        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Reading Speed</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <VolumeX size={13} color="rgba(255,255,255,0.25)" />
                          <input type="range" min={0.5} max={2} step={0.1} value={speed}
                            onChange={e => setSpeed(Number(e.target.value))}
                            style={{ flex: 1, accentColor: "#3b82f6" }} />
                          <Volume2 size={13} color="rgba(255,255,255,0.25)" />
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>Current: {speed}x</div>
                      </div>

                      {/* Pitch */}
                      <div>
                        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Pitch</label>
                        <input type="range" min={0} max={2} step={0.1} value={pitch}
                          onChange={e => setPitch(Number(e.target.value))}
                          style={{ width: "100%", accentColor: "#3b82f6" }} />
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>Current: {pitch}</div>
                      </div>

                      {/* Volume */}
                      <div>
                        <label style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", display: "block", marginBottom: 6 }}>Volume</label>
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <VolumeX size={13} color="rgba(255,255,255,0.25)" />
                          <input type="range" min={0} max={1} step={0.05} value={volume}
                            onChange={e => setVolume(Number(e.target.value))}
                            style={{ flex: 1, accentColor: "#3b82f6" }} />
                          <Volume2 size={13} color="rgba(255,255,255,0.25)" />
                        </div>
                        <div style={{ fontSize: 11, color: "rgba(255,255,255,0.25)", marginTop: 4 }}>Current: {volume}</div>
                      </div>
                    </div>

                    {/* Sentence nav */}
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: 20, paddingTop: 16, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      <button
                        onClick={() => speakFrom(Math.max(0, sentIdx - 1))}
                        disabled={sentIdx === 0}
                        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: sentIdx === 0 ? "not-allowed" : "pointer", opacity: sentIdx === 0 ? 0.3 : 1 }}
                      >
                        <ChevronLeft size={14} /> Previous
                      </button>
                      <span style={{ fontSize: 12, color: "rgba(255,255,255,0.3)" }}>
                        Sentence {sentIdx + 1} of {sentences.length}
                      </span>
                      <button
                        onClick={() => speakFrom(Math.min(sentences.length - 1, sentIdx + 1))}
                        disabled={sentIdx >= sentences.length - 1}
                        style={{ display: "flex", alignItems: "center", gap: 4, background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 13, cursor: sentIdx >= sentences.length - 1 ? "not-allowed" : "pointer", opacity: sentIdx >= sentences.length - 1 ? 0.3 : 1 }}
                      >
                        Next <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Sentences display */}
                  <div style={{
                    background: "#1e1e1e", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 14, padding: 16,
                  }}>
                    {sentences.map((s, i) => (
                      <p
                        key={i}
                        onClick={() => speakFrom(i)}
                        style={{
                          cursor: "pointer", borderRadius: 8, padding: "10px 12px",
                          fontSize: 14, lineHeight: 1.7, margin: "4px 0", transition: "all 0.15s",
                          background: i === sentIdx ? "rgba(59,130,246,0.12)" : "transparent",
                          border: i === sentIdx ? "1px solid rgba(59,130,246,0.25)" : "1px solid transparent",
                          color: i === sentIdx ? "#fff" : "rgba(255,255,255,0.55)",
                        }}
                      >
                        {s}
                      </p>
                    ))}
                  </div>
                </TabsContent>

                {/* ── DOCUMENT (PDF) ─────────────────────────────── */}
                <TabsContent value="document" style={{ margin: 0 }}>
                  <div style={{
                    height: "60vh", borderRadius: 14, border: "1px solid rgba(255,255,255,0.07)",
                    background: "rgba(255,255,255,0.02)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 10,
                  }}>
                    <FileText size={36} color="rgba(255,255,255,0.15)" />
                    <p style={{ fontSize: 13, color: "rgba(255,255,255,0.3)" }}>PDF viewer will load here</p>
                    <p style={{ fontSize: 12, color: "rgba(255,255,255,0.2)" }}>Documents are uploaded by your teacher</p>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>

            {/* Other tabs */}
            {[
              { value: "interactive", icon: <Zap size={36} color="rgba(250,204,21,0.3)" />, label: "Interactive content coming soon" },
              { value: "3dmodels",    icon: <Boxes size={36} color="rgba(192,132,252,0.3)" />, label: "3D Models coming soon" },
              { value: "quiz",        icon: <Brain size={36} color="rgba(52,211,153,0.3)" />, label: "AI Quiz coming soon" },
            ].map(({ value, icon, label }) => (
              <TabsContent key={value} value={value} style={{ margin: 0, padding: "60px 20px" }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ marginBottom: 12 }}>{icon}</div>
                  <p style={{ fontSize: 14, color: "rgba(255,255,255,0.3)" }}>{label}</p>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </div>

        {/* ── RIGHT SIDEBAR ─────────────────────────────────────────── */}
        <div style={{
          width: 280, flexShrink: 0, borderLeft: "1px solid rgba(255,255,255,0.06)",
          background: "#161616", overflowY: "auto", padding: "12px 0",
        }}>

          {/* Emotion Detection */}
          <SidebarSection>
            <SidebarItem
              icon={<Sparkles size={18} color="#facc15" />}
              iconBg="rgba(250,204,21,0.1)"
              title="Emotion Detection"
              description="Adapts content based on your emotional state"
              control={<Toggle value={emotionOn} onChange={setEmotionOn} />}
            />
          </SidebarSection>

          <Divider />

          {/* Voice Navigation */}
          <SidebarSection>
            <SidebarItem
              icon={<Mic size={18} color="#60a5fa" />}
              iconBg="rgba(96,165,250,0.1)"
              title="Voice Navigation"
              description="Navigate using voice commands"
              control={<Toggle value={voiceNavOn} onChange={setVoiceNavOn} />}
            />
            {voiceNavOn && (
              <div style={{ marginTop: 12 }}>
                <button
                  onClick={() => setIsListening(p => !p)}
                  style={{
                    display: "flex", alignItems: "center", justifyContent: "center", gap: 7, width: "100%",
                    padding: "8px 0", borderRadius: 8, fontSize: 13, cursor: "pointer",
                    background: isListening ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.05)",
                    border: isListening ? "1px solid rgba(239,68,68,0.3)" : "1px solid rgba(255,255,255,0.1)",
                    color: isListening ? "#f87171" : "rgba(255,255,255,0.55)",
                  }}
                >
                  {isListening ? <><MicOff size={14} /> Stop Listening</> : <><Mic size={14} /> Start Listening</>}
                </button>
                <p style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", textAlign: "center", marginTop: 8 }}>
                  Try saying: "read aloud", "next page", "go to chapter 3"
                </p>
              </div>
            )}
          </SidebarSection>

          <Divider />

          {/* Sign Language */}
          <SidebarSection>
            <SidebarItem
              icon={<Languages size={18} color="#a78bfa" />}
              iconBg="rgba(167,139,250,0.1)"
              title="Sign Language Converter"
              description="Converts audio to sign language"
              control={<Toggle value={signLangOn} onChange={setSignLangOn} />}
            />
          </SidebarSection>

          <Divider />

          {/* Telegram Bot */}
          <SidebarSection>
            <SidebarItem
              icon={<MessageSquare size={18} color="#22d3ee" />}
              iconBg="rgba(34,211,238,0.1)"
              title="Telegram Bot"
              description="Get updates and homework reminders"
            />
            <div style={{
              display: "flex", alignItems: "center", gap: 10, marginTop: 12,
              background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
              borderRadius: 10, padding: "10px 12px",
            }}>
              <div style={{ width: 34, height: 34, borderRadius: "50%", background: "rgba(59,130,246,0.2)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <MessageSquare size={16} color="#60a5fa" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 500 }}>AdaptLearn Bot</div>
                <div style={{ fontSize: 11, color: "rgba(255,255,255,0.3)" }}>Connect to receive notifications</div>
              </div>
            </div>
            <button style={{
              marginTop: 10, width: "100%", padding: "9px 0", borderRadius: 8,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)",
              color: "rgba(255,255,255,0.55)", fontSize: 13, cursor: "pointer",
            }}>
              Connect to Telegram
            </button>
          </SidebarSection>

          <Divider />

          {/* Accessibility settings */}
          <SidebarSection>
            <button style={{
              display: "flex", alignItems: "center", gap: 8, width: "100%",
              background: "none", border: "none", color: "rgba(255,255,255,0.35)",
              fontSize: 13, cursor: "pointer", padding: "4px 0",
            }}>
              <Settings2 size={16} /> Accessibility Settings
            </button>
          </SidebarSection>
        </div>
      </div>
    </div>
  )
}

// ─── Sidebar helpers ──────────────────────────────────────────────────
function SidebarSection({ children }: { children: React.ReactNode }) {
  return <div style={{ padding: "12px 16px" }}>{children}</div>
}

function Divider() {
  return <div style={{ height: 1, background: "rgba(255,255,255,0.05)", margin: "0 16px" }} />
}

function SidebarItem({
  icon, iconBg, title, description, control,
}: {
  icon: React.ReactNode; iconBg: string; title: string; description: string; control?: React.ReactNode
}) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
      <div style={{ display: "flex", alignItems: "flex-start", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: iconBg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600 }}>{title}</div>
          <div style={{ fontSize: 12, color: "rgba(255,255,255,0.35)", marginTop: 3, lineHeight: 1.4 }}>{description}</div>
        </div>
      </div>
      {control && <div style={{ flexShrink: 0, marginTop: 2 }}>{control}</div>}
    </div>
  )
}
