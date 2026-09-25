"use client"
import type { TextData } from "@/lib/landing/sections"
import { Field, inp } from "@/components/admin/landing/fieldHelpers"

export function TextSettings({ data, onChange }: { data: TextData; onChange: (patch: Partial<TextData>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Content (HTML allowed — bold, lists, line breaks)">
        <textarea className={`${inp} resize-y font-mono text-xs`} rows={8} value={data.html} onChange={(e) => onChange({ html: e.target.value })} />
      </Field>
      <Field label="Align">
        <select className={inp} value={data.align} onChange={(e) => onChange({ align: e.target.value as TextData["align"] })}>
          <option value="left">Left</option>
          <option value="center">Center</option>
          <option value="right">Right</option>
        </select>
      </Field>
    </div>
  )
}
