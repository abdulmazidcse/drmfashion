"use client"
import { X, Settings2 } from "lucide-react"
import type { Section } from "@/lib/landing/sections"
import { SECTION_META } from "@/lib/landing/sections"
import { Field, inp, ColorField } from "@/components/admin/landing/fieldHelpers"
import { HeroSettings } from "@/components/admin/landing/sections/HeroSection"
import { HeadlineSettings } from "@/components/admin/landing/sections/HeadlineSection"
import { TextSettings } from "@/components/admin/landing/sections/TextSection"
import { ImageSettings } from "@/components/admin/landing/sections/ImageSection"
import { GallerySettings } from "@/components/admin/landing/sections/GallerySection"
import { VideoSettings } from "@/components/admin/landing/sections/VideoSection"
import { FeaturesSettings } from "@/components/admin/landing/sections/FeaturesSection"
import { CountdownSettings } from "@/components/admin/landing/sections/CountdownSection"
import { PricingSettings } from "@/components/admin/landing/sections/PricingSection"
import { CtaSettings } from "@/components/admin/landing/sections/CtaSection"
import { FaqSettings } from "@/components/admin/landing/sections/FaqSection"
import { SpacerSettings } from "@/components/admin/landing/sections/SpacerSection"
import { HtmlSettings } from "@/components/admin/landing/sections/HtmlSection"
import { OrderSettings } from "@/components/admin/landing/sections/OrderSection"

interface Props {
  section: Section | null
  onChange: (id: string, data: Partial<Section["data"]>) => void
  onStyleChange: (id: string, patch: Partial<Section["style"]>) => void
  onClose: () => void
}

export default function SectionSettings({ section, onChange, onStyleChange, onClose }: Props) {
  if (!section) {
    return (
      <aside className="w-80 shrink-0 bg-white border-l border-zinc-200 flex flex-col">
        <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center p-8">
          <div className="w-12 h-12 bg-zinc-100 rounded-xl flex items-center justify-center">
            <Settings2 className="w-5 h-5 text-zinc-400" />
          </div>
          <p className="text-sm font-medium text-zinc-500">Click any section to edit</p>
          <p className="text-xs text-zinc-400">Select a section in the canvas to configure it here.</p>
        </div>
      </aside>
    )
  }

  const s = section
  const meta = SECTION_META.find((m) => m.type === s.type)
  const set = (patch: Record<string, unknown>) => onChange(s.id, patch as Partial<Section["data"]>)

  function renderFields() {
    switch (s.type) {
      case "hero": return <HeroSettings data={s.data} onChange={set} />
      case "headline": return <HeadlineSettings data={s.data} onChange={set} />
      case "text": return <TextSettings data={s.data} onChange={set} />
      case "image": return <ImageSettings data={s.data} onChange={set} />
      case "gallery": return <GallerySettings data={s.data} onChange={set} />
      case "video": return <VideoSettings data={s.data} onChange={set} />
      case "features": return <FeaturesSettings data={s.data} onChange={set} />
      case "countdown": return <CountdownSettings data={s.data} onChange={set} />
      case "pricing": return <PricingSettings data={s.data} onChange={set} />
      case "cta": return <CtaSettings data={s.data} onChange={set} />
      case "faq": return <FaqSettings data={s.data} onChange={set} />
      case "spacer": return <SpacerSettings data={s.data} onChange={set} />
      case "html": return <HtmlSettings data={s.data} onChange={set} />
      case "order": return <OrderSettings data={s.data} onChange={set} />
      default: return null
    }
  }

  return (
    <aside className="w-80 shrink-0 bg-white border-l border-zinc-200 flex flex-col overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-zinc-100 bg-zinc-50">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-lg shrink-0">{meta?.icon}</span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-zinc-800 truncate">{meta?.label} Settings</p>
            <p className="text-[9px] text-zinc-400 font-mono truncate">{section.id}</p>
          </div>
        </div>
        <button type="button" onClick={onClose} className="p-1.5 rounded-md hover:bg-zinc-200 transition-colors text-zinc-500 shrink-0">
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {renderFields()}

        {section.type !== "order" && (
          <div className="pt-4 border-t border-zinc-100 space-y-4">
            <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Style</p>
            <div className="grid grid-cols-2 gap-3">
              <ColorField label="Background" value={section.style.bg} onChange={(v) => onStyleChange(section.id, { bg: v })} placeholder="page background" />
              <ColorField label="Text Colour" value={section.style.text} onChange={(v) => onStyleChange(section.id, { text: v })} placeholder="theme text" />
            </div>
            <Field label="Vertical Padding">
              <select className={inp} value={section.style.padding} onChange={(e) => onStyleChange(section.id, { padding: e.target.value as Section["style"]["padding"] })}>
                <option value="none">None</option>
                <option value="sm">Small</option>
                <option value="md">Medium</option>
                <option value="lg">Large</option>
              </select>
            </Field>
          </div>
        )}
      </div>
    </aside>
  )
}
