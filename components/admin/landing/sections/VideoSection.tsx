"use client"
import type { VideoData } from "@/lib/landing/sections"
import { Field, inp } from "@/components/admin/landing/fieldHelpers"

export function VideoSettings({ data, onChange }: { data: VideoData; onChange: (patch: Partial<VideoData>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Title (optional)">
        <input className={inp} value={data.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="YouTube or Facebook URL">
        <input className={inp} value={data.url} onChange={(e) => onChange({ url: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
      </Field>
    </div>
  )
}
