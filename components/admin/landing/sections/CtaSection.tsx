"use client"
import type { CtaData } from "@/lib/landing/sections"
import { Field, inp } from "@/components/admin/landing/fieldHelpers"

export function CtaSettings({ data, onChange }: { data: CtaData; onChange: (patch: Partial<CtaData>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Heading">
        <input className={inp} value={data.heading} onChange={(e) => onChange({ heading: e.target.value })} />
      </Field>
      <Field label="Text">
        <textarea className={`${inp} resize-none`} rows={2} value={data.text} onChange={(e) => onChange({ text: e.target.value })} />
      </Field>
      <Field label="Button Text (links to the Order section)">
        <input className={inp} value={data.buttonText} onChange={(e) => onChange({ buttonText: e.target.value })} />
      </Field>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="cta-wa"
          checked={data.showWhatsapp}
          onChange={(e) => onChange({ showWhatsapp: e.target.checked })}
          className="w-4 h-4"
        />
        <label htmlFor="cta-wa" className="text-xs font-bold text-zinc-600">Show WhatsApp button</label>
      </div>
    </div>
  )
}
