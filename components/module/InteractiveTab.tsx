"use client"

import { useEffect, useRef, useState } from "react"
import {
  BookOpen, ChevronDown, ChevronUp,
  Loader2, Send, Sparkles, User,
} from "lucide-react"

interface Message {
  id: string
  role: "student" | "ai"
  text: string
  sources?: string[]
  confidence?: "high" | "medium" | "low"
  timestamp: Date
}

interface InteractiveTabProps {
  theme: Record<string, string>
  docId: string
  docTitle: string
}

const RAG_SERVICE_URL = process.env.NEXT_PUBLIC_RAG_SERVICE_URL ?? "http://localhost:8000"

export default function InteractiveTab({ theme, docId, docTitle }: InteractiveTabProps) {
  const [messages,        setMessages]        = useState<Message[]>([])
  const [input,           setInput]           = useState("")
  const [loading,         setLoading]         = useState(false)
  const [indexStatus,     setIndexStatus]     = useState<"checking" | "ready" | "not_indexed">("checking")
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set())

  const bottomRef = useRef<HTMLDivElement>(null)
  const inputRef  = useRef<HTMLTextAreaElement>(null)

  // Reset + check index whenever docId changes
  useEffect(() => {
    if (!docId) return
    setMessages([])
    setIndexStatus("checking")
    checkIndexStatus()
  }, [docId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const checkIndexStatus = async () => {
    try {
      const res  = await fetch(`${RAG_SERVICE_URL}/status/${docId}`)
      const data = await res.json()
      if (data.indexed) {
        setIndexStatus("ready")
        addAiMessage(
          `Hi! I've read **${docTitle}** and I'm ready to answer your questions. Ask me anything from this document! 📚`,
          [], "high"
        )
      } else {
        setIndexStatus("not_indexed")
      }
    } catch {
      setIndexStatus("not_indexed")
    }
  }

  const addAiMessage = (
    text: string,
    sources: string[],
    confidence: "high" | "medium" | "low"
  ) => {
    setMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: "ai", text, sources, confidence, timestamp: new Date() },
    ])
  }

  const handleSend = async () => {
    const question = input.trim()
    if (!question || loading || indexStatus !== "ready") return

    setMessages(prev => [
      ...prev,
      { id: crypto.randomUUID(), role: "student", text: question, timestamp: new Date() },
    ])
    setInput("")
    setLoading(true)

    try {
      const res  = await fetch(`${RAG_SERVICE_URL}/query`, {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ doc_id: docId, question }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.detail ?? data.error ?? "Query failed")
      addAiMessage(data.answer, data.sources ?? [], data.confidence ?? "medium")
    } catch {
      addAiMessage(
        "Sorry, something went wrong. Please try again in a moment. 🙏",
        [], "low"
      )
    } finally {
      setLoading(false)
      inputRef.current?.focus()
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const toggleSources = (id: string) =>
    setExpandedSources(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })

  const confidenceColor = (c?: string) =>
    c === "high" ? "#22c55e" : c === "medium" ? "#f59e0b" : "#ef4444"

  const SUGGESTED = [
    "Summarize the main topic of this document",
    "What are the key concepts explained here?",
    "Explain the most important points in simple words",
    "What examples are given in this document?",
  ]

  // ── Not indexed / checking ────────────────────────────────────────────────
  if (indexStatus === "checking") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 0", gap: 12 }}>
      <Loader2 size={28} color={theme.textMuted} style={{ animation: "spin 1s linear infinite" }} />
      <p style={{ color: theme.textMuted, fontSize: 14 }}>Checking document index…</p>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )

  if (indexStatus === "not_indexed") return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "60px 20px", gap: 14, textAlign: "center" }}>
      <div style={{ width: 56, height: 56, borderRadius: "50%", background: theme.primaryMuted, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <BookOpen size={24} color={theme.primary} />
      </div>
      <p style={{ fontSize: 15, fontWeight: 700, color: theme.text, margin: 0 }}>Document not indexed yet</p>
      <p style={{ fontSize: 13, color: theme.textMuted, maxWidth: 320, lineHeight: 1.7, margin: 0 }}>
        This document is still being processed for AI search. Wait a moment and try again.
      </p>
      <button
        onClick={checkIndexStatus}
        style={{ padding: "9px 22px", borderRadius: 8, background: theme.primary, border: "none", color: "#fff", fontSize: 13, fontWeight: 600, cursor: "pointer" }}
      >
        Check Again
      </button>
    </div>
  )

  // ── Chat UI ───────────────────────────────────────────────────────────────
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "calc(100vh - 300px)", minHeight: 480 }}>

      {/* Header bar */}
      <div style={{
        display: "flex", alignItems: "center", gap: 10,
        padding: "10px 14px", background: theme.cardBg,
        border: `1px solid ${theme.border}`, borderRadius: "10px 10px 0 0",
      }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: theme.primaryMuted, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Sparkles size={15} color={theme.primary} />
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13, fontWeight: 700, margin: 0, color: theme.text }}>Talk to PDF</p>
          <p style={{ fontSize: 11, color: theme.textMuted, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            Answers from: {docTitle}
          </p>
        </div>
        <span style={{ fontSize: 11, padding: "3px 10px", borderRadius: 20, background: "#22c55e20", color: "#22c55e", fontWeight: 600, flexShrink: 0 }}>
          ● Ready
        </span>
      </div>

      {/* Messages area */}
      <div style={{
        flex: 1, overflowY: "auto", padding: "16px 14px",
        border: `1px solid ${theme.border}`, borderTop: "none", borderBottom: "none",
        background: theme.contentBg, display: "flex", flexDirection: "column", gap: 16,
      }}>
        {/* Suggested chips */}
        {messages.length <= 1 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", paddingTop: 4 }}>
            {SUGGESTED.map((q, i) => (
              <button key={i}
                onClick={() => { setInput(q); inputRef.current?.focus() }}
                style={{
                  padding: "7px 13px", borderRadius: 20, fontSize: 12, cursor: "pointer",
                  background: theme.cardBg, border: `1px solid ${theme.border}`,
                  color: theme.textSec, transition: "all 0.18s",
                }}
                onMouseOver={e => { e.currentTarget.style.borderColor = theme.primary; e.currentTarget.style.color = theme.primary }}
                onMouseOut={e  => { e.currentTarget.style.borderColor = theme.border;  e.currentTarget.style.color = theme.textSec }}
              >
                {q}
              </button>
            ))}
          </div>
        )}

        {/* Message bubbles */}
        {messages.map(msg => (
          <div key={msg.id} style={{ display: "flex", flexDirection: "column", alignItems: msg.role === "student" ? "flex-end" : "flex-start", gap: 5 }}>

            {/* Meta row */}
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              {msg.role === "ai" && (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: theme.primaryMuted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Sparkles size={11} color={theme.primary} />
                </div>
              )}
              <span style={{ fontSize: 11, color: theme.textMuted }}>
                {msg.role === "student" ? "You" : "Gyaan Setu AI"} · {msg.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </span>
              {msg.role === "ai" && msg.confidence && (
                <span style={{ fontSize: 10, padding: "1px 7px", borderRadius: 10, background: `${confidenceColor(msg.confidence)}20`, color: confidenceColor(msg.confidence), fontWeight: 600 }}>
                  {msg.confidence === "high" ? "High" : msg.confidence === "medium" ? "Medium" : "Low"} confidence
                </span>
              )}
              {msg.role === "student" && (
                <div style={{ width: 22, height: 22, borderRadius: "50%", background: theme.primaryMuted, display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <User size={11} color={theme.primary} />
                </div>
              )}
            </div>

            {/* Bubble */}
            <div style={{
              maxWidth: "82%", padding: "11px 15px", fontSize: 14, lineHeight: 1.7,
              borderRadius: msg.role === "student" ? "18px 18px 4px 18px" : "18px 18px 18px 4px",
              background: msg.role === "student" ? theme.primary : theme.cardBg,
              border: msg.role === "ai" ? `1px solid ${theme.border}` : "none",
              color: msg.role === "student" ? "#fff" : theme.text,
            }}>
              {msg.text}
            </div>

            {/* Source excerpts */}
            {msg.role === "ai" && msg.sources && msg.sources.length > 0 && (
              <div style={{ maxWidth: "82%" }}>
                <button
                  onClick={() => toggleSources(msg.id)}
                  style={{ display: "flex", alignItems: "center", gap: 4, background: "transparent", border: "none", color: theme.textMuted, fontSize: 11, cursor: "pointer", padding: "3px 0" }}
                >
                  <BookOpen size={11} />
                  {expandedSources.has(msg.id) ? "Hide" : "Show"} source excerpts ({msg.sources.length})
                  {expandedSources.has(msg.id) ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
                </button>
                {expandedSources.has(msg.id) && (
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 4 }}>
                    {msg.sources.map((src, i) => (
                      <div key={i} style={{
                        padding: "8px 11px", borderRadius: 8, fontSize: 12,
                        background: theme.cardBg, border: `1px solid ${theme.border}`,
                        color: theme.textSec, lineHeight: 1.6,
                        borderLeft: `3px solid ${theme.primary}`,
                      }}>
                        <span style={{ fontSize: 10, color: theme.textMuted, fontWeight: 600, display: "block", marginBottom: 3 }}>EXCERPT {i + 1}</span>
                        {src.length > 280 ? src.slice(0, 280) + "…" : src}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {/* Typing indicator */}
        {loading && (
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 22, height: 22, borderRadius: "50%", background: theme.primaryMuted, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Sparkles size={11} color={theme.primary} />
            </div>
            <div style={{ padding: "11px 15px", borderRadius: "18px 18px 18px 4px", background: theme.cardBg, border: `1px solid ${theme.border}`, display: "flex", gap: 4, alignItems: "center" }}>
              {[0, 1, 2].map(i => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: "50%", background: theme.textMuted, animation: `bounce 1s ease-in-out ${i * 0.2}s infinite` }} />
              ))}
            </div>
          </div>
        )}

        <div ref={bottomRef} />
      </div>

      {/* Input row */}
      <div style={{
        display: "flex", gap: 10, alignItems: "flex-end",
        padding: "11px 14px", border: `1px solid ${theme.border}`,
        borderTop: "none", borderRadius: "0 0 10px 10px",
        background: theme.cardBg,
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about this document… (Enter to send)"
          rows={1}
          style={{
            flex: 1, resize: "none", padding: "9px 13px", borderRadius: 9,
            background: theme.inputBg, border: `1px solid ${theme.border}`,
            color: theme.text, fontSize: 14, fontFamily: "inherit",
            outline: "none", lineHeight: 1.5, maxHeight: 120, overflowY: "auto",
          }}
          onInput={e => {
            const t = e.currentTarget
            t.style.height = "auto"
            t.style.height = t.scrollHeight + "px"
          }}
        />
        <button
          onClick={handleSend}
          disabled={!input.trim() || loading}
          style={{
            width: 40, height: 40, borderRadius: 9, border: "none", flexShrink: 0,
            background: input.trim() && !loading ? theme.primary : theme.border,
            color: "#fff", display: "flex", alignItems: "center", justifyContent: "center",
            cursor: input.trim() && !loading ? "pointer" : "not-allowed", transition: "all 0.18s",
          }}
        >
          {loading
            ? <Loader2 size={17} style={{ animation: "spin 1s linear infinite" }} />
            : <Send size={17} />}
        </button>
      </div>

      <style>{`
        @keyframes spin   { to { transform: rotate(360deg); } }
        @keyframes bounce { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-5px)} }
      `}</style>
    </div>
  )
}
