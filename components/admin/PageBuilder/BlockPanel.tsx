"use client"
import { Block, BlockType, BLOCK_META, createBlock } from "./types"
import { Plus } from "lucide-react"

interface Props {
  onAdd: (block: Block) => void
}

export default function BlockPanel({ onAdd }: Props) {
  return (
    <aside className="w-64 flex-shrink-0 bg-white border-r border-zinc-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-100">
        <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Add Blocks</h2>
        <p className="text-[10px] text-zinc-400 mt-0.5">Click to insert at bottom</p>
      </div>

      {/* Block list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1.5">
        {BLOCK_META.map(meta => (
          <button
            key={meta.type}
            type="button"
            onClick={() => onAdd(createBlock(meta.type))}
            className={`w-full flex items-start gap-3 p-3 border rounded-lg text-left transition-all hover:shadow-sm hover:-translate-y-0.5 active:translate-y-0 ${meta.color}`}
          >
            <span className="text-xl leading-none mt-0.5">{meta.icon}</span>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold leading-tight">{meta.label}</p>
              <p className="text-[10px] opacity-70 mt-0.5 leading-tight">{meta.description}</p>
            </div>
            <Plus className="w-3.5 h-3.5 opacity-50 flex-shrink-0 mt-0.5" />
          </button>
        ))}
      </div>

      {/* Footer tip */}
      <div className="px-4 py-3 border-t border-zinc-100 bg-zinc-50">
        <p className="text-[9px] text-zinc-400 leading-relaxed">
          💡 <strong>Tip:</strong> Click a block in the canvas to edit its settings in the right panel.
        </p>
      </div>
    </aside>
  )
}
