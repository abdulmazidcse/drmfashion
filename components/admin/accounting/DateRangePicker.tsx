"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export type Preset = "today" | "7d" | "30d" | "thisMonth" | "lastMonth" | "thisYear" | "custom"
export type DateRange = { from: string; to: string }

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "thisYear", label: "This year" },
  { value: "custom", label: "Custom" },
]

// Local calendar dates: the admin picks "today" on their own clock.
export function ymd(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

export function presetRange(preset: Preset): DateRange {
  const today = new Date()
  const start = new Date(today)
  switch (preset) {
    case "today":
      return { from: ymd(today), to: ymd(today) }
    case "7d":
      start.setDate(today.getDate() - 6)
      return { from: ymd(start), to: ymd(today) }
    case "thisMonth":
      return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) }
    case "lastMonth":
      return {
        from: ymd(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: ymd(new Date(today.getFullYear(), today.getMonth(), 0)),
      }
    case "thisYear":
      return { from: ymd(new Date(today.getFullYear(), 0, 1)), to: ymd(today) }
    default:
      start.setDate(today.getDate() - 29)
      return { from: ymd(start), to: ymd(today) }
  }
}

export const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
export const rangeValid = (r: DateRange) => isYmd(r.from) && isYmd(r.to) && r.from <= r.to

/** Preset buttons plus custom from/to inputs, shared by the accounting pages. */
export default function DateRangePicker({
  value,
  onChange,
  initialPreset = "thisMonth",
  label = "Period",
}: {
  value: DateRange
  onChange: (range: DateRange) => void
  initialPreset?: Preset
  label?: string
}) {
  const [preset, setPreset] = useState<Preset>(initialPreset)

  function choose(next: Preset) {
    setPreset(next)
    if (next !== "custom") onChange(presetRange(next))
  }

  return (
    <div className="space-y-2">
      <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">{label}</Label>
      <div className="flex flex-wrap gap-1.5">
        {PRESETS.map((p) => (
          <Button
            key={p.value}
            type="button"
            size="sm"
            variant={preset === p.value ? "default" : "outline"}
            onClick={() => choose(p.value)}
            className="text-xs"
          >
            {p.label}
          </Button>
        ))}
      </div>
      {preset === "custom" && (
        <div className="flex flex-wrap items-center gap-2">
          <Input type="date" value={value.from} max={value.to} onChange={(e) => onChange({ ...value, from: e.target.value })} className="w-auto bg-card" />
          <span className="text-xs text-muted-foreground">to</span>
          <Input type="date" value={value.to} min={value.from} onChange={(e) => onChange({ ...value, to: e.target.value })} className="w-auto bg-card" />
          {!rangeValid(value) && <span className="text-xs text-rose-600">Pick a valid start and end date.</span>}
        </div>
      )}
    </div>
  )
}
