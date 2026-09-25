"use client"
import type { HtmlData } from "@/lib/landing/sections"
import { Field, inp } from "@/components/admin/landing/fieldHelpers"

export function HtmlSettings({ data, onChange }: { data: HtmlData; onChange: (patch: Partial<HtmlData>) => void }) {
  return (
    <div className="space-y-3">
      <Field label="HTML / Embed Code">
        <textarea className={`${inp} resize-y font-mono text-xs`} rows={10} value={data.html} onChange={(e) => onChange({ html: e.target.value })} />
      </Field>
      <p className="text-[10px] text-zinc-400">Rendered as-is on the live page — only trusted admins should edit this.</p>
    </div>
  )
}
