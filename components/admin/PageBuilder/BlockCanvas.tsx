"use client"
import { Block, BLOCK_META } from "./types"
import { HeroPreview } from "./blocks/HeroBlock"
import { TextPreview } from "./blocks/TextBlock"
import { ImagePreview } from "./blocks/ImageBlock"
import { TwoColumnPreview } from "./blocks/TwoColumnBlock"
import { CtaPreview } from "./blocks/CtaBlock"
import { DividerPreview } from "./blocks/DividerBlock"
import { SpacerPreview } from "./blocks/SpacerBlock"
import { HtmlPreview } from "./blocks/HtmlBlock"
import { HeroProps, TextProps, ImageProps, TwoColumnProps, CtaProps, DividerProps, SpacerProps, HtmlProps } from "./types"
import { ChevronUp, ChevronDown, Copy, Trash2, GripVertical } from "lucide-react"
import { FileText } from "lucide-react"

interface Props {
  blocks: Block[]
  selectedId: string | null
  onSelect: (id: string) => void
  onMove: (id: string, dir: 'up' | 'down') => void
  onDuplicate: (id: string) => void
  onDelete: (id: string) => void
}

function BlockPreview({ block }: { block: Block }) {
  switch (block.type) {
    case 'hero':        return <HeroPreview       props={block.props as HeroProps} />
    case 'text':        return <TextPreview        props={block.props as TextProps} />
    case 'image':       return <ImagePreview       props={block.props as ImageProps} />
    case 'two-column':  return <TwoColumnPreview   props={block.props as TwoColumnProps} />
    case 'cta':         return <CtaPreview         props={block.props as CtaProps} />
    case 'divider':     return <DividerPreview     props={block.props as DividerProps} />
    case 'spacer':      return <SpacerPreview      props={block.props as SpacerProps} />
    case 'html':        return <HtmlPreview        props={block.props as HtmlProps} />
    default:            return <div className="p-4 text-zinc-400">Unknown block</div>
  }
}

export default function BlockCanvas({ blocks, selectedId, onSelect, onMove, onDuplicate, onDelete }: Props) {
  if (blocks.length === 0) {
    return (
      <div className="flex-1 bg-zinc-50 flex flex-col items-center justify-center gap-4 text-center p-12">
        <div className="w-16 h-16 bg-white rounded-2xl shadow-sm border border-zinc-200 flex items-center justify-center">
          <FileText className="w-7 h-7 text-zinc-300" />
        </div>
        <div>
          <p className="text-sm font-bold text-zinc-600">Your page is empty</p>
          <p className="text-xs text-zinc-400 mt-1">Click a block type in the left panel to get started</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-center mt-2">
          {BLOCK_META.slice(0, 4).map(m => (
            <span key={m.type} className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${m.color}`}>
              {m.icon} {m.label}
            </span>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto bg-zinc-100">
      {/* Page canvas */}
      <div className="max-w-5xl mx-auto my-6 bg-white shadow-lg rounded-lg overflow-hidden">
        {blocks.map((block, idx) => {
          const meta = BLOCK_META.find(m => m.type === block.type)
          const isSelected = block.id === selectedId

          return (
            <div
              key={block.id}
              className={`relative group transition-all ${isSelected ? 'ring-2 ring-inset ring-blue-500' : 'hover:ring-1 hover:ring-inset hover:ring-zinc-300'}`}
              onClick={() => onSelect(block.id)}
            >
              {/* Block type badge */}
              <div className={`absolute top-2 left-2 z-20 flex items-center gap-1.5 px-2 py-1 rounded text-[9px] font-bold border transition-all ${
                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              } ${meta?.color}`}>
                <span>{meta?.icon}</span>
                <span>{meta?.label}</span>
              </div>

              {/* Controls */}
              <div className={`absolute top-2 right-2 z-20 flex items-center gap-1 transition-all ${
                isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
              }`}>
                <ControlBtn onClick={e => { e.stopPropagation(); onMove(block.id, 'up') }} disabled={idx === 0} title="Move up">
                  <ChevronUp className="w-3 h-3" />
                </ControlBtn>
                <ControlBtn onClick={e => { e.stopPropagation(); onMove(block.id, 'down') }} disabled={idx === blocks.length - 1} title="Move down">
                  <ChevronDown className="w-3 h-3" />
                </ControlBtn>
                <ControlBtn onClick={e => { e.stopPropagation(); onDuplicate(block.id) }} title="Duplicate">
                  <Copy className="w-3 h-3" />
                </ControlBtn>
                <ControlBtn onClick={e => { e.stopPropagation(); onDelete(block.id) }} title="Delete" danger>
                  <Trash2 className="w-3 h-3" />
                </ControlBtn>
              </div>

              {/* Block content */}
              <div className={`pointer-events-none select-none ${isSelected ? '' : ''}`}>
                <BlockPreview block={block} />
              </div>
            </div>
          )
        })}
      </div>
      <div className="h-16" />
    </div>
  )
}

function ControlBtn({
  children,
  onClick,
  disabled,
  danger,
  title,
}: {
  children: React.ReactNode
  onClick: (e: React.MouseEvent) => void
  disabled?: boolean
  danger?: boolean
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      disabled={disabled}
      onClick={onClick}
      className={`w-6 h-6 flex items-center justify-center rounded text-white shadow-sm transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
        danger ? 'bg-red-500 hover:bg-red-600' : 'bg-zinc-800 hover:bg-zinc-700'
      }`}
    >
      {children}
    </button>
  )
}
