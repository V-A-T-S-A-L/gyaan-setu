"use client"

import { Zap } from "lucide-react"

interface InteractiveTabProps {
  theme: Record<string, string>
}

export default function InteractiveTab({ theme }: InteractiveTabProps) {
  return (
    <div style={{ textAlign: "center", padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: "rgba(234,179,8,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Zap size={36} color="#eab308" />
      </div>
      <p style={{ fontSize: 18, fontWeight: 600, color: theme.text }}>Interactive Content</p>
      <p style={{ fontSize: 14, color: theme.textMuted, maxWidth: 320 }}>
        Interactive exercises and activities for this chapter will appear here once your teacher uploads them.
      </p>
    </div>
  )
}
