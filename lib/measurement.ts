/**
 * Made-to-measure pricing and validation.
 *
 * Shared by the storefront (live price preview) and the checkout route
 * (authoritative recompute). The checkout ALWAYS re-derives the fee from the
 * database — values posted by the browser are only ever used as the raw
 * measurement input, never as a price.
 */

export type SurchargeType = "FLAT" | "PERCENT"

/**
 * One price bracket on a field — "Waist 41-42 → +$50". Both ends are inclusive,
 * so a 0.5-step field wants brackets like 39–40.5 rather than 39–40.
 */
export type MeasurementTierSpec = {
  minValue: number
  maxValue: number
  surchargeType: SurchargeType
  surchargeValue: number
  position?: number
}

export type MeasurementFieldSpec = {
  key: string
  label: string
  unit: string
  required: boolean
  minValue: number | null
  maxValue: number | null
  step?: number
  helpText?: string | null
  placeholder?: string | null
  /** Size-based upcharges. Absent/empty means the field adds nothing. */
  tiers?: MeasurementTierSpec[]
}

/** Surcharge config, already resolved from product override → template default. */
export type SurchargeSpec = {
  surchargeType: SurchargeType
  surchargeValue: number
}

export type MeasurementValue = {
  key: string
  label: string
  value: number
  unit: string
}

/** One priced line inside the made-to-measure fee. */
export type FeeLine = {
  label: string
  amount: number
}

/** Snapshot stored on OrderItem.customMeasurements. */
export type MeasurementSnapshot = {
  templateId: string
  templateName: string
  values: MeasurementValue[]
  /** How OrderItem.customFee was arrived at, frozen at order time. */
  feeBreakdown?: FeeLine[]
}

/** Money rounding — two decimals, no floating-point residue. */
export function roundMoney(amount: number): number {
  return Math.round((amount + Number.EPSILON) * 100) / 100
}

/**
 * A product may override the template's surcharge. Both fields must be present
 * on the product for the override to apply, otherwise the template wins.
 */
export function resolveSurcharge(
  product: { customSurchargeType?: SurchargeType | null; customSurchargeValue?: number | null } | null | undefined,
  template: { surchargeType: SurchargeType; surchargeValue: number } | null | undefined
): SurchargeSpec {
  if (product?.customSurchargeType && product.customSurchargeValue != null) {
    return { surchargeType: product.customSurchargeType, surchargeValue: product.customSurchargeValue }
  }
  if (template) {
    return { surchargeType: template.surchargeType, surchargeValue: template.surchargeValue }
  }
  return { surchargeType: "FLAT", surchargeValue: 0 }
}

/** FLAT → the value itself; PERCENT → that share of the unit price. */
function applySurcharge(unitPrice: number, type: SurchargeType, rawValue: unknown): number {
  const value = Number(rawValue) || 0
  if (value <= 0) return 0

  const fee = type === "PERCENT" ? (unitPrice * value) / 100 : value
  return roundMoney(Math.max(0, fee))
}

/** "39–40 in" — how a bracket is named in the admin table and on the invoice. */
export function tierRangeLabel(tier: MeasurementTierSpec, unit?: string): string {
  return `${tier.minValue}–${tier.maxValue}${unit ? ` ${unit}` : ""}`
}

/**
 * The bracket a measured value falls into, or null when it falls outside every
 * bracket (which costs nothing extra). Brackets are not allowed to overlap, but
 * if a stale row ever does, the lowest `position` wins.
 */
export function matchTier(
  tiers: MeasurementTierSpec[] | undefined | null,
  value: number
): MeasurementTierSpec | null {
  if (!tiers?.length || !Number.isFinite(value)) return null

  return (
    [...tiers]
      .sort((a, b) => (a.position ?? 0) - (b.position ?? 0) || a.minValue - b.minValue)
      .find((tier) => value >= tier.minValue && value <= tier.maxValue) ?? null
  )
}

/**
 * The tailoring fee added to ONE unit, itemised:
 *   base tailoring fee (template, or the product's override)
 * + one size upcharge per field whose value lands in a priced bracket
 *
 * `fields` and `values` are optional so callers that only price the base fee
 * (the admin product form, a badge on a listing) can keep passing two args.
 */
export function calculateCustomFeeBreakdown(
  unitPrice: number,
  surcharge: SurchargeSpec,
  fields?: MeasurementFieldSpec[] | null,
  values?: MeasurementValue[] | null
): { total: number; lines: FeeLine[] } {
  const lines: FeeLine[] = []

  const base = applySurcharge(unitPrice, surcharge.surchargeType, surcharge.surchargeValue)
  if (base > 0) lines.push({ label: "Tailoring fee", amount: base })

  if (fields?.length && values?.length) {
    for (const field of fields) {
      if (!field.tiers?.length) continue

      const measured = values.find((v) => v.key === field.key)
      if (!measured) continue

      const tier = matchTier(field.tiers, Number(measured.value))
      if (!tier) continue

      const amount = applySurcharge(unitPrice, tier.surchargeType, tier.surchargeValue)
      if (amount > 0) {
        lines.push({ label: `${field.label} ${tierRangeLabel(tier, field.unit)}`, amount })
      }
    }
  }

  return { total: roundMoney(lines.reduce((sum, line) => sum + line.amount, 0)), lines }
}

/** The tailoring fee added to ONE unit of a product. */
export function calculateCustomFee(
  unitPrice: number,
  surcharge: SurchargeSpec,
  fields?: MeasurementFieldSpec[] | null,
  values?: MeasurementValue[] | null
): number {
  return calculateCustomFeeBreakdown(unitPrice, surcharge, fields, values).total
}

/** Human-readable label for storefront badges: "+৳500" / "+15%". */
export function describeSurcharge(surcharge: SurchargeSpec, formatPrice: (n: number) => string): string {
  if (!surcharge.surchargeValue) return "Free"
  return surcharge.surchargeType === "PERCENT"
    ? `+${surcharge.surchargeValue}%`
    : `+${formatPrice(surcharge.surchargeValue)}`
}

/**
 * Normalises the made-to-measure block posted by the product admin form into
 * exactly the columns Product stores. Shared by the create and update routes so
 * both apply the same rules.
 */
export function parseCustomMeasurementInput(body: {
  customMeasurementEnabled?: unknown
  measurementTemplateId?: unknown
  customSurchargeType?: unknown
  customSurchargeValue?: unknown
}): {
  customMeasurementEnabled: boolean
  measurementTemplateId: string | null
  customSurchargeType: SurchargeType | null
  customSurchargeValue: number | null
} {
  const templateId = String(body.measurementTemplateId || "").trim() || null
  // Without a template there are no fields to fill, so the feature stays off.
  const enabled = Boolean(body.customMeasurementEnabled) && templateId !== null

  if (!enabled) {
    return {
      customMeasurementEnabled: false,
      measurementTemplateId: null,
      customSurchargeType: null,
      customSurchargeValue: null,
    }
  }

  const type = body.customSurchargeType === "PERCENT" || body.customSurchargeType === "FLAT"
    ? (body.customSurchargeType as SurchargeType)
    : null
  const rawValue = Number(body.customSurchargeValue)
  const hasValue = body.customSurchargeValue !== "" && body.customSurchargeValue !== null &&
    body.customSurchargeValue !== undefined && Number.isFinite(rawValue) && rawValue >= 0

  // An override only counts when BOTH halves are present, otherwise the
  // template's own surcharge applies.
  const overriding = type !== null && hasValue

  return {
    customMeasurementEnabled: true,
    measurementTemplateId: templateId,
    customSurchargeType: overriding ? type : null,
    customSurchargeValue: overriding ? rawValue : null,
  }
}

/**
 * Normalises the price-bracket rows posted by the admin field form. Rows left
 * completely blank are dropped so an empty "add another" row is not an error.
 * Overlapping brackets are rejected — otherwise which one applies would depend
 * on row order, which the admin cannot see.
 *
 * `bounds` is the field's own allowed range: a bracket outside it can never be
 * reached, so it is rejected rather than saved as dead configuration.
 */
export function parseTiersInput(
  raw: unknown,
  bounds?: { minValue: number | null; maxValue: number | null }
): { ok: true; tiers: MeasurementTierSpec[] } | { ok: false; error: string } {
  if (raw === undefined || raw === null) return { ok: true, tiers: [] }
  if (!Array.isArray(raw)) return { ok: false, error: "Price tiers must be a list." }

  const tiers: MeasurementTierSpec[] = []
  const blank = (v: unknown) => v === undefined || v === null || String(v).trim() === ""

  for (const [index, entry] of raw.entries()) {
    if (!entry || typeof entry !== "object") continue
    const row = entry as Record<string, unknown>

    if (blank(row.minValue) && blank(row.maxValue) && blank(row.surchargeValue)) continue

    const minValue = Number(row.minValue)
    const maxValue = Number(row.maxValue)
    if (!Number.isFinite(minValue) || !Number.isFinite(maxValue)) {
      return { ok: false, error: `Price tier ${index + 1}: min and max are both required.` }
    }
    if (minValue > maxValue) {
      return { ok: false, error: `Price tier ${index + 1}: min cannot be greater than max.` }
    }

    if (bounds?.minValue != null && maxValue < bounds.minValue) {
      return {
        ok: false,
        error: `Price tier ${index + 1} (${minValue}–${maxValue}) is below the field's allowed minimum of ${bounds.minValue}, so it could never apply.`,
      }
    }
    if (bounds?.maxValue != null && minValue > bounds.maxValue) {
      return {
        ok: false,
        error: `Price tier ${index + 1} (${minValue}–${maxValue}) is above the field's allowed maximum of ${bounds.maxValue}, so it could never apply.`,
      }
    }

    const surchargeValue = Number(row.surchargeValue)
    if (!Number.isFinite(surchargeValue) || surchargeValue < 0) {
      return { ok: false, error: `Price tier ${index + 1}: upcharge must be zero or more.` }
    }

    tiers.push({
      minValue,
      maxValue,
      surchargeType: row.surchargeType === "PERCENT" ? "PERCENT" : "FLAT",
      surchargeValue,
      position: Number.isFinite(Number(row.position)) ? Number(row.position) : index,
    })
  }

  const sorted = [...tiers].sort((a, b) => a.minValue - b.minValue)
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].minValue <= sorted[i - 1].maxValue) {
      return {
        ok: false,
        error: `Price tiers overlap: ${tierRangeLabel(sorted[i - 1])} and ${tierRangeLabel(sorted[i])}.`,
      }
    }
  }

  return { ok: true, tiers: sorted.map((tier, i) => ({ ...tier, position: i })) }
}

export type ValidationResult =
  | { ok: true; values: MeasurementValue[] }
  | { ok: false; error: string; fieldKey?: string }

/**
 * Validates raw customer input against a template's fields.
 * Runs on both sides: instant feedback in the browser, enforcement at checkout.
 */
export function validateMeasurements(
  fields: MeasurementFieldSpec[],
  raw: Record<string, unknown>
): ValidationResult {
  const values: MeasurementValue[] = []

  for (const field of fields) {
    const rawValue = raw?.[field.key]
    const isBlank = rawValue === undefined || rawValue === null || String(rawValue).trim() === ""

    if (isBlank) {
      if (field.required) {
        return { ok: false, error: `${field.label} is required.`, fieldKey: field.key }
      }
      continue
    }

    const value = Number(rawValue)
    if (!Number.isFinite(value) || value <= 0) {
      return { ok: false, error: `${field.label} must be a positive number.`, fieldKey: field.key }
    }

    if (field.minValue != null && value < field.minValue) {
      return {
        ok: false,
        error: `${field.label} must be at least ${field.minValue}${field.unit}.`,
        fieldKey: field.key,
      }
    }

    if (field.maxValue != null && value > field.maxValue) {
      return {
        ok: false,
        error: `${field.label} must be ${field.maxValue}${field.unit} or less.`,
        fieldKey: field.key,
      }
    }

    values.push({ key: field.key, label: field.label, value, unit: field.unit })
  }

  if (values.length === 0) {
    return { ok: false, error: "Enter at least one measurement." }
  }

  return { ok: true, values }
}

/**
 * Stable fingerprint of a measurement set, appended to the cart line id so two
 * orders of the same garment with different measurements stay separate lines.
 */
export function measurementFingerprint(values: MeasurementValue[]): string {
  const normalized = [...values]
    .sort((a, b) => a.key.localeCompare(b.key))
    .map((v) => `${v.key}:${v.value}`)
    .join("|")

  // Small, deterministic, non-cryptographic hash (djb2) — only needs to be a
  // collision-resistant-enough key for localStorage cart lines.
  let hash = 5381
  for (let i = 0; i < normalized.length; i++) {
    hash = ((hash << 5) + hash + normalized.charCodeAt(i)) | 0
  }
  return Math.abs(hash).toString(36)
}

/** "Shoulder 18in · Chest 42in" — used in cart lines and order emails. */
export function summarizeMeasurements(values: MeasurementValue[]): string {
  return values.map((v) => `${v.label} ${v.value}${v.unit}`).join(" · ")
}
