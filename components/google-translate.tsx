"use client"

import { Globe } from "lucide-react"
import Script from "next/script"
import { useEffect, useState } from "react"

const languages = [
  { label: "English", value: "en" },
  { label: "Hindi", value: "hi" },
  { label: "French", value: "fr" },
  { label: "Spanish", value: "es" },
  { label: "German", value: "de" },
  { label: "Japanese", value: "ja" },
]

const includedLanguages = languages.map((l) => l.value).join(",")

function googleTranslateElementInit() {
  if (!window.google?.translate) return

  new window.google.translate.TranslateElement(
    {
      pageLanguage: "en",
      includedLanguages,
    },
    "google_translate_element"
  )
}

export function GoogleTranslate() {
  const [lang, setLang] = useState("en")

  useEffect(() => {
    window.googleTranslateElementInit = googleTranslateElementInit
  }, [])

  const onChange = (value: string) => {
    setLang(value)

    const select = document.querySelector(
      ".goog-te-combo"
    ) as HTMLSelectElement | null

    if (!select) return

    select.value = value
    select.dispatchEvent(new Event("change"))
  }

  return (
    <div className="flex items-center gap-2">
      {/* Hidden Google widget */}
      <div
        id="google_translate_element"
        style={{
            position: "absolute",
            visibility: "hidden",
            height: 0,
            width: 0,
        }}
      />

      {/* Your dropdown */}
      <select
        value={lang}
        onChange={(e) => onChange(e.target.value)}
        className="border rounded px-2 py-1 bg-transparent cursor-pointer"
      >
        {languages.map((l) => (
            <option key={l.value} value={l.value} className="cursor-pointer bg-zinc-800 text-white">
            {l.label}
          </option>
        ))}
      </select>

      {/* Script loader */}
      <Script
        src="https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit"
        strategy="afterInteractive"
      />
    </div>
  )
}

// TS fix
declare global {
  interface Window {
    google: any
    googleTranslateElementInit: () => void
  }
}