"use client"
import type { HeroData } from "@/lib/landing/sections"
import { Field, inp, ImageField } from "@/components/admin/landing/fieldHelpers"

export function HeroSettings({ data, onChange }: { data: HeroData; onChange: (patch: Partial<HeroData>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Badge (optional)">
        <input className={inp} value={data.badge} onChange={(e) => onChange({ badge: e.target.value })} placeholder="Limited Offer" />
      </Field>
      <Field label="Heading">
        <input className={inp} value={data.heading} onChange={(e) => onChange({ heading: e.target.value })} />
      </Field>
      <Field label="Subheading">
        <textarea className={`${inp} resize-none`} rows={2} value={data.subheading} onChange={(e) => onChange({ subheading: e.target.value })} />
      </Field>
      <ImageField label="Image" value={data.image} onChange={(url) => onChange({ image: url })} />
      {data.image && (
        <Field label="Image Alt Text">
          <input className={inp} value={data.imageAlt} onChange={(e) => onChange({ imageAlt: e.target.value })} placeholder="Leave empty if decorative" />
        </Field>
      )}
      <Field label="Video URL (YouTube/Facebook — shown instead of image)">
        <input className={inp} value={data.videoUrl} onChange={(e) => onChange({ videoUrl: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
      </Field>
      <Field label="Button Text (links to the Order section)">
        <input className={inp} value={data.buttonText} onChange={(e) => onChange({ buttonText: e.target.value })} />
      </Field>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="hero-wa"
          checked={data.showWhatsapp}
          onChange={(e) => onChange({ showWhatsapp: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="hero-wa" className="text-xs font-bold text-zinc-600">Show WhatsApp button</label>
      </div>
      {data.showWhatsapp && (
        <Field label="WhatsApp Button Text">
          <input className={inp} value={data.whatsappText} onChange={(e) => onChange({ whatsappText: e.target.value })} />
        </Field>
      )}
    </div>
  )
}
