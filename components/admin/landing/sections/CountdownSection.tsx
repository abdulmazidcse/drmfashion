"use client"
import type { CountdownData } from "@/lib/landing/sections"
import { Field, inp, ColorField } from "@/components/admin/landing/fieldHelpers"

/** <input type="datetime-local"> wants "YYYY-MM-DDTHH:mm" in local time, with no trailing "Z". */
function toLocalInputValue(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function CountdownSettings({ data, onChange }: { data: CountdownData; onChange: (patch: Partial<CountdownData>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Title">
        <input className={inp} value={data.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Subtitle">
        <input className={inp} value={data.subtitle} onChange={(e) => onChange({ subtitle: e.target.value })} />
      </Field>
      <Field label="Mode">
        <select className={inp} value={data.mode} onChange={(e) => onChange({ mode: e.target.value as CountdownData["mode"] })}>
          <option value="evergreen">Evergreen — restarts per visitor</option>
          <option value="fixed">Fixed — same deadline for everyone</option>
        </select>
      </Field>
      {data.mode === "fixed" ? (
        <Field label="Ends At">
          <input
            type="datetime-local"
            className={inp}
            value={toLocalInputValue(data.endAt)}
            onChange={(e) => onChange({ endAt: e.target.value ? new Date(e.target.value).toISOString() : "" })}
          />
        </Field>
      ) : (
        <Field label="Hours until it restarts">
          <input
            type="number"
            min={1}
            max={720}
            className={inp}
            value={data.evergreenHours}
            onChange={(e) => onChange({ evergreenHours: Math.max(1, Number(e.target.value) || 24) })}
          />
        </Field>
      )}
      <div className="grid grid-cols-2 gap-3">
        <ColorField label="Box Colour" value={data.boxColor} onChange={(v) => onChange({ boxColor: v })} placeholder="theme primary" />
        <ColorField label="Text Colour" value={data.boxTextColor} onChange={(v) => onChange({ boxTextColor: v })} placeholder="theme text" />
      </div>
    </div>
  )
}
