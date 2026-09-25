"use client"
import type { PricingData } from "@/lib/landing/sections"
import { Field, inp } from "@/components/admin/landing/fieldHelpers"

export function PricingSettings({ data, onChange }: { data: PricingData; onChange: (patch: Partial<PricingData>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Title">
        <input className={inp} value={data.title} onChange={(e) => onChange({ title: e.target.value })} />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Regular Label">
          <input className={inp} value={data.regularLabel} onChange={(e) => onChange({ regularLabel: e.target.value })} />
        </Field>
        <Field label="Regular Price">
          <input className={inp} value={data.regularPrice} onChange={(e) => onChange({ regularPrice: e.target.value })} />
        </Field>
        <Field label="Offer Label">
          <input className={inp} value={data.offerLabel} onChange={(e) => onChange({ offerLabel: e.target.value })} />
        </Field>
        <Field label="Offer Price">
          <input className={inp} value={data.offerPrice} onChange={(e) => onChange({ offerPrice: e.target.value })} />
        </Field>
      </div>
      <Field label="Note">
        <input className={inp} value={data.note} onChange={(e) => onChange({ note: e.target.value })} placeholder="Stock limited — order today" />
      </Field>
      <Field label="Button Text (links to the Order section)">
        <input className={inp} value={data.buttonText} onChange={(e) => onChange({ buttonText: e.target.value })} />
      </Field>
    </div>
  )
}
