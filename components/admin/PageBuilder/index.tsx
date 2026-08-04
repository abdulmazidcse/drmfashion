"use client"
import { useState, useCallback, useEffect } from "react"
import { Block, BlockProps, parseContent, serializeContent, createBlock } from "./types"
import BlockPanel from "./BlockPanel"
import BlockCanvas from "./BlockCanvas"
import BlockSettings from "./BlockSettings"
import { Eye, EyeOff } from "lucide-react"

interface Props {
  initialContent: string
  onChange: (serialized: string) => void
}

export default function PageBuilder({ initialContent, onChange }: Props) {
  const [blocks, setBlocks] = useState<Block[]>(() => parseContent(initialContent))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [showPreviewPanel, setShowPreviewPanel] = useState(true)

  // Sync up to parent whenever blocks change
  useEffect(() => {
    onChange(serializeContent(blocks))
  }, [blocks])

  const selectedBlock = blocks.find(b => b.id === selectedId) ?? null

  // ── Add ─────────────────────────────────────────────────────────────────────
  const handleAdd = useCallback((block: Block) => {
    setBlocks(prev => [...prev, block])
    setSelectedId(block.id)
  }, [])

  // ── Update props ─────────────────────────────────────────────────────────────
  const handleChange = useCallback((id: string, props: BlockProps) => {
    setBlocks(prev => prev.map(b => b.id === id ? { ...b, props } : b))
  }, [])

  // ── Move ─────────────────────────────────────────────────────────────────────
  const handleMove = useCallback((id: string, dir: 'up' | 'down') => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx < 0) return prev
      const next = [...prev]
      const swap = dir === 'up' ? idx - 1 : idx + 1
      if (swap < 0 || swap >= next.length) return prev
      ;[next[idx], next[swap]] = [next[swap], next[idx]]
      return next
    })
  }, [])

  // ── Duplicate ─────────────────────────────────────────────────────────────────
  const handleDuplicate = useCallback((id: string) => {
    setBlocks(prev => {
      const idx = prev.findIndex(b => b.id === id)
      if (idx < 0) return prev
      const original = prev[idx]
      const clone: Block = {
        ...original,
        id: `block_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        props: JSON.parse(JSON.stringify(original.props)),
      }
      const next = [...prev]
      next.splice(idx + 1, 0, clone)
      return next
    })
  }, [])

  // ── Delete ─────────────────────────────────────────────────────────────────
  const handleDelete = useCallback((id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id))
    setSelectedId(prev => prev === id ? null : prev)
  }, [])

  return (
    <div className="flex h-[80vh] min-h-[600px] border border-zinc-200 rounded-xl overflow-hidden bg-zinc-50 shadow-sm">
      {/* Left: Block palette */}
      <BlockPanel onAdd={handleAdd} />

      {/* Center: Canvas */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Canvas toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-white border-b border-zinc-200">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest">Canvas</span>
            <span className="text-[10px] bg-zinc-100 text-zinc-500 px-2 py-0.5 rounded-full font-mono">
              {blocks.length} block{blocks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setShowPreviewPanel(v => !v)}
            className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-800 transition-colors"
          >
            {showPreviewPanel ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
            {showPreviewPanel ? 'Hide' : 'Show'} Settings
          </button>
        </div>

        <BlockCanvas
          blocks={blocks}
          selectedId={selectedId}
          onSelect={setSelectedId}
          onMove={handleMove}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      </div>

      {/* Right: Settings panel */}
      {showPreviewPanel && (
        <BlockSettings
          block={selectedBlock}
          onChange={handleChange}
          onClose={() => setSelectedId(null)}
        />
      )}
    </div>
  )
}
