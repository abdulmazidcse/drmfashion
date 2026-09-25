"use client"
import type { GalleryData } from "@/lib/landing/sections"
import { Field, inp, ImageField } from "@/components/admin/landing/fieldHelpers"

const MAX_IMAGES = 12

export function GallerySettings({ data, onChange }: { data: GalleryData; onChange: (patch: Partial<GalleryData>) => void }) {
  function setImage(i: number, url: string) {
    onChange({ images: data.images.map((v, idx) => (idx === i ? url : v)) })
  }
  function removeImage(i: number) {
    onChange({ images: data.images.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4">
      <Field label="Title (optional)">
        <input className={inp} value={data.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <Field label="Columns">
        <select className={inp} value={data.columns} onChange={(e) => onChange({ columns: Number(e.target.value) as GalleryData["columns"] })}>
          {[1, 2, 3, 4].map((n) => (
            <option key={n} value={n}>{n}</option>
          ))}
        </select>
      </Field>
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">Images ({data.images.length})</label>
        {data.images.map((src, i) => (
          <div key={i} className="relative">
            <ImageField label={`Image ${i + 1}`} value={src} onChange={(url) => setImage(i, url)} />
            <button
              type="button"
              onClick={() => removeImage(i)}
              className="absolute top-0 right-0 text-[10px] font-bold uppercase text-zinc-400 hover:text-red-600"
            >
              Remove
            </button>
          </div>
        ))}
        {data.images.length < MAX_IMAGES && (
          <button
            type="button"
            onClick={() => onChange({ images: [...data.images, ""] })}
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            + Add image
          </button>
        )}
      </div>
    </div>
  )
}
