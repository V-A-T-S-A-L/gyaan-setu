"use client"

import { useEffect, useRef, useState } from "react"
import {
  ChevronLeft, ChevronRight, FileText, Loader2,
  Play, Pause, StopCircle, Volume2,
} from "lucide-react"

// ── Types ────────────────────────────────────────────────────────────────────
interface Document {
  id: string
  title: string
  file_url: string | null
  parsed_url: string | null
  sentences: string[]
}

interface ContentTabProps {
  documents: Document[]
  theme: Record<string, string>
  isDark: boolean
}

type SubTab = "Reader" | "Document"

// ── Helpers ──────────────────────────────────────────────────────────────────
const splitSentences = (text: string): string[] =>
  text.split(/(?<=[.?!])\s+/).map(s => s.trim()).filter(Boolean)

const isUrl = (str: string) => {
  try { new URL(str); return true } catch { return false }
}

const wordCount = (sentences: string[]) =>
  sentences.join(" ").split(/\s+/).filter(Boolean).length

const charCount = (sentences: string[]) =>
  sentences.join(" ").length

// ── Component ─────────────────────────────────────────────────────────────────
export default function ContentTab({ documents, theme, isDark }: ContentTabProps) {

  const [activeDocId,  setActiveDocId]  = useState(documents[0]?.id ?? "")
  const [subTab,       setSubTab]       = useState<SubTab>("Reader")
  const [sentences,    setSentences]    = useState<string[]>([])
  const [textLoading,  setTextLoading]  = useState(false)

  // TTS controls
  const [isPlaying,    setIsPlaying]    = useState(false)
  const [sentIdx,      setSentIdx]      = useState(0)
  const [speed,        setSpeed]        = useState(1)
  const [pitch,        setPitch]        = useState(1)
  const [volume,       setVolume]       = useState(1)
  const [voices,       setVoices]       = useState<SpeechSynthesisVoice[]>([])
  const [selectedVoice, setSelectedVoice] = useState<string>("")

  const utterRef = useRef<SpeechSynthesisUtterance | null>(null)
  const activeDoc = documents.find(d => d.id === activeDocId) ?? documents[0]

  // ── Load voices ──────────────────────────────────────────────────────────
  useEffect(() => {
    const load = () => {
      const v = window.speechSynthesis.getVoices()
      if (v.length) {
        setVoices(v)
        setSelectedVoice(v[0]?.name ?? "")
      }
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
    return () => { window.speechSynthesis.cancel() }
  }, [])

  // ── When active doc changes: stop TTS, load text ─────────────────────────
  useEffect(() => {
    window.speechSynthesis?.cancel()
    setIsPlaying(false)
    setSentIdx(0)
    setSentences([])
    if (activeDoc) loadText(activeDoc)
  }, [activeDocId])

  const loadText = async (doc: Document) => {
    if (!doc.parsed_url) { setSentences([]); return }
    if (isUrl(doc.parsed_url)) {
      setTextLoading(true)
      try {
        const res  = await fetch(doc.parsed_url)
        const text = await res.text()
        setSentences(splitSentences(text))
      } catch { setSentences(["Could not load document text."]) }
      finally  { setTextLoading(false) }
    } else {
      setSentences(splitSentences(doc.parsed_url))
    }
  }

  // ── TTS ──────────────────────────────────────────────────────────────────
  const speakSentence = (idx: number) => {
    if (!sentences[idx]) return
    window.speechSynthesis.cancel()
    const utt    = new SpeechSynthesisUtterance(sentences[idx])
    utt.rate     = speed
    utt.pitch    = pitch
    utt.volume   = volume
    utt.lang     = "en-US"
    const voice  = voices.find(v => v.name === selectedVoice)
    if (voice) utt.voice = voice
    utt.onend = () => {
      if (idx + 1 < sentences.length) {
        setSentIdx(idx + 1)
        speakSentence(idx + 1)
      } else {
        setIsPlaying(false)
        setSentIdx(0)
      }
    }
    utterRef.current = utt
    window.speechSynthesis.speak(utt)
  }

  const handleReadAloud = () => {
    if (isPlaying) {
      window.speechSynthesis.pause()
      setIsPlaying(false)
    } else if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume()
      setIsPlaying(true)
    } else {
      setIsPlaying(true)
      speakSentence(sentIdx)
    }
  }

  const handleStop = () => {
    window.speechSynthesis.cancel()
    setIsPlaying(false)
    setSentIdx(0)
  }

  const handlePrev = () => {
    const prev = Math.max(0, sentIdx - 1)
    setSentIdx(prev)
    if (isPlaying) speakSentence(prev)
  }

  const handleNext = () => {
    const next = Math.min(sentences.length - 1, sentIdx + 1)
    setSentIdx(next)
    if (isPlaying) speakSentence(next)
  }

  // ── Shared slider style ───────────────────────────────────────────────────
  const sliderStyle: React.CSSProperties = {
    width: "100%", accentColor: theme.primary, cursor: "pointer", height: 4,
  }

  const labelStyle: React.CSSProperties = {
    fontSize: 12, color: theme.textMuted, marginBottom: 6, fontWeight: 500,
  }

  if (!activeDoc) return (
    <div style={{ textAlign: "center", padding: "60px 0", color: theme.textMuted }}>
      <FileText size={40} style={{ margin: "0 auto 12px" }} />
      <p>No documents available.</p>
    </div>
  )

  const words = wordCount(sentences)
  const chars = charCount(sentences)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>

      {/* Document picker (multi-doc) */}
      {documents.length > 1 && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 12, color: theme.textMuted, fontWeight: 500 }}>Document:</span>
          {documents.map(doc => (
            <button key={doc.id} onClick={() => setActiveDocId(doc.id)} style={{
              display: "flex", alignItems: "center", gap: 5, padding: "5px 12px",
              borderRadius: 20, fontSize: 12, fontWeight: 500, cursor: "pointer",
              background: activeDocId === doc.id ? theme.primaryMuted : "transparent",
              border: `1px solid ${activeDocId === doc.id ? theme.primary : theme.border}`,
              color: activeDocId === doc.id ? theme.primary : theme.textSec,
            }}>
              <FileText size={11} /> {doc.title}
            </button>
          ))}
        </div>
      )}

      {/* Doc title bar + metadata */}
      <div style={{
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", background: theme.cardBg,
        border: `1px solid ${theme.border}`, borderRadius: "8px 8px 0 0",
        borderBottom: "none",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <FileText size={15} color="#ef4444" />
          <span style={{ fontSize: 13, fontWeight: 600 }}>{activeDoc.title}</span>
        </div>
        {sentences.length > 0 && (
          <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 11, color: theme.textMuted }}>
            <span>{words} words</span>
            <span style={{ color: theme.border }}>|</span>
            <span>{chars} characters</span>
            <span style={{ color: theme.border }}>|</span>
            <span style={{ background: theme.primaryMuted, color: theme.primary, padding: "2px 8px", borderRadius: 4, fontWeight: 600 }}>
              Method: parsed
            </span>
          </div>
        )}
      </div>

      {/* Sub-tab strip */}
      <div style={{ display: "flex", border: `1px solid ${theme.border}`, borderBottom: "none" }}>
        {(["Reader", "Document"] as SubTab[]).map(tab => (
          <button key={tab} onClick={() => setSubTab(tab)} style={{
            flex: 1, background: subTab === tab ? theme.cardBg : (isDark ? "#0f0f0f" : "#f0f0f0"),
            border: "none", padding: "10px 0", fontSize: 13,
            fontWeight: subTab === tab ? 600 : 400,
            color: subTab === tab ? theme.text : theme.textMuted,
            cursor: "pointer",
            borderBottom: subTab === tab ? `2px solid ${theme.primary}` : `2px solid transparent`,
            transition: "all 0.2s",
          }}>
            {tab}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div style={{ border: `1px solid ${theme.border}`, borderRadius: "0 0 8px 8px", background: theme.cardBg, padding: 20 }}>

        {/* ── READER TAB ──────────────────────────────────────────────── */}
        {subTab === "Reader" && (
          <div>
            {/* Heading */}
            <div style={{ marginBottom: 20 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 4px 0" }}>Text-to-Speech Reader</h3>
              <p style={{ fontSize: 13, color: theme.textMuted, margin: 0 }}>Customize your reading experience</p>
            </div>

            {/* Controls grid */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>

              {/* Voice Type */}
              <div>
                <div style={labelStyle}>Voice Type</div>
                <select
                  value={selectedVoice}
                  onChange={e => setSelectedVoice(e.target.value)}
                  style={{
                    width: "100%", padding: "8px 10px", borderRadius: 6, fontSize: 12,
                    background: theme.inputBg, border: `1px solid ${theme.border}`,
                    color: theme.text, cursor: "pointer",
                  }}
                >
                  {voices.length === 0 && (
                    <option value="">Loading voices...</option>
                  )}
                  {voices.map(v => (
                    <option key={v.name} value={v.name}>
                      {v.name} ({v.lang})
                    </option>
                  ))}
                </select>
              </div>

              {/* Reading Speed */}
              <div>
                <div style={labelStyle}>Reading Speed</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: theme.textMuted }}>🐢</span>
                  <input
                    type="range" min={0.5} max={2} step={0.25}
                    value={speed} onChange={e => setSpeed(Number(e.target.value))}
                    style={sliderStyle}
                  />
                  <span style={{ fontSize: 11, color: theme.textMuted }}>🐇</span>
                </div>
                <p style={{ fontSize: 11, color: theme.textMuted, margin: "4px 0 0" }}>Current: {speed}x</p>
              </div>

              {/* Pitch */}
              <div>
                <div style={labelStyle}>Pitch</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ fontSize: 11, color: theme.textMuted }}>↓</span>
                  <input
                    type="range" min={0} max={2} step={0.1}
                    value={pitch} onChange={e => setPitch(Number(e.target.value))}
                    style={sliderStyle}
                  />
                  <span style={{ fontSize: 11, color: theme.textMuted }}>↑</span>
                </div>
                <p style={{ fontSize: 11, color: theme.textMuted, margin: "4px 0 0" }}>Current: {pitch}</p>
              </div>

              {/* Volume */}
              <div>
                <div style={labelStyle}>Volume</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <Volume2 size={13} color={theme.textMuted} />
                  <input
                    type="range" min={0} max={1} step={0.1}
                    value={volume} onChange={e => setVolume(Number(e.target.value))}
                    style={sliderStyle}
                  />
                  <Volume2 size={16} color={theme.textMuted} />
                </div>
                <p style={{ fontSize: 11, color: theme.textMuted, margin: "4px 0 0" }}>Current: {volume}</p>
              </div>
            </div>

            {/* Read Aloud button */}
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16, gap: 8 }}>
              {(isPlaying || sentIdx > 0) && (
                <button onClick={handleStop} style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 16px",
                  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: "pointer",
                  background: "transparent", border: `1px solid ${theme.border}`, color: theme.textSec,
                }}>
                  <StopCircle size={15} /> Stop
                </button>
              )}
              <button
                onClick={handleReadAloud}
                disabled={textLoading || sentences.length === 0}
                style={{
                  display: "flex", alignItems: "center", gap: 6, padding: "8px 20px",
                  borderRadius: 6, fontSize: 13, fontWeight: 600, cursor: sentences.length ? "pointer" : "not-allowed",
                  background: "transparent", border: `1px solid ${theme.border}`,
                  color: theme.text, opacity: sentences.length ? 1 : 0.5,
                }}
              >
                {isPlaying ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Read Aloud</>}
              </button>
            </div>

            {/* Sentence navigator */}
            {sentences.length > 0 && (
              <div style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "8px 0", marginBottom: 12,
                borderTop: `1px solid ${theme.border}`, borderBottom: `1px solid ${theme.border}`,
              }}>
                <button onClick={handlePrev} disabled={sentIdx === 0} style={{
                  display: "flex", alignItems: "center", gap: 4, background: "transparent",
                  border: "none", color: sentIdx === 0 ? theme.textMuted : theme.textSec,
                  fontSize: 13, fontWeight: 500, cursor: sentIdx === 0 ? "not-allowed" : "pointer",
                }}>
                  <ChevronLeft size={16} /> Previous
                </button>
                <span style={{ fontSize: 12, color: theme.textMuted }}>
                  Sentence {sentIdx + 1} of {sentences.length}
                </span>
                <button onClick={handleNext} disabled={sentIdx === sentences.length - 1} style={{
                  display: "flex", alignItems: "center", gap: 4, background: "transparent",
                  border: "none", color: sentIdx === sentences.length - 1 ? theme.textMuted : theme.textSec,
                  fontSize: 13, fontWeight: 500, cursor: sentIdx === sentences.length - 1 ? "not-allowed" : "pointer",
                }}>
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Loading */}
            {textLoading && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10, padding: "40px 0", color: theme.textMuted }}>
                <Loader2 size={20} style={{ animation: "spin 1s linear infinite" }} />
                <span style={{ fontSize: 13 }}>Loading document text...</span>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}

            {/* No text */}
            {!textLoading && sentences.length === 0 && (
              <div style={{ textAlign: "center", padding: "40px 0", color: theme.textMuted, border: `1px dashed ${theme.border}`, borderRadius: 8 }}>
                <FileText size={32} style={{ margin: "0 auto 8px" }} />
                <p style={{ fontSize: 13 }}>No extracted text available for this document.</p>
                <p style={{ fontSize: 11, marginTop: 4 }}>Switch to the "Document" tab to view the PDF directly.</p>
              </div>
            )}

            {/* Sentences */}
            {!textLoading && sentences.length > 0 && (
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {sentences.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => { setSentIdx(i); if (isPlaying) speakSentence(i) }}
                    style={{
                      padding: "14px 16px", borderRadius: 8, cursor: "pointer",
                      transition: "all 0.2s",
                      background: i === sentIdx
                        ? (isDark ? "rgba(59,130,246,0.12)" : "rgba(37,99,235,0.08)")
                        : "transparent",
                      border: `1px solid ${i === sentIdx ? theme.primary : theme.border}`,
                    }}
                  >
                    <p style={{
                      margin: 0, fontSize: 14, lineHeight: 1.75,
                      color: i === sentIdx ? theme.text : theme.textSec,
                      fontWeight: i === sentIdx ? 500 : 400,
                    }}>
                      {s}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── DOCUMENT TAB: PDF iframe ─────────────────────────────────── */}
        {subTab === "Document" && (
          activeDoc.file_url ? (
            <div style={{ borderRadius: 8, overflow: "hidden", border: `1px solid ${theme.border}` }}>
              <iframe
                src={`${activeDoc.file_url}#toolbar=1&navpanes=0`}
                style={{ width: "100%", height: "72vh", border: "none", background: "#fff" }}
                title={activeDoc.title}
              />
            </div>
          ) : (
            <div style={{ textAlign: "center", padding: "60px 0", color: theme.textMuted, border: `1px dashed ${theme.border}`, borderRadius: 8 }}>
              <FileText size={40} style={{ margin: "0 auto 12px" }} />
              <p style={{ fontSize: 14 }}>No PDF available for this document.</p>
              <p style={{ fontSize: 12, marginTop: 6 }}>Switch to "Reader" to read the extracted text.</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}
