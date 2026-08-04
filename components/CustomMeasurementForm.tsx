"use client"

import { useEffect, useMemo, useState } from "react"
import { Check, Info, PencilRuler } from "lucide-react"
import { useCurrency } from "@/providers/CurrencyProvider"
import {
  calculateCustomFee,
  validateMeasurements,
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

  const fee = useMemo(() => calculateCustomFee(unitPrice, surcharge), [unitPrice, surcharge])

  const validation = useMemo(() => validateMeasurements(template.fields, raw), [template.fields, raw])

  useEffect(() => {
    onChange({
      active,
      valid: !active || validation.ok,
      fee: active ? fee : 0,
      values: active && validation.ok ? validation.values : [],
      error: active && !validation.ok && touched ? validation.error : null,
    })
    // onChange is recreated each render by the parent; depending on it would loop.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, fee, validation, touched])

  const feeLabel =
    surcharge.surchargeValue <= 0
      ? "Free"
      : surcharge.surchargeType === "PERCENT"
        ? `+${surcharge.surchargeValue}% (${formatPrice(fee)})`
        : `+${formatPrice(fee)}`

  return (
    <div className="mt-6 border border-line">
      <label className="flex cursor-pointer items-start gap-3 p-4">
        <input
          type="checkbox"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="mt-0.5 h-4 w-4 accent-brand-600"
        />
        <span className="flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <PencilRuler className="h-4 w-4 text-faint" />
            <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-foreground">
              Made to measure
            </span>
            <span className="bg-brand-ink px-2 py-0.5 text-[11px] font-bold uppercase tracking-[0.14em] text-white">
              {feeLabel}
            </span>
          </span>
          <span className="mt-1 block text-[13px] leading-relaxed text-soft">
            Tailored to your own {template.name.toLowerCase()} measurements instead of a standard size.
          </span>
        </span>
      </label>

      {active && (
        <div className="border-t border-line bg-[#fafafa] p-4">
          {template.instructions && (
            <p className="mb-4 flex gap-2 text-[12px] leading-relaxed text-soft">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-faint" />
              {template.instructions}
            </p>
          )}

          <div className="grid grid-cols-2 gap-3">
            {template.fields.map((field) => (
              <div key={field.key}>
                <label
                  htmlFor={`mtm-${field.key}`}
                  className="mb-1.5 block text-[11px] font-bold uppercase tracking-[0.14em] text-soft"
                >
                  {field.label}
                  {field.required && <span className="text-red-500"> *</span>}
                  <span className="ml-1 font-medium normal-case tracking-normal text-faint">({field.unit})</span>
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
                  className="w-full border border-line bg-white px-3 py-2.5 text-sm outline-none transition-colors focus:border-aqua-400"
                />
                {field.helpText && <p className="mt-1 text-[11px] leading-snug text-faint">{field.helpText}</p>}
                {(field.minValue != null || field.maxValue != null) && (
                  <p className="mt-1 text-[11px] text-faint">
                    {field.minValue ?? "—"}–{field.maxValue ?? "—"} {field.unit}
                  </p>
                )}
              </div>
            ))}
          </div>

          {touched && !validation.ok && (
            <p className="mt-3 text-[12px] font-medium text-red-600">{validation.error}</p>
          )}

          {validation.ok && (
            <p className="mt-4 flex items-center gap-1.5 text-[12px] font-medium text-emerald-700">
              <Check className="h-3.5 w-3.5" />
              Measurements ready · {formatPrice(unitPrice + fee)} per item
            </p>
          )}

          <p className="mt-4 border-t border-line pt-3 text-[11px] leading-relaxed text-soft">
            Made-to-measure items are cut to order and cannot be returned or exchanged.
          </p>
        </div>
      )}
    </div>
  )
}
