"use client"
import type { HeadlineData } from "@/lib/landing/sections"
import { Field, inp, ColorField } from "@/components/admin/landing/fieldHelpers"

export function HeadlineSettings({ data, onChange }: { data: HeadlineData; onChange: (patch: Partial<HeadlineData>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Text">
        <input className={inp} value={data.text} onChange={(e) => onChange({ text: e.target.value })} />
      </Field>
      <Field label="Size">
        <select className={inp} value={data.size} onChange={(e) => onChange({ size: e.target.value as HeadlineData["size"] })}>
          <option value="md">Medium</option>
          <option value="lg">Large</option>
          <option value="xl">Extra Large</option>
        </select>
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Box Colour" value={data.boxColor} onChange={(v) => onChange({ boxColor: v })} placeholder="theme primary" />
        <ColorField label="Text Colour" value={data.boxTextColor} onChange={(v) => onChange({ boxTextColor: v })} placeholder="theme text" />
      </div>
    </div>
  )
}
