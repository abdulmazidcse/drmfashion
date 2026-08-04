/**
 * Made-to-measure pricing and validation.
 *
 * Shared by the storefront (live price preview) and the checkout route
 * (authoritative recompute). The checkout ALWAYS re-derives the fee from the
 * database — values posted by the browser are only ever used as the raw
 * measurement input, never as a price.
 */

export type SurchargeType = "FLAT" | "PERCENT"

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

/** Snapshot stored on OrderItem.customMeasurements. */
export type MeasurementSnapshot = {
  templateId: string
  templateName: string
  values: MeasurementValue[]
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

/** The tailoring fee added to ONE unit of a product. */
export function calculateCustomFee(unitPrice: number, surcharge: SurchargeSpec): number {
  const value = Number(surcharge.surchargeValue) || 0
  if (value <= 0) return 0

  const fee = surcharge.surchargeType === "PERCENT" ? (unitPrice * value) / 100 : value
  return roundMoney(Math.max(0, fee))
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
