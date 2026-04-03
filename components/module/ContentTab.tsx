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
  command: string
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
export default function ContentTab({ documents, command }: ContentTabProps) {

  const [activeDocId, setActiveDocId] = useState(documents[0]?.id ?? "")
  const [subTab, setSubTab] = useState<SubTab>("Reader")
  const [sentences, setSentences] = useState<string[]>([])
  const [textLoading, setTextLoading] = useState(false)

  // TTS controls
  const [isPlaying, setIsPlaying] = useState(false)
  const [sentIdx, setSentIdx] = useState(0)
  const [speed, setSpeed] = useState(1)
  const [pitch, setPitch] = useState(1)
  const [volume, setVolume] = useState(1)
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
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
    setTextLoading(true)
    try {
      const res = await fetch(`${doc.parsed_url}?t=${Date.now()}`, { cache: "no-store" })
      if (!res.ok) throw new Error("Failed to fetch parsed JSON")
      const json = await res.json()
      const extracted: string[] =
        json?.sentences?.map((s: any) => s.text).filter(Boolean) || []
      setSentences(extracted)
    } catch (err) {
      console.error(err)
      setSentences(["Could not load document text."])
    } finally {
      setTextLoading(false)
    }
  }

  // ── TTS ──────────────────────────────────────────────────────────────────
  const speakSentence = (idx: number) => {
    if (!sentences[idx]) return
    window.speechSynthesis.cancel()
    const utt = new SpeechSynthesisUtterance(sentences[idx])
    utt.rate = speed
    utt.pitch = pitch
    utt.volume = volume
    utt.lang = "en-US"
    const voice = voices.find(v => v.name === selectedVoice)
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

  useEffect(() => {
    if (!command) return
    const text = command.toLowerCase()
    if (text.includes("read")) handleReadAloud()
    if (text.includes("stop")) handleStop()
    if (text.includes("pause")) handleReadAloud()
    if (text.includes("next")) handleNext()
    if (text.includes("previous")) handlePrev()
  }, [command])

  if (!activeDoc) return (
    <div className="text-center py-16 text-muted-foreground">
      <FileText size={40} className="mx-auto mb-3" />
      <p>No documents available.</p>
    </div>
  )

  const words = wordCount(sentences)
  const chars = charCount(sentences)

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col">

      {/* Document picker (multi-doc) */}
      {documents.length > 1 && (
        <div className="flex items-center gap-2 mb-4 flex-wrap">
          <span className="text-xs text-muted-foreground font-medium">Document:</span>
          {documents.map(doc => (
            <button
              key={doc.id}
              onClick={() => setActiveDocId(doc.id)}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium cursor-pointer border transition-colors ${
                activeDocId === doc.id
                  ? "bg-primary/10 border-primary text-primary"
                  : "bg-transparent border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              <FileText size={11} /> {doc.title}
            </button>
          ))}
        </div>
      )}

      {/* Doc title bar + metadata */}
      <div className="flex items-center justify-between px-3.5 py-2.5 bg-card border border-border rounded-t-lg border-b-0">
        <div className="flex items-center gap-2">
          <FileText size={15} className="text-destructive" />
          <span className="text-sm font-semibold text-foreground">{activeDoc.title}</span>
        </div>
        {sentences.length > 0 && (
          <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
            <span>{words} words</span>
            <span className="text-border">|</span>
            <span>{chars} characters</span>
            <span className="text-border">|</span>
            <span className="bg-primary/10 text-primary px-2 py-0.5 rounded font-semibold">
              Method: parsed
            </span>
          </div>
        )}
      </div>

      {/* Sub-tab strip */}
      <div className="flex border border-border border-b-0">
        {(["Reader", "Document"] as SubTab[]).map(tab => (
          <button
            key={tab}
            onClick={() => setSubTab(tab)}
            className={`flex-1 border-none py-2.5 text-sm cursor-pointer transition-all border-b-2 ${
              subTab === tab
                ? "bg-card font-semibold text-foreground border-primary"
                : "bg-muted font-normal text-muted-foreground border-transparent hover:text-foreground"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Content area */}
      <div className="border border-border rounded-b-lg bg-card p-5">

        {/* ── READER TAB ──────────────────────────────────────────────── */}
        {subTab === "Reader" && (
          <div>
            {/* Heading */}
            <div className="mb-5">
              <h3 className="text-lg font-bold m-0 mb-1">Text-to-Speech Reader</h3>
              <p className="text-sm text-muted-foreground m-0">Customize your reading experience</p>
            </div>

            {/* Controls grid */}
            <div className="grid grid-cols-2 gap-5 mb-5">

              {/* Voice Type */}
              <div>
                <div className="text-xs text-muted-foreground mb-1.5 font-medium">Voice Type</div>
                <select
                  value={selectedVoice}
                  onChange={e => setSelectedVoice(e.target.value)}
                  className="w-full px-2.5 py-2 rounded-md text-xs bg-background border border-border text-foreground cursor-pointer"
                >
                  {voices.length === 0 && <option value="">Loading voices...</option>}
                  {voices.map(v => (
                    <option key={v.name} value={v.name}>{v.name} ({v.lang})</option>
                  ))}
                </select>
              </div>

              {/* Reading Speed */}
              <div>
                <div className="text-xs text-muted-foreground mb-1.5 font-medium">Reading Speed</div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">🐢</span>
                  <input
                    type="range" min={0.5} max={2} step={0.25}
                    value={speed} onChange={e => setSpeed(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer h-1"
                  />
                  <span className="text-[11px] text-muted-foreground">🐇</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 mb-0">Current: {speed}x</p>
              </div>

              {/* Pitch */}
              <div>
                <div className="text-xs text-muted-foreground mb-1.5 font-medium">Pitch</div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-muted-foreground">↓</span>
                  <input
                    type="range" min={0} max={2} step={0.1}
                    value={pitch} onChange={e => setPitch(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer h-1"
                  />
                  <span className="text-[11px] text-muted-foreground">↑</span>
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 mb-0">Current: {pitch}</p>
              </div>

              {/* Volume */}
              <div>
                <div className="text-xs text-muted-foreground mb-1.5 font-medium">Volume</div>
                <div className="flex items-center gap-2">
                  <Volume2 size={13} className="text-muted-foreground" />
                  <input
                    type="range" min={0} max={1} step={0.1}
                    value={volume} onChange={e => setVolume(Number(e.target.value))}
                    className="w-full accent-primary cursor-pointer h-1"
                  />
                  <Volume2 size={16} className="text-muted-foreground" />
                </div>
                <p className="text-[11px] text-muted-foreground mt-1 mb-0">Current: {volume}</p>
              </div>
            </div>

            {/* Read Aloud button */}
            <div className="flex justify-end mb-4 gap-2">
              {(isPlaying || sentIdx > 0) && (
                <button
                  onClick={handleStop}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-md text-sm font-semibold cursor-pointer bg-transparent border border-border text-muted-foreground hover:text-foreground transition-colors"
                >
                  <StopCircle size={15} /> Stop
                </button>
              )}
              <button
                onClick={handleReadAloud}
                disabled={textLoading || sentences.length === 0}
                className={`flex items-center gap-1.5 px-5 py-2 rounded-md text-sm font-semibold border border-border bg-transparent text-foreground transition-colors ${
                  sentences.length ? "cursor-pointer hover:bg-muted" : "cursor-not-allowed opacity-50"
                }`}
              >
                {isPlaying ? <><Pause size={15} /> Pause</> : <><Play size={15} /> Read Aloud</>}
              </button>
            </div>

            {/* Sentence navigator */}
            {sentences.length > 0 && (
              <div className="flex items-center justify-between py-2 mb-3 border-t border-b border-border">
                <button
                  onClick={handlePrev}
                  disabled={sentIdx === 0}
                  className={`flex items-center gap-1 bg-transparent border-none text-sm font-medium transition-colors ${
                    sentIdx === 0 ? "text-muted-foreground cursor-not-allowed" : "text-foreground cursor-pointer"
                  }`}
                >
                  <ChevronLeft size={16} /> Previous
                </button>
                <span className="text-xs text-muted-foreground">
                  Sentence {sentIdx + 1} of {sentences.length}
                </span>
                <button
                  onClick={handleNext}
                  disabled={sentIdx === sentences.length - 1}
                  className={`flex items-center gap-1 bg-transparent border-none text-sm font-medium transition-colors ${
                    sentIdx === sentences.length - 1 ? "text-muted-foreground cursor-not-allowed" : "text-foreground cursor-pointer"
                  }`}
                >
                  Next <ChevronRight size={16} />
                </button>
              </div>
            )}

            {/* Loading */}
            {textLoading && (
              <div className="flex items-center justify-center gap-2.5 py-10 text-muted-foreground">
                <Loader2 size={20} className="animate-spin" />
                <span className="text-sm">Loading document text...</span>
              </div>
            )}

            {/* No text */}
            {!textLoading && sentences.length === 0 && (
              <div className="text-center py-10 text-muted-foreground border border-dashed border-border rounded-lg">
                <FileText size={32} className="mx-auto mb-2" />
                <p className="text-sm">No extracted text available for this document.</p>
                <p className="text-[11px] mt-1">Switch to the "Document" tab to view the PDF directly.</p>
              </div>
            )}

            {/* Sentences */}
            {!textLoading && sentences.length > 0 && (
              <div className="flex flex-col gap-2">
                {sentences.map((s, i) => (
                  <div
                    key={i}
                    onClick={() => { setSentIdx(i); if (isPlaying) speakSentence(i) }}
                    className={`px-4 py-3.5 rounded-lg cursor-pointer transition-all border ${
                      i === sentIdx
                        ? "bg-blue-400/20 border-primary"
                        : "bg-transparent border-border hover:bg-muted"
                    }`}
                  >
                    <p className={`m-0 text-sm leading-7 transition-colors ${
                      i === sentIdx ? "text-foreground font-medium" : "text-muted-foreground font-normal"
                    }`}>
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
            <div className="rounded-lg overflow-hidden border border-border">
              <iframe
                src={`${activeDoc.file_url}#toolbar=1&navpanes=0`}
                className="w-full border-none bg-white"
                style={{ height: "72vh" }}
                title={activeDoc.title}
              />
            </div>
          ) : (
            <div className="text-center py-16 text-muted-foreground border border-dashed border-border rounded-lg">
              <FileText size={40} className="mx-auto mb-3" />
              <p className="text-sm">No PDF available for this document.</p>
              <p className="text-xs mt-1.5">Switch to "Reader" to read the extracted text.</p>
            </div>
          )
        )}
      </div>
    </div>
  )
}