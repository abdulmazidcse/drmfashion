"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ExternalLink, PencilRuler } from "lucide-react"
import api from "@/lib/axios"
import { useCurrency } from "@/providers/CurrencyProvider"
import { calculateCustomFee, resolveSurcharge, roundMoney, type SurchargeType } from "@/lib/measurement"

export type CustomMeasurementValue = {
  customMeasurementEnabled: boolean
  measurementTemplateId: string
  customSurchargeType: SurchargeType | ""
  customSurchargeValue: number | ""
}

type TemplateOption = {
  id: string
  name: string
  active: boolean
  surchargeType: SurchargeType
  surchargeValue: number
  fields: { id: string; label: string }[]
}

const inputClass =
  "w-full border border-zinc-200 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition bg-zinc-50/30 hover:bg-zinc-50/50 focus:bg-white text-sm font-medium text-zinc-900 placeholder:text-zinc-400"

/**
 * Made-to-measure settings for a product: whether custom measurements are
 * offered, which garment template drives the fields, and an optional surcharge
 * override. The fee shown here is a preview — checkout recomputes it from the
 * database at order time.
 */
export default function CustomMeasurementSection({
  value,
  onChange,
  basePrice,
}: {
  value: CustomMeasurementValue
  onChange: (next: Partial<CustomMeasurementValue>) => void
  basePrice: number
}) {
  const { formatBasePrice } = useCurrency()
  const [templates, setTemplates] = useState<TemplateOption[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    api
      .get("/admin/measurements")
      .then((res) => {
        if (active) setTemplates(Array.isArray(res.data) ? res.data : [])
      })
      .catch((err) => {
        console.error(err)
        if (active) setTemplates([])
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const template = templates.find((t) => t.id === value.measurementTemplateId) || null
  const overriding = value.customSurchargeType !== "" && value.customSurchargeValue !== ""

  const surcharge = resolveSurcharge(
    overriding
      ? {
          customSurchargeType: value.customSurchargeType as SurchargeType,
          customSurchargeValue: Number(value.customSurchargeValue),
        }
      : null,
    template
  )

  const price = Number(basePrice) || 0
  const fee = calculateCustomFee(price, surcharge)

  const toggleOverride = (on: boolean) => {
    if (on) {
      onChange({
        customSurchargeType: template?.surchargeType || "FLAT",
        customSurchargeValue: template?.surchargeValue ?? 0,
      })
    } else {
      onChange({ customSurchargeType: "", customSurchargeValue: "" })
    }
  }

  return (
    <div className="mt-4 border-t border-zinc-100 pt-4">
      <label className="flex cursor-pointer items-center gap-2">
        <input
          type="checkbox"
          checked={value.customMeasurementEnabled}
          onChange={(e) => onChange({ customMeasurementEnabled: e.target.checked })}
          className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
        />
        <span className="flex items-center gap-1.5 text-xs font-semibold text-zinc-700">
          <PencilRuler className="h-3.5 w-3.5 text-zinc-400" />
          Custom Measurement (made-to-measure)
        </span>
      </label>

      {value.customMeasurementEnabled && (
        <div className="mt-4 space-y-4 rounded-xl border border-zinc-200 bg-zinc-50/50 p-4">
          {loading ? (
            <p className="text-xs text-zinc-500">Loading garment types…</p>
          ) : templates.length === 0 ? (
            <p className="text-xs text-zinc-600">
              No garment types defined yet.{" "}
              <Link href="/admin/measurements" target="_blank" className="font-semibold underline">
                Create one first
              </Link>
              .
            </p>
          ) : (
            <>
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Garment Type</label>
                <select
                  value={value.measurementTemplateId}
                  onChange={(e) => onChange({ measurementTemplateId: e.target.value })}
                  className={inputClass}
                >
                  <option value="">Select a garment type…</option>
                  {templates.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                      {t.active ? "" : " (inactive)"} — {t.fields.length} measurement
                      {t.fields.length === 1 ? "" : "s"}
                    </option>
                  ))}
                </select>
                {template && (
                  <p className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[11px] text-zinc-500">
                    Fields: {template.fields.map((f) => f.label).join(", ") || "none yet"}
                    <Link
                      href="/admin/measurements"
                      target="_blank"
                      className="inline-flex items-center gap-1 font-semibold text-zinc-700 underline"
                    >
                      Edit <ExternalLink className="h-3 w-3" />
                    </Link>
                  </p>
                )}
              </div>

              <label className="flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={overriding}
                  onChange={(e) => toggleOverride(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-300 text-primary focus:ring-primary"
                />
                <span className="text-xs font-semibold text-zinc-700">
                  Override the garment type&apos;s tailoring fee for this product
                </span>
              </label>

              {overriding && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-600">Fee Type</label>
                    <select
                      value={value.customSurchargeType}
                      onChange={(e) => onChange({ customSurchargeType: e.target.value as SurchargeType })}
                      className={inputClass}
                    >
                      <option value="FLAT">Flat amount</option>
                      <option value="PERCENT">% of price</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1.5 block text-xs font-semibold text-zinc-600">
                      {value.customSurchargeType === "PERCENT" ? "Percent" : "Amount"}
                    </label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={value.customSurchargeValue}
                      onChange={(e) =>
                        onChange({ customSurchargeValue: e.target.value === "" ? "" : Number(e.target.value) })
                      }
                      className={inputClass}
                    />
                  </div>
                </div>
              )}

              {template && (
                <div className="rounded-lg border border-zinc-200 bg-white px-4 py-3">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Customer Pays</p>
                  <p className="mt-1 text-sm text-zinc-700">
                    <span className="font-semibold text-zinc-900">{formatBasePrice(roundMoney(price))}</span>
                    <span className="text-zinc-400"> + </span>
                    <span className="font-semibold text-zinc-900">{formatBasePrice(fee)}</span>
                    <span className="text-zinc-400"> tailoring </span>
                    <span className="text-zinc-400">= </span>
                    <span className="font-bold text-zinc-950">{formatBasePrice(roundMoney(price + fee))}</span>
                    <span className="ml-2 text-[11px] text-zinc-400">
                      ({surcharge.surchargeType === "PERCENT" ? `${surcharge.surchargeValue}%` : "flat"}
                      {overriding ? ", product override" : ", from garment type"})
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}
