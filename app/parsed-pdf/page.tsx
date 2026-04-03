// app/test-parsed-pdf/page.tsx
"use client"

import { useEffect, useState } from "react"

const moduleId = "79a7965c-6784-4de5-9fe6-30e4706ca47c"

// 🔥 Same cleanup used in backend
const fixBrokenSpacing = (text: string) => {
  return text
    .replace(/-+Page.*?-+/gi, "")
    .replace(/\s+/g, " ")
    .replace(/(\b\w\b(?:\s\w\b)+)/g, (m) => m.replace(/\s/g, ""))
    .replace(/\b(\d\s)+\d\b/g, (m) => m.replace(/\s/g, ""))
    .replace(/\s+/g, " ")
    .trim()
}

export default function TestParsedPDF() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchParsedJSON = async () => {
      try {
        // 🔥 cache buster (VERY IMPORTANT)
        const cacheBuster = `t=${Date.now()}`

        const url = `https://xcjhulxgzljymxjnheae.supabase.co/storage/v1/object/public/docs/parsed/${moduleId}.json?${cacheBuster}`

        const res = await fetch(url, {
          cache: "no-store", // 🔥 force fresh
        })

        if (!res.ok) throw new Error("Failed to fetch JSON")

        const json = await res.json()

        console.log("📦 Fresh JSON loaded:", json)

        // 🔥 clean sentences on frontend too
        const cleanedSentences = json.sentences?.map((s: any) => ({
          ...s,
          text: fixBrokenSpacing(s.text),
        }))

        setData({
          ...json,
          sentences: cleanedSentences,
        })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }

    fetchParsedJSON()
  }, [])

  if (loading) return <div style={{ padding: 20 }}>Loading...</div>
  if (error) return <div style={{ padding: 20 }}>Error: {error}</div>
  if (!data) return <div style={{ padding: 20 }}>No data found</div>

  return (
    <div style={{ padding: 20, maxWidth: 800, margin: "auto" }}>
      <h1>Parsed PDF Sentences</h1>

      <h3>Module ID: {data?.meta?.moduleId}</h3>
      <h4>
        Total Sentences:{" "}
        {data?.meta?.totalSentences || data?.meta?.sentenceCount}
      </h4>

      {/* 🔥 Debug info */}
      <p style={{ fontSize: 12, color: "gray" }}>
        Loaded at: {new Date().toLocaleTimeString()}
      </p>

      <div style={{ marginTop: 20 }}>
        {data?.sentences?.map((s: any, index: number) => (
          <p
            key={s.id}
            style={{
              borderBottom: "1px solid #ccc",
              padding: "8px 0",
              lineHeight: "1.6",
            }}
          >
            <strong>{index + 1}.</strong> {s.text}
          </p>
        ))}
      </div>
    </div>
  )
}