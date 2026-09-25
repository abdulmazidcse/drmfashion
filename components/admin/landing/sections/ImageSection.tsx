"use client"
import type { ImageData } from "@/lib/landing/sections"
import { Field, inp, ImageField } from "@/components/admin/landing/fieldHelpers"

export function ImageSettings({ data, onChange }: { data: ImageData; onChange: (patch: Partial<ImageData>) => void }) {
  return (
    <div className="space-y-4">
      <ImageField label="Image" value={data.src} onChange={(url) => onChange({ src: url })} />
      <Field label="Alt Text">
        <input className={inp} value={data.alt} onChange={(e) => onChange({ alt: e.target.value })} />
      </Field>
      <Field label="Link (optional)">
        <input className={inp} value={data.link} onChange={(e) => onChange({ link: e.target.value })} placeholder="https://..." />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Width">
          <select className={inp} value={data.width} onChange={(e) => onChange({ width: e.target.value as ImageData["width"] })}>
            <option value="sm">Small</option>
            <option value="md">Medium</option>
            <option value="lg">Large</option>
            <option value="full">Full width</option>
          </select>
        </Field>
        <Field label="Rounded corners">
          <select className={inp} value={data.rounded ? "yes" : "no"} onChange={(e) => onChange({ rounded: e.target.value === "yes" })}>
            <option value="no">No</option>
            <option value="yes">Yes</option>
          </select>
        </Field>
      </div>
    </div>
  )
}
