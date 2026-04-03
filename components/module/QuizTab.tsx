"use client"

import { Brain } from "lucide-react"

interface QuizTabProps {
  theme: Record<string, string>
}

export default function QuizTab({ theme }: QuizTabProps) {
  return (
    <div style={{ textAlign: "center", padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: "rgba(52,211,153,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Brain size={36} color="#34d399" />
      </div>
      <p style={{ fontSize: 18, fontWeight: 600, color: theme.text }}>AI Quiz</p>
      <p style={{ fontSize: 14, color: theme.textMuted, maxWidth: 320 }}>
        AI-generated quizzes with adaptive difficulty will appear here. Test your understanding of the chapter.
      </p>
    </div>
  )
}
