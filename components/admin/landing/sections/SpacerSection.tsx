"use client"
import type { SpacerData } from "@/lib/landing/sections"
import { Field, inp } from "@/components/admin/landing/fieldHelpers"

export function SpacerSettings({ data, onChange }: { data: SpacerData; onChange: (patch: Partial<SpacerData>) => void }) {
  return (
    <Field label={`Height: ${data.height}px`}>
      <input
        type="range"
        min={0}
        max={400}
        value={data.height}
        onChange={(e) => onChange({ height: Number(e.target.value) })}
        className="w-full accent-zinc-900"
      />
      <input
        type="number"
        className={`${inp} mt-2`}
        min={0}
        max={400}
        value={data.height}
        onChange={(e) => onChange({ height: Math.max(0, Math.min(400, Number(e.target.value) || 0)) })}
      />
    </Field>
  )
}
