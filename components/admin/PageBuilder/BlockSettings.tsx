"use client"
import { Block, BlockProps, BLOCK_META } from "./types"
import { HeroSettings } from "./blocks/HeroBlock"
import { TextSettings } from "./blocks/TextBlock"
import { ImageSettings } from "./blocks/ImageBlock"
import { TwoColumnSettings } from "./blocks/TwoColumnBlock"
import { CtaSettings } from "./blocks/CtaBlock"
import { DividerSettings } from "./blocks/DividerBlock"
import { SpacerSettings } from "./blocks/SpacerBlock"
import { HtmlSettings } from "./blocks/HtmlBlock"
import { HeroProps, TextProps, ImageProps, TwoColumnProps, CtaProps, DividerProps, SpacerProps, HtmlProps } from "./types"
import { X, Settings2 } from "lucide-react"

interface Props {
  block: Block | null
  onChange: (id: string, props: BlockProps) => void
  onClose: () => void
}

export default function BlockSettings({ block, onChange, onClose }: Props) {
  if (!block) {
    return (
      <aside className="w-80 flex-shrink-0 bg-white border-l border-zinc-200 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-500">Click any block to edit</p>
          <p className="text-xs text-zinc-400">Select a block in the canvas to configure its settings here.</p>
        </div>
      </aside>
    )
  }

  const meta = BLOCK_META.find(m => m.type === block.type)

  const renderSettings = () => {
    const commonProps = {
      onChange: (props: BlockProps) => onChange(block.id, props),
    }
    switch (block.type) {
      case 'hero':        return <HeroSettings       props={block.props as HeroProps}       onChange={p => onChange(block.id, p)} />
      case 'text':        return <TextSettings        props={block.props as TextProps}        onChange={p => onChange(block.id, p)} />
      case 'image':       return <ImageSettings       props={block.props as ImageProps}       onChange={p => onChange(block.id, p)} />
      case 'two-column':  return <TwoColumnSettings   props={block.props as TwoColumnProps}   onChange={p => onChange(block.id, p)} />
      case 'cta':         return <CtaSettings         props={block.props as CtaProps}         onChange={p => onChange(block.id, p)} />
      case 'divider':     return <DividerSettings     props={block.props as DividerProps}     onChange={p => onChange(block.id, p)} />
      case 'spacer':      return <SpacerSettings      props={block.props as SpacerProps}      onChange={p => onChange(block.id, p)} />
      case 'html':        return <HtmlSettings        props={block.props as HtmlProps}        onChange={p => onChange(block.id, p)} />
      default:            return <p className="text-sm text-zinc-400">No settings available.</p>
    }
  }

  return (
    <aside className="w-80 flex-shrink-0 bg-white border-l border-zinc-200 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 bg-zinc-50">
        <div className="flex items-center gap-2">
          <span className="text-lg">{meta?.icon}</span>
          <div>
            <p className="text-xs font-bold text-zinc-800">{meta?.label} Settings</p>
            <p className="text-[9px] text-zinc-400 font-mono">{block.id}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1.5 rounded-md hover:bg-zinc-200 transition-colors text-zinc-500"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Settings content */}
      <div className="flex-1 overflow-y-auto p-4">
        {renderSettings()}
      </div>
    </aside>
  )
}
