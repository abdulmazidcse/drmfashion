"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Info, PencilRuler } from "lucide-react"
import { useCurrency } from "@/providers/CurrencyProvider"
import {
  calculateCustomFeeBreakdown,
  matchTier,
  tierRangeLabel,
  validateMeasurements,
  type FeeLine,
  type MeasurementFieldSpec,
  type MeasurementValue,
  type SurchargeSpec,
} from "@/lib/measurement"

export type MeasurementTemplateView = {
  id: string
  name: string
  instructions: string | null
  fields: MeasurementFieldSpec[]
}

export type CustomMeasurementState = {
  active: boolean
  valid: boolean
  fee: number
  values: MeasurementValue[]
  error: string | null
  feeBreakdown: FeeLine[]
}

/**
 * Made-to-measure input on the product page. Reports its state upward so the
 * add-to-bag button can price the line and block on invalid measurements.
 * The fee shown is a preview — checkout recomputes it server-side.
 */
export default function CustomMeasurementForm({
  template,
  surcharge,
  unitPrice,
  onChange,
}: {
  template: MeasurementTemplateView
  surcharge: SurchargeSpec
  unitPrice: number
  onChange: (state: CustomMeasurementState) => void
}) {
  const { formatPrice } = useCurrency()
  const [active, setActive] = useState(false)
  const [raw, setRaw] = useState<Record<string, string>>({})
  const [touched, setTouched] = useState(false)

  const validation = useMemo(() => validateMeasurements(template.fields, raw), [template.fields, raw])

  // Size upcharges depend on what has been typed so far, so the fee is derived
  // from whatever currently parses — not only from a fully valid form.
  const enteredValues = useMemo<MeasurementValue[]>(
    () =>
      template.fields
        .map((field) => ({ field, value: Number(raw[field.key]) }))
        .filter(({ value }) => Number.isFinite(value) && value > 0)
        .map(({ field, value }) => ({ key: field.key, label: field.label, value, unit: field.unit })),
    [template.fields, raw]
  )

  // Keyed on the surcharge's values, not the object: the parent rebuilds it
  // every render, and an unstable breakdown array would loop the effect below.
  const { total: fee, lines: feeBreakdown } = useMemo(
    () => calculateCustomFeeBreakdown(unitPrice, surcharge, template.fields, enteredValues),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [unitPrice, surcharge.surchargeType, surcharge.surchargeValue, template.fields, enteredValues]
  )

  useEffect(() => {
    onChange({
      active,
      valid: !active || validation.ok,
      fee: active ? fee : 0,
      values: active && validation.ok ? validation.values : [],
      error: active && !validation.ok && touched ? validation.error : null,
      feeBreakdown: active ? feeBreakdown : [],
    })
    // onChange is recreated each render by the parent; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, fee, feeBreakdown, validation, touched])

  // Until a size-priced field is filled in, the headline fee is a starting
  // point rather than the final number.
  const pending = template.fields.some(
    (f) => f.tiers?.length && !enteredValues.some((v) => v.key === f.key)
  )

  const feeLabel = pending
    ? `From +${formatPrice(fee)}`
    : fee <= 0
      ? "Free"
      : surcharge.surchargeType === "PERCENT" && feeBreakdown.length === 1
        ? `+${surcharge.surchargeValue}% (${formatPrice(fee)})`
        : `+${formatPrice(fee)}`

  return (
    <div className="mt-6 border border-zinc-200">
      <label className="flex cursor-pointer items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-zinc-950"
        />
        <span className="flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <PencilRuler className="h-4 w-4 text-zinc-400" />
            <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-zinc-950">
              Made to measure
            </span>
            <span className="bg-zinc-950 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white">
              {feeLabel}
            </span>
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-zinc-500">
            Tailored to your own {template.name.toLowerCase()} measurements instead of a standard size.
          </span>
        </span>
      </label>

      {active && (
        <div className="border-t border-zinc-200 bg-[#fafafa] p-4">
          {template.instructions && (
            <p className="mb-4 flex gap-2 text-[12px] leading-relaxed text-zinc-600">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-zinc-400" />
              {template.instructions}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {template.fields.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`mtm-${field.key}`}
                  className="mb-1.5 block text-[10px] font-bold uppercase tracking-widest text-zinc-500"
                >
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                  <span className="ml-1 font-medium normal-case tracking-normal text-zinc-400">({field.unit})</span>
                </label>
                <input
                  id={`mtm-${field.key}`}
                  type="number"
                  inputMode="decimal"
                  step={field.step || 0.5}
                  min={field.minValue ?? undefined}
                  max={field.maxValue ?? undefined}
                  value={raw[field.key] ?? ""}
                  onChange={(e) => {
                    setTouched(true)
                    setRaw((prev) => ({ ...prev, [field.key]: e.target.value }))
                  }}
                  placeholder={field.placeholder || (field.minValue != null ? String(field.minValue) : "0")}
                  className="w-full border border-zinc-200 bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-zinc-950"
                />
                {field.helpText && <p className="mt-1 text-[11px] leading-snug text-zinc-400">{field.helpText}</p>}
                {(field.minValue != null || field.maxValue != null) && (
                  <p className="mt-1 text-[11px] text-zinc-400">
                    {field.minValue ?? "—"}–{field.maxValue ?? "—"} {field.unit}
                  </p>
                )}

                {field.tiers && field.tiers.length > 0 && (() => {
                  const entered = Number(raw[field.key])
                  const activeTier = matchTier(field.tiers, entered)

                  return (
                    <table className="mt-2 w-full border-collapse text-[11px]">
                      <tbody>
                        {field.tiers.map((tier, i) => {
                          const on = activeTier === tier
                          return (
                            <tr
                              key={i}
                              className={`border border-zinc-200 ${on ? "bg-zinc-950 text-white" : "text-zinc-500"}`}
                            >
                              <td className="px-2 py-1">{tierRangeLabel(tier, field.unit)}</td>
                              <td className="px-2 py-1 text-right font-semibold">
                                +
                                {tier.surchargeType === "PERCENT"
                                  ? `${tier.surchargeValue}%`
                                  : formatPrice(tier.surchargeValue)}
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  )
                })()}
              </div>
            ))}
          </div>

          {feeBreakdown.length > 1 && (
            <dl className="mt-4 space-y-1 border-t border-zinc-200 pt-3 text-[12px]">
              {feeBreakdown.map((line, i) => (
                <div key={i} className="flex justify-between gap-3 text-zinc-500">
                  <dt>{line.label}</dt>
                  <dd className="font-medium text-zinc-700">+{formatPrice(line.amount)}</dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t border-zinc-200 pt-1 font-semibold text-zinc-950">
                <dt>Made-to-measure</dt>
                <dd>+{formatPrice(fee)}</dd>
              </div>
            </dl>
          )}

          {touched && !validation.ok && (
            <p className="mt-3 text-[12px] font-medium text-red-600">{validation.error}</p>
          )}

          {validation.ok && (
            <p className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              Measurements ready · {formatPrice(unitPrice + fee)} per item
            </p>
          )}

          <p className="mt-4 border-t border-zinc-200 pt-3 text-[11px] leading-relaxed text-zinc-500">
            Made-to-measure items are cut to order and cannot be returned or exchanged.
          </p>
        </div>
      )}
    </div>
  )
}
