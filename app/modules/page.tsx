"use client"

import { useRouter } from "next/navigation"
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileText,
  GraduationCap,
  Layers,
  Lock,
  Sparkles,
  Users,
} from "lucide-react"

const STATIC_ROOM = {
  name: "Biology 101",
  subject: "Biology",
  code: "BIO-101",
}

const STATIC_MODULES = [
  {
    id: "1",
    title: "Chapter 1: Introduction to Biology",
    description: "Explore the fundamental concepts of life, cells, and living organisms.",
    docCount: 3,
    duration: "45 min",
    isLocked: false,
    isCompleted: true,
  },
  {
    id: "2",
    title: "Chapter 2: Cell Theory",
    description: "Understand the building blocks of life and how cells function.",
    docCount: 4,
    duration: "60 min",
    isLocked: false,
    isCompleted: true,
  },
  {
    id: "3",
    title: "Chapter 3: Cell Structure",
    description: "Deep dive into organelles, membranes, and cellular architecture.",
    docCount: 5,
    duration: "75 min",
    isLocked: false,
    isCompleted: false,
  },
  {
    id: "4",
    title: "Chapter 4: DNA & Genetics",
    description: "Learn about heredity, DNA replication, and genetic expression.",
    docCount: 6,
    duration: "90 min",
    isLocked: false,
    isCompleted: false,
  },
  {
    id: "5",
    title: "Chapter 5: Evolution",
    description: "Study natural selection, adaptation, and the history of life on Earth.",
    docCount: 4,
    duration: "60 min",
    isLocked: true,
    isCompleted: false,
  },
  {
    id: "6",
    title: "Chapter 6: Ecosystems",
    description: "Understand how living organisms interact with their environments.",
    docCount: 3,
    duration: "45 min",
    isLocked: true,
    isCompleted: false,
  },
]

const MODULE_COLORS = [
  { bg: "bg-blue-500/10", border: "border-blue-500/20", text: "text-blue-400" },
  { bg: "bg-purple-500/10", border: "border-purple-500/20", text: "text-purple-400" },
  { bg: "bg-emerald-500/10", border: "border-emerald-500/20", text: "text-emerald-400" },
  { bg: "bg-orange-500/10", border: "border-orange-500/20", text: "text-orange-400" },
  { bg: "bg-pink-500/10", border: "border-pink-500/20", text: "text-pink-400" },
  { bg: "bg-cyan-500/10", border: "border-cyan-500/20", text: "text-cyan-400" },
]

export default function ModulesListPage() {
  const router = useRouter()
  const completed = STATIC_MODULES.filter((m) => m.isCompleted).length
  const total = STATIC_MODULES.length

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white">
      <div className="relative overflow-hidden border-b border-white/5">
        <div className="pointer-events-none absolute -top-20 -left-20 h-64 w-64 rounded-full bg-blue-600/10 blur-3xl" />
        <div className="pointer-events-none absolute top-0 right-40 h-48 w-48 rounded-full bg-purple-600/8 blur-3xl" />

        <div className="mx-auto max-w-5xl px-6 py-8">
          <button
            onClick={() => router.back()}
            className="mb-5 flex items-center gap-2 text-sm text-white/40 transition hover:text-white/70"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Dashboard
          </button>

          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-white/10 bg-gradient-to-br from-blue-500/20 to-purple-500/20">
              <GraduationCap className="h-7 w-7 text-blue-300" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold">{STATIC_ROOM.name}</h1>
                <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/50">
                  {STATIC_ROOM.code}
                </span>
              </div>
              <p className="mt-0.5 text-sm text-white/40">
                {STATIC_ROOM.subject} · {total} modules
              </p>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-white/5 bg-white/[0.02] p-4">
            <div className="mb-2 flex items-center justify-between text-sm">
              <span className="flex items-center gap-1.5 text-white/50">
                <Sparkles className="h-3.5 w-3.5 text-yellow-400" />
                Your progress
              </span>
              <span className="font-medium text-white/80">
                {completed} / {total} completed
              </span>
            </div>
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-blue-500 to-purple-500"
                style={{ width: `${(completed / total) * 100}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-6 py-6">
        <div className="mb-8 grid grid-cols-3 gap-4">
          {[
            { icon: Layers, label: "Total Modules", value: total },
            { icon: FileText, label: "Documents", value: STATIC_MODULES.reduce((a, m) => a + m.docCount, 0) },
            { icon: Users, label: "Classmates", value: "24" },
          ].map(({ icon: Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-3 rounded-2xl border border-white/5 bg-white/[0.02] p-4"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/5">
                <Icon className="h-4 w-4 text-white/50" />
              </div>
              <div>
                <p className="text-xs text-white/35">{label}</p>
                <p className="text-lg font-semibold">{value}</p>
              </div>
            </div>
          ))}
        </div>

        <h2 className="mb-4 text-sm font-semibold uppercase tracking-widest text-white/30">
          Modules
        </h2>

        <div className="space-y-3">
          {STATIC_MODULES.map((mod, idx) => {
            const color = MODULE_COLORS[idx % MODULE_COLORS.length]

            return (
              <button
                key={mod.id}
                onClick={() => !mod.isLocked && router.push(`/modules/${mod.id}`)}
                disabled={mod.isLocked}
                className={`
                  group w-full rounded-2xl border p-5 text-left transition-all duration-200
                  ${
                    mod.isLocked
                      ? "cursor-not-allowed border-white/5 bg-white/[0.01] opacity-40"
                      : `cursor-pointer ${color.border} ${color.bg} hover:scale-[1.005] hover:shadow-xl hover:shadow-black/40`
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`
                      flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border text-sm font-bold
                      ${
                        mod.isLocked
                          ? "border-white/10 bg-white/5 text-white/25"
                          : `${color.border} ${color.bg} ${color.text}`
                      }
                    `}
                  >
                    {mod.isLocked ? (
                      <Lock className="h-4 w-4" />
                    ) : mod.isCompleted ? (
                      <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                    ) : (
                      idx + 1
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{mod.title}</span>
                      {mod.isCompleted && (
                        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs text-emerald-400">
                          Completed
                        </span>
                      )}
                      {mod.isLocked && (
                        <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-white/35">
                          Locked
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-sm text-white/35">
                      {mod.description}
                    </p>
                    <div className="mt-2 flex items-center gap-4 text-xs text-white/25">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {mod.docCount} documents
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {mod.duration}
                      </span>
                    </div>
                  </div>

                  {!mod.isLocked && (
                    <ChevronRight className="h-5 w-5 shrink-0 text-white/15 transition-transform group-hover:translate-x-1 group-hover:text-white/40" />
                  )}
                </div>
              </button>
            )
          })}
        </div>

        <div className="mt-8 flex items-center gap-3 rounded-2xl border border-yellow-500/15 bg-yellow-500/5 p-4">
          <BookOpen className="h-5 w-5 shrink-0 text-yellow-400" />
          <p className="text-sm text-white/50">
            Complete modules in order to unlock the next chapter. Locked modules will become available as your teacher releases them.
          </p>
        </div>
      </div>
    </div>
  )
}