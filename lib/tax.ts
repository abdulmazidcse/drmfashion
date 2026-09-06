// ─── Sales tax ───────────────────────────────────────────────────────────────
// Tax is charged by destination: an Ontario address pays 13% HST, an Alberta
// one pays 5% GST. The rates live as a JSON row in the `Setting` table
// (`tax_rates`), so the merchant adds a province or restates a rate from
// Admin → Settings → Tax without a migration or a deploy.
//
// Rates are percentages (13 means 13%), and the resolved rate is written onto
// the order alongside the amount. That snapshot is the point: a rate edited in
// 2027 must not silently restate what a 2026 invoice charged.
//
// As with shipping, the browser's arithmetic is for display only — every path
// that takes money recomputes from these same settings.
// ─────────────────────────────────────────────────────────────────────────────

export const TAX_RATES_KEY = "tax_rates"

/**
 * Stands in for "anywhere in this country" in a rate's `state`.
 *
 * Countries without a province list — and countries taxed at one national rate,
 * like UK VAT — have nothing sensible to put in that field, and requiring a
 * region would make them unconfigurable.
 */
export const TAX_STATE_ANY = "*"

export interface TaxRate {
  /** Stable slug, e.g. `ca-on`. */
  id: string
  /** ISO country code the address must match. */
  country: string
  /** Province/state code, matched case-insensitively, or `*` for the whole country. */
  state: string
  /** Shown on the invoice — "HST", "GST + PST", "Sales Tax". */
  label: string
  /** Percentage. 14.975 is Quebec's real combined rate, so decimals matter. */
  rate: number
  active: boolean
}

export interface TaxSettings {
  enabled: boolean
  /** Charge tax on the shipping fee as well as the goods. */
  onShipping: boolean
  /** Applied when the address matches no configured rate. */
  defaultRate: number
  defaultLabel: string
  rates: TaxRate[]
}

// The rates the client supplied. Canada is complete; the US list is only the
// states they named, because sales tax is owed solely where the business is
// registered — every other state is left for them to add deliberately.
export const DEFAULT_TAX_RATES: TaxRate[] = [
  { id: "ca-ab", country: "CA", state: "AB", label: "GST", rate: 5, active: true },
  { id: "ca-bc", country: "CA", state: "BC", label: "GST + PST", rate: 12, active: true },
  { id: "ca-mb", country: "CA", state: "MB", label: "GST + PST", rate: 12, active: true },
  { id: "ca-nb", country: "CA", state: "NB", label: "HST", rate: 15, active: true },
  { id: "ca-nl", country: "CA", state: "NL", label: "HST", rate: 15, active: true },
  { id: "ca-nt", country: "CA", state: "NT", label: "GST", rate: 5, active: true },
  { id: "ca-ns", country: "CA", state: "NS", label: "HST", rate: 14, active: true },
  { id: "ca-nu", country: "CA", state: "NU", label: "GST", rate: 5, active: true },
  { id: "ca-on", country: "CA", state: "ON", label: "HST", rate: 13, active: true },
  { id: "ca-pe", country: "CA", state: "PE", label: "HST", rate: 15, active: true },
  { id: "ca-qc", country: "CA", state: "QC", label: "GST + QST", rate: 14.975, active: true },
  { id: "ca-sk", country: "CA", state: "SK", label: "GST + PST", rate: 11, active: true },
  { id: "ca-yt", country: "CA", state: "YT", label: "GST", rate: 5, active: true },
  { id: "us-ca", country: "US", state: "CA", label: "Sales Tax", rate: 10.25, active: true },
  { id: "us-ny", country: "US", state: "NY", label: "Sales Tax", rate: 8.875, active: true },
  { id: "us-tx", country: "US", state: "TX", label: "Sales Tax", rate: 8.25, active: true },
  { id: "us-fl", country: "US", state: "FL", label: "Sales Tax", rate: 8, active: true },
  { id: "us-il", country: "US", state: "IL", label: "Sales Tax", rate: 11, active: true },
  { id: "us-wa", country: "US", state: "WA", label: "Sales Tax", rate: 10.5, active: true },
]

export const DEFAULT_TAX_SETTINGS: TaxSettings = {
  enabled: true,
  onShipping: true,
  defaultRate: 0,
  defaultLabel: "Tax",
  rates: DEFAULT_TAX_RATES,
}

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

export function taxRateId(country: string, state: string, fallback: string): string {
  const region = state === TAX_STATE_ANY ? "all" : state
  const slug = `${country}-${region}`.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return slug === "-" || !slug ? fallback : slug
}

export function parseTaxRates(raw: unknown): TaxRate[] {
  if (Array.isArray(raw)) return sanitise(raw)
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_TAX_RATES
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_TAX_RATES
    return sanitise(parsed)
  } catch {
    return DEFAULT_TAX_RATES
  }
}

function sanitise(rows: unknown[]): TaxRate[] {
  const seen = new Set<string>()
  const rates: TaxRate[] = []

  rows.forEach((raw, i) => {
    if (!raw || typeof raw !== "object") return
    const row = raw as Partial<Record<keyof TaxRate, unknown>>

    const country = String(row.country ?? "").trim().toUpperCase()
    const state = String(row.state ?? "").trim().toUpperCase()
    if (!country || !state) return

    let id = String(row.id ?? "").trim() || taxRateId(country, state, `rate-${i + 1}`)
    while (seen.has(id)) id = `${id}-${i + 1}`
    seen.add(id)

    const rate = Number(row.rate)
    rates.push({
      id,
      country,
      state,
      label: String(row.label ?? "").trim() || "Tax",
      rate: Number.isFinite(rate) && rate > 0 ? rate : 0,
      active: row.active !== false,
    })
  })

  // An empty list is a legitimate configuration — a merchant with no tax
  // obligations anywhere — so unlike shipping methods it is not replaced with
  // defaults. Only unparseable input falls back.
  return rates
}

/** Reads every tax setting out of a settings map. */
export function taxSettingsFromSettings(
  settings: Record<string, string> | undefined | null
): TaxSettings {
  const s = settings ?? {}
  const defaultRate = Number(s.tax_default_rate)

  return {
    enabled: s.tax_enabled !== "false",
    onShipping: s.tax_on_shipping !== "false",
    defaultRate: Number.isFinite(defaultRate) && defaultRate > 0 ? defaultRate : 0,
    defaultLabel: (s.tax_default_label || "").trim() || "Tax",
    rates: parseTaxRates(s[TAX_RATES_KEY]),
  }
}

export interface ResolvedTax {
  /** Percentage actually applied. */
  rate: number
  /** Invoice wording — "HST", "Sales Tax". */
  label: string
  /** Money owed, in base currency. */
  amount: number
  /** False when the address matched no rate and the default was used. */
  matched: boolean
}

export interface TaxInput {
  country?: string | null
  state?: string | null
  /** Goods total after discounts and redeemed points. */
  taxableAmount: number
  /** Charged too when `tax_on_shipping` is on — the rule in Canada. */
  shippingFee?: number
}

/**
 * Works out the tax for one destination.
 *
 * An unmatched address falls to the configured default rather than erroring:
 * the merchant decides whether that means 0% (no obligation there) or some
 * catch-all rate, and either way an order should not fail over it.
 */
export function resolveTax(settings: TaxSettings, input: TaxInput): ResolvedTax {
  const label = settings.defaultLabel
  if (!settings.enabled) {
    return { rate: 0, label, amount: 0, matched: false }
  }

  const country = (input.country || "").trim().toUpperCase()
  const state = (input.state || "").trim().toUpperCase()

  // A region-specific rate wins over a country-wide one, so a store can charge
  // 20% nationally but override a single province without deleting either row.
  const active = settings.rates.filter((r) => r.active && r.country === country)
  const match =
    (state ? active.find((r) => r.state === state) : undefined) ??
    active.find((r) => r.state === TAX_STATE_ANY)

  const rate = match ? match.rate : settings.defaultRate
  const resolvedLabel = match ? match.label : label

  const base =
    Math.max(0, input.taxableAmount) +
    (settings.onShipping ? Math.max(0, input.shippingFee ?? 0) : 0)

  return {
    rate,
    label: resolvedLabel,
    amount: round2((base * rate) / 100),
    matched: Boolean(match),
  }
}

/** "HST (13%)" — the invoice line, with trailing zeros trimmed. */
export function taxLineLabel(rate: number, label: string): string {
  const pretty = Number(rate.toFixed(3)).toString()
  return `${label} (${pretty}%)`
}
