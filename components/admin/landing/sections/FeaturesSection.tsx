"use client"
import type { FeaturesData } from "@/lib/landing/sections"
import { Field, inp, ColorField, TextListField } from "@/components/admin/landing/fieldHelpers"

export function FeaturesSettings({ data, onChange }: { data: FeaturesData; onChange: (patch: Partial<FeaturesData>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Title (optional)">
        <input className={inp} value={data.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <TextListField label="Items" items={data.items} onChange={(items) => onChange({ items })} placeholder="Feature or benefit" max={30} />
      <div className="grid grid-cols-2 gap-3">
        <Field label="Icon">
          <select className={inp} value={data.icon} onChange={(e) => onChange({ icon: e.target.value as FeaturesData["icon"] })}>
            <option value="check">Check</option>
            <option value="star">Star</option>
            <option value="arrow">Arrow</option>
            <option value="none">None</option>
          </select>
        </Field>
        <Field label="Columns">
          <select className={inp} value={data.columns} onChange={(e) => onChange({ columns: Number(e.target.value) as FeaturesData["columns"] })}>
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Card Background" value={data.cardBg} onChange={(v) => onChange({ cardBg: v })} placeholder="none" />
        <ColorField label="Icon Colour" value={data.iconColor} onChange={(v) => onChange({ iconColor: v })} placeholder="theme primary" />
      </div>
    </div>
  )
}
