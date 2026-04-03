"use client"

import { Boxes } from "lucide-react"

interface ThreeDModelTabProps {
  theme: Record<string, string>
}

export default function ThreeDModelTab({ theme }: ThreeDModelTabProps) {
  return (
    <div style={{ textAlign: "center", padding: "80px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
      <div style={{
        width: 72, height: 72, borderRadius: 20,
        background: "rgba(167,139,250,0.1)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}>
        <Boxes size={36} color="#a78bfa" />
      </div>
      <p style={{ fontSize: 18, fontWeight: 600, color: theme.text }}>3D Models</p>
      <p style={{ fontSize: 14, color: theme.textMuted, maxWidth: 320 }}>
        Interactive 3D models for this chapter will load here. Rotate, zoom, and explore structures in detail.
      </p>
    </div>
  )
}
