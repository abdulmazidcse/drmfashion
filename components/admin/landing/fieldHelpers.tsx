"use client"

import { useState } from "react"
import { Loader2, X } from "lucide-react"
import api from "@/lib/axios"

export const inp = "w-full px-3 py-2 text-sm border border-zinc-200 rounded-md bg-white focus:outline-none focus:border-zinc-900 transition-colors"

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">{label}</label>
      {children}
    </div>
  )
}

/** Native colour swatch + hex text input, the pattern already used in app/(admin)/admin/colors/page.tsx. Empty value = "inherit from theme". */
export function ColorField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <Field label={label}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={value || placeholder || "#000000"}
          onChange={(e) => onChange(e.target.value)}
          className="w-8 h-8 rounded cursor-pointer border-0 shrink-0"
        />
        <input
          className={`${inp} flex-1`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder || "inherit"}
        />
      </div>
    </Field>
  )
}

const MAX_IMAGE_MB = 5

/** Upload-or-paste-URL image field, calling /upload directly like the landing-pages edit page already does for its banner image — no dependency on the Settings tab's MediaField/context. */
export function ImageField({ label, value, onChange, hint }: { label: string; value: string; onChange: (url: string) => void; hint?: string }) {
  const [uploading, setUploading] = useState(false)

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    if (file.size > MAX_IMAGE_MB * 1024 * 1024) {
      alert(`Image must be under ${MAX_IMAGE_MB}MB`)
      return
    }
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append("file", file)
      const res = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
      onChange(res.data.url)
    } catch {
      alert("Upload failed")
    } finally {
      setUploading(false)
    }
  }

  return (
    <Field label={label}>
      <div className="space-y-2">
        {value && (
          <div className="relative w-full h-28 rounded-md border border-zinc-200 overflow-hidden bg-zinc-50">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={value} alt="" className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onChange("")}
              className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
        <label className="flex items-center justify-center gap-2 border border-dashed border-zinc-300 rounded-md py-2.5 text-xs font-bold text-zinc-500 cursor-pointer hover:border-zinc-400 transition-colors">
          {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
          {uploading ? "Uploading…" : value ? "Replace image" : "Upload image"}
          <input type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={uploading} />
        </label>
        {hint && <p className="text-[10px] text-zinc-400">{hint}</p>}
      </div>
    </Field>
  )
}

export function TextListField({
  label,
  items,
  onChange,
  placeholder,
  max = 40,
}: {
  label: string
  items: string[]
  onChange: (items: string[]) => void
  placeholder?: string
  max?: number
}) {
  return (
    <Field label={label}>
      <div className="space-y-2">
        {items.map((item, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              className={`${inp} flex-1`}
              value={item}
              placeholder={placeholder}
              onChange={(e) => onChange(items.map((v, idx) => (idx === i ? e.target.value : v)))}
            />
            <button
              type="button"
              onClick={() => onChange(items.filter((_, idx) => idx !== i))}
              className="w-8 h-8 flex items-center justify-center rounded-md border border-zinc-200 text-zinc-400 hover:text-red-600 hover:border-red-200 transition-colors shrink-0"
            >
              ×
            </button>
          </div>
        ))}
        {items.length < max && (
          <button
            type="button"
            onClick={() => onChange([...items, ""])}
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            + Add
          </button>
        )}
      </div>
    </Field>
  )
}
