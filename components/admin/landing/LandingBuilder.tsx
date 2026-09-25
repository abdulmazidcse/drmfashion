"use client"
import { useEffect, useState } from "react"
import { Palette, LayoutGrid } from "lucide-react"
import {
  type Section,
  type LandingTheme,
  duplicateSection,
} from "@/lib/landing/sections"
import SectionPanel from "@/components/admin/landing/SectionPanel"
import SectionCanvas from "@/components/admin/landing/SectionCanvas"
import SectionSettings from "@/components/admin/landing/SectionSettings"
import ThemeSettings from "@/components/admin/landing/ThemeSettings"

interface Props {
  initialSections: Section[]
  initialTheme: LandingTheme
  productCount: number
  onChange: (sections: Section[], theme: LandingTheme) => void
}

export default function LandingBuilder({ initialSections, initialTheme, productCount, onChange }: Props) {
  const [sections, setSections] = useState<Section[]>(initialSections)
  const [theme, setTheme] = useState<LandingTheme>(initialTheme)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [tab, setTab] = useState<"sections" | "theme">("sections")

  useEffect(() => {
    onChange(sections, theme)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sections, theme])

  const selected = sections.find((s) => s.id === selectedId) ?? null
  const hasOrder = sections.some((s) => s.type === "order")

  function handleAdd(section: Section) {
    setSections((prev) => [...prev, section])
    setSelectedId(section.id)
  }

  function handleDataChange(id: string, patch: Record<string, unknown>) {
    setSections((prev) => prev.map((s) => (s.id === id ? ({ ...s, data: { ...s.data, ...patch } } as Section) : s)))
  }

  function handleStyleChange(id: string, patch: Record<string, unknown>) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, style: { ...s.style, ...patch } } : s)))
  }

  function handleMove(id: string, dir: "up" | "down") {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const swap = dir === "up" ? idx - 1 : idx + 1
      if (swap < 0 || swap >= prev.length) return prev
      const next = [...prev]
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }

  function handleDuplicate(id: string) {
    setSections((prev) => {
      const idx = prev.findIndex((s) => s.id === id)
      if (idx < 0) return prev
      const clone = duplicateSection(prev[idx])
      const next = [...prev]
      next.splice(idx + 1, 0, clone)
      return next
    })
  }

  function handleDelete(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id))
    setSelectedId((prev) => (prev === id ? null : prev))
  }

  function handleToggleHidden(id: string) {
    setSections((prev) => prev.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)))
  }

  return (
    <div className="flex h-[80vh] min-h-[600px] border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50 shadow-sm">
      <div className="flex-1 flex flex-col overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-zinc-200">
          <div className="flex items-center gap-1 bg-zinc-100 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setTab("sections")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === "sections" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"}`}
            >
              <LayoutGrid className="w-3.5 h-3.5" /> Sections
            </button>
            <button
              type="button"
              onClick={() => setTab("theme")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-widest transition-colors ${tab === "theme" ? "bg-white shadow-sm text-zinc-900" : "text-zinc-500"}`}
            >
              <Palette className="w-3.5 h-3.5" /> Theme
            </button>
          </div>
          <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-mono">
            {sections.length} section{sections.length !== 1 ? "s" : ""}
          </span>
        </div>

        {tab === "sections" ? (
          <div className="flex-1 flex overflow-hidden">
            <SectionPanel onAdd={handleAdd} hasOrder={hasOrder} />
            <SectionCanvas
              sections={sections}
              theme={theme}
              productCount={productCount}
              selectedId={selectedId}
              onSelect={setSelectedId}
              onReorder={setSections}
              onMove={handleMove}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
              onToggleHidden={handleToggleHidden}
            />
            <SectionSettings
              section={selected}
              onChange={handleDataChange}
              onStyleChange={handleStyleChange}
              onClose={() => setSelectedId(null)}
            />
          </div>
        ) : (
          <ThemeSettings theme={theme} onChange={(patch) => setTheme((prev) => ({ ...prev, ...patch }))} />
        )}
      </div>
    </div>
  )
}
