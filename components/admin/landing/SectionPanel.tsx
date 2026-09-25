"use client"
import { Plus } from "lucide-react"
import { SECTION_META, createSection, type Section } from "@/lib/landing/sections"

interface Props {
  onAdd: (section: Section) => void
  hasOrder: boolean
}

/** Colour is derived from the type so every card looks distinct without hand-picking 14 palettes. */
const COLORS = [
  "bg-violet-50 border-violet-200 text-violet-700",
  "bg-blue-50 border-blue-200 text-blue-700",
  "bg-emerald-50 border-emerald-200 text-emerald-700",
  "bg-amber-50 border-amber-200 text-amber-700",
  "bg-rose-50 border-rose-200 text-rose-700",
  "bg-cyan-50 border-cyan-200 text-cyan-700",
  "bg-orange-50 border-orange-200 text-orange-700",
]

export default function SectionPanel({ onAdd, hasOrder }: Props) {
  return (
    <aside className="w-64 shrink-0 bg-white border-r border-zinc-200 flex flex-col overflow-hidden">
      <div className="px-4 py-4 border-b border-zinc-100">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Add Sections</h2>
        <p className="text-[10px] text-zinc-400 mt-0.5">Click to insert, drag in the canvas to reorder</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {SECTION_META.map((meta, i) => {
          const disabled = meta.type === "order" && hasOrder
          return (
            <button
              key={meta.type}
              type="button"
              disabled={disabled}
              onClick={() => onAdd(createSection(meta.type))}
              title={disabled ? "Only one Order Form per page" : undefined}
              className={`w-full flex items-start gap-3 p-3 border rounded-lg text-left transition-all hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-40 disabled:hover:translate-y-0 disabled:hover:shadow-none disabled:cursor-not-allowed ${COLORS[i % COLORS.length]}`}
            >
              <span className="text-xl leading-none mt-0.5">{meta.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold leading-tight">{meta.label}</p>
                <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{meta.description}</p>
              </div>
              <Plus className="w-3.5 h-3.5 opacity-50 shrink-0 mt-0.5" />
            </button>
          )
        })}
      </div>

      <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50">
        <p className="text-[9px] text-zinc-400 leading-relaxed">
          💡 <strong>Tip:</strong> Drag a section by its grip handle to reorder, or click it to edit settings on the right.
        </p>
      </div>
    </aside>
  )
}
