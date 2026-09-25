"use client"
import type { FaqData } from "@/lib/landing/sections"
import { Field, inp } from "@/components/admin/landing/fieldHelpers"

const MAX_ITEMS = 30

export function FaqSettings({ data, onChange }: { data: FaqData; onChange: (patch: Partial<FaqData>) => void }) {
  function setItem(i: number, patch: Partial<FaqData["items"][number]>) {
    onChange({ items: data.items.map((v, idx) => (idx === i ? { ...v, ...patch } : v)) })
  }
  function removeItem(i: number) {
    onChange({ items: data.items.filter((_, idx) => idx !== i) })
  }

  return (
    <div className="space-y-4">
      <Field label="Title">
        <input className={inp} value={data.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <div className="space-y-3">
        <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 block">Questions</label>
        {data.items.map((item, i) => (
          <div key={i} className="border border-zinc-200 rounded-md p-3 space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Q{i + 1}</span>
              <button type="button" onClick={() => removeItem(i)} className="text-[10px] font-bold uppercase text-zinc-400 hover:text-red-600">
                Remove
              </button>
            </div>
            <input className={inp} placeholder="Question" value={item.q} onChange={(e) => setItem(i, { q: e.target.value })} />
            <textarea className={`${inp} resize-none`} rows={2} placeholder="Answer" value={item.a} onChange={(e) => setItem(i, { a: e.target.value })} />
          </div>
        ))}
        {data.items.length < MAX_ITEMS && (
          <button
            type="button"
            onClick={() => onChange({ items: [...data.items, { q: "", a: "" }] })}
            className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-900 transition-colors"
          >
            + Add question
          </button>
        )}
      </div>
    </div>
  )
}
