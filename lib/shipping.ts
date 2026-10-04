// ─── Shipping methods ────────────────────────────────────────────────────────
// The storefront offers a fixed set of shipping tiers the merchant defines in
// Admin → Settings → Shipping. They live as one JSON row in the `Setting`
// table (key `shipping_methods`), the same shape `supported_currencies` uses,
// so adding or repricing a tier needs no migration.
//
// Prices are held in the store's **base currency** — the same unit as product
// prices and `Order.totalAmount`. The storefront converts for display through
// `CurrencyProvider`, exactly as it does for every other amount.
//
// A tier can also be repriced per destination: `countryRates` overrides `price`
// when the shipping address is in one of the listed countries. Anywhere not
// listed pays the tier's own `price`, so adding a country is opt-in and no
// order is ever blocked for want of a rate.
//
// The browser only ever sends back a method *id* — never a price, and never a
// country it picked the price for. Every server path that moves money
// (`/api/checkout`, the Stripe intent) re-reads the settings row and re-derives
// the fee from the address on the order via `resolveShipping`, so a tampered
// payload can change which tier was picked but never what it costs.
// ─────────────────────────────────────────────────────────────────────────────

export const SHIPPING_METHODS_KEY = "shipping_methods"

// Order value, in base currency, above which shipping stops being charged.
// Edited in Admin → Settings → Shipping; advertised on the product page.
export const FREE_SHIPPING_THRESHOLD_KEY = "shipping_free_threshold"

// "true"/"false": an order paid in full online ships free, whatever its value.
// Replaced the old bKash-only rule that capped it at a subtotal (৳2,000).
// Edited in Admin → Settings → Shipping; on unless set to "false".
export const FULL_PAYMENT_FREE_SHIPPING_KEY = "free_shipping_full_payment"

/**
 * Payment methods that collect the whole order total up front through a
 * gateway — bKash and SSLCommerz are verified, card and Square are charged.
 * Cash on delivery and Nagad are confirmed by hand later, so they do not
 * count as paid in full and keep their delivery charge.
 */
export const FULL_ONLINE_PAYMENT_METHODS = ["bkash", "sslcommerz", "card", "square"] as const

/** One destination override inside a tier. */
export interface ShippingCountryRate {
  /** ISO 3166-1 alpha-2, upper case. */
  country: string
  /** In the store's base currency. 0 ships free to that country. */
  price: number
}

/**
 * Limits which destinations a tier is even offered to — the availability
 * counterpart to `ShippingCountryRate`, which only changes the price.
 *
 * `region` is the ISO 3166-2 short code `country-region-data` returns (see
 * lib/regionsServer.ts) — the same value the checkout address form's
 * Division/Province/State dropdown already stores as `shippingDestination.state`.
 */
export interface ShippingRegionRestriction {
  /** "only": offered exclusively in this region. "except": offered everywhere but it. */
  scope: "only" | "except"
  /** ISO 3166-1 alpha-2, upper case. */
  country: string
  /** ISO 3166-2 short code, upper case — or WHOLE_COUNTRY for every region. */
  region: string
}

/**
 * Region value meaning "the whole country". Lets a tier be limited to one
 * country ("only" → Bangladesh) or offered everywhere but it ("except" →
 * every other country) — e.g. an international tier that must not be offered
 * to Bangladeshi addresses.
 */
export const WHOLE_COUNTRY = "*"

export interface ShippingMethod {
  /** Stable slug stored on the order and sent by the browser. */
  id: string
  name: string
  /** Free text, shown under the name — e.g. "8-12 days". */
  deliveryTime: string
  /** In the store's base currency. 0 means the merchant absorbs the cost. */
  price: number
  /**
   * Per-country prices that override `price`. Edited in Admin → Settings →
   * Shipping; a country listed twice keeps its first row.
   */
  countryRates: ShippingCountryRate[]
  /** Null means offered everywhere (every method before this field existed). */
  regionRestriction: ShippingRegionRestriction | null
  active: boolean
}

export const DEFAULT_SHIPPING_METHODS: ShippingMethod[] = [
  { id: "standard", name: "Standard Shipping", deliveryTime: "8-12 days", price: 0, countryRates: [], regionRestriction: null, active: true },
  { id: "priority", name: "Priority Shipping", deliveryTime: "6-8 days", price: 14, countryRates: [], regionRestriction: null, active: true },
  { id: "express", name: "Express Shipping", deliveryTime: "6 days", price: 20, countryRates: [], regionRestriction: null, active: true },
]

function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100
}

/** Slug for a method the admin just named, kept URL/JSON safe and non-empty. */
export function slugifyMethodId(name: string, fallback: string): string {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return slug || fallback
}

/**
 * Normalises whatever is in the settings row into usable methods.
 *
 * Anything malformed (bad JSON, not an array, rows missing a name) falls back
 * to the defaults rather than leaving checkout with nothing to offer — an
 * empty list would block every order.
 */
export function parseShippingMethods(raw: unknown): ShippingMethod[] {
  if (Array.isArray(raw)) return sanitise(raw)
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_SHIPPING_METHODS
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_SHIPPING_METHODS
    return sanitise(parsed)
  } catch {
    return DEFAULT_SHIPPING_METHODS
  }
}

function sanitise(rows: unknown[]): ShippingMethod[] {
  const seen = new Set<string>()
  const methods: ShippingMethod[] = []

  rows.forEach((raw, i) => {
    if (!raw || typeof raw !== "object") return
    const row = raw as Partial<Record<keyof ShippingMethod, unknown>>
    const name = String(row.name ?? "").trim()
    if (!name) return

    let id = String(row.id ?? "").trim() || slugifyMethodId(name, `method-${i + 1}`)
    // Duplicate ids would make the radio group ambiguous and let the server
    // resolve a different tier than the shopper saw.
    while (seen.has(id)) id = `${id}-${i + 1}`
    seen.add(id)

    const price = Number(row.price)
    methods.push({
      id,
      name,
      deliveryTime: String(row.deliveryTime ?? "").trim(),
      price: Number.isFinite(price) && price > 0 ? round2(price) : 0,
      // Absent on every row saved before country pricing existed, so this has
      // to tolerate `undefined` rather than assume an array.
      countryRates: sanitiseCountryRates(row.countryRates),
      regionRestriction: sanitiseRegionRestriction(row.regionRestriction),
      active: row.active !== false,
    })
  })

  return methods.length > 0 ? methods : DEFAULT_SHIPPING_METHODS
}

/**
 * Normalises a tier's destination overrides.
 *
 * Country codes are upper-cased so a row typed as "bd" still matches the "BD"
 * the checkout form sends, and a country repeated by mistake keeps its first
 * row — silently charging whichever duplicate sorted last would be worse.
 */
function sanitiseCountryRates(raw: unknown): ShippingCountryRate[] {
  if (!Array.isArray(raw)) return []

  const seen = new Set<string>()
  const rates: ShippingCountryRate[] = []

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue
    const row = entry as Partial<Record<keyof ShippingCountryRate, unknown>>
    const country = String(row.country ?? "").trim().toUpperCase()
    if (!country || seen.has(country)) continue

    const price = Number(row.price)
    // Unlike a tier's own price, 0 here is a deliberate "free to this country"
    // and has to survive; only a missing or nonsensical number is dropped.
    if (!Number.isFinite(price) || price < 0) continue

    seen.add(country)
    rates.push({ country, price: round2(price) })
  }

  return rates
}

/**
 * Normalises a tier's optional region restriction. Malformed input (missing
 * scope/country/region, or absent entirely) means "offered everywhere" — the
 * same tolerant-default philosophy `sanitiseCountryRates` uses, so a bad row
 * never accidentally hides a method from every customer.
 */
function sanitiseRegionRestriction(raw: unknown): ShippingRegionRestriction | null {
  if (!raw || typeof raw !== "object") return null
  const row = raw as Partial<Record<keyof ShippingRegionRestriction, unknown>>

  const scope = row.scope === "only" || row.scope === "except" ? row.scope : null
  const country = String(row.country ?? "").trim().toUpperCase()
  const region = String(row.region ?? "").trim().toUpperCase()
  if (!scope || !country || !region) return null

  return { scope, country, region }
}

/** Reads the methods out of a settings map (`getPublicSettings`, `/api/settings`). */
export function shippingMethodsFromSettings(
  settings: Record<string, string> | undefined | null
): ShippingMethod[] {
  return parseShippingMethods(settings?.[SHIPPING_METHODS_KEY])
}

/**
 * The free-shipping threshold, or null when there is none.
 *
 * Blank, zero and anything non-numeric all mean "no offer" — the storefront
 * then says nothing rather than promising free shipping over nothing.
 */
export function parseFreeShippingThreshold(raw: unknown): number | null {
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? round2(n) : null
}

export function freeShippingThresholdFromSettings(
  settings: Record<string, string> | undefined | null
): number | null {
  return parseFreeShippingThreshold(settings?.[FREE_SHIPPING_THRESHOLD_KEY])
}

/**
 * Zeroes a shipping fee once the order qualifies.
 *
 * `subtotal` is the merchandise total before coupons, reward points and tax —
 * the same figure the cart shows as "Subtotal", so what the product page
 * promises is what the server later applies. Every display path and both
 * server money paths go through this, so they cannot drift apart.
 */
/**
 * Free-delivery offers apply to addresses in this country only. An
 * international tier (e.g. ৳2,500 to the UK) is always charged, otherwise a
 * ৳2,000 order abroad would ship free at the store's expense.
 */
export const FREE_SHIPPING_COUNTRY = "BD"

/** Whether free-delivery offers can apply to this destination country. */
export function freeShippingEligibleCountry(countryCode: unknown): boolean {
  return typeof countryCode === "string" && countryCode.trim().toUpperCase() === FREE_SHIPPING_COUNTRY
}

export function applyFreeShippingThreshold(
  fee: number,
  subtotal: number,
  threshold: number | null,
  countryCode: unknown
): number {
  if (threshold === null || fee <= 0 || !freeShippingEligibleCountry(countryCode)) return fee
  return subtotal >= threshold ? 0 : fee
}

export function fullPaymentFreeShippingFromSettings(
  settings: Record<string, string> | undefined | null
): boolean {
  return settings?.[FULL_PAYMENT_FREE_SHIPPING_KEY] !== "false"
}

/**
 * Zeroes the shipping fee when the order is paid in full online. No amount
 * limit. Applied alongside `applyFreeShippingThreshold` — either rule can
 * waive the fee — on every display path and both server money paths.
 */
export function applyFullPaymentFreeShipping(
  fee: number,
  paymentMethod: unknown,
  enabled: boolean,
  countryCode: unknown
): number {
  if (!enabled || fee <= 0 || !freeShippingEligibleCountry(countryCode)) return fee
  return (FULL_ONLINE_PAYMENT_METHODS as readonly string[]).includes(String(paymentMethod)) ? 0 : fee
}

export function activeShippingMethods(methods: ShippingMethod[]): ShippingMethod[] {
  return methods.filter((m) => m.active)
}

/**
 * Whether a tier is offered to a given destination at all — separate from
 * `shippingPriceForCountry`, which only decides what it costs once it's
 * already offered.
 *
 * No restriction: always allowed. With one, BOTH scopes are first scoped to
 * the restriction's own country — "except Dhaka" means "elsewhere in
 * Bangladesh", never "anywhere in the world that isn't Dhaka division". A
 * shipment to a different country entirely never matches either scope, so an
 * "Inside/Outside Dhaka" pair of tiers never appears for an order going
 * somewhere else. An unknown/missing destination (no country picked yet)
 * fails that same country check, so both stay hidden until it's known.
 */
export function methodAllowedForDestination(
  method: ShippingMethod,
  countryCode?: unknown,
  regionCode?: unknown
): boolean {
  const restriction = method.regionRestriction
  if (!restriction) return true

  const country = typeof countryCode === "string" ? countryCode.trim().toUpperCase() : ""

  // Whole-country limit: in that country ("only") or anywhere else ("except").
  if (restriction.region === WHOLE_COUNTRY) {
    const inCountry = country === restriction.country
    return restriction.scope === "only" ? inCountry : !inCountry
  }

  if (country !== restriction.country) return false

  const region = typeof regionCode === "string" ? regionCode.trim().toUpperCase() : ""
  const regionMatches = Boolean(region) && region === restriction.region

  return restriction.scope === "only" ? regionMatches : !regionMatches
}

/**
 * The methods an actual shopper should be offered: active, and allowed for
 * where they're shipping to. This is what checkout's radio list and both
 * server money paths (`resolveShipping`'s fallback, `resolveOrderShipping`)
 * go through — `activeShippingMethods` alone stays untouched for callers
 * that don't have (or don't care about) a destination yet.
 */
export function shippableMethodsForDestination(
  methods: ShippingMethod[],
  destination: { countryCode?: unknown; regionCode?: unknown } = {}
): ShippingMethod[] {
  return activeShippingMethods(methods).filter((m) =>
    methodAllowedForDestination(m, destination.countryCode, destination.regionCode)
  )
}

/**
 * What a tier costs to a given destination.
 *
 * The one place a country becomes a price. Every display path and both server
 * money paths call it, so the quote on the checkout radio, the cart's estimate
 * and the amount authorised on the card cannot drift apart.
 *
 * An unknown or missing country falls back to the tier's own price rather than
 * refusing: the cart shows an estimate long before an address is typed, and a
 * country the merchant has not priced yet still has to be sellable.
 */
export function shippingPriceForCountry(
  method: ShippingMethod,
  countryCode?: unknown
): number {
  const code = typeof countryCode === "string" ? countryCode.trim().toUpperCase() : ""
  if (!code) return method.price

  const override = method.countryRates.find((r) => r.country === code)
  return override ? override.price : method.price
}

/**
 * The tier a shopper gets by default — cheapest first, ties broken by order.
 *
 * Cheapest is judged at the destination, so a tier that is dearest worldwide
 * but free to the shopper's own country is the one preselected there. Region
 * restrictions narrow the field the same way `active` does — a tier the
 * shopper's destination isn't even offered can never be the default.
 */
export function defaultShippingMethod(
  methods: ShippingMethod[],
  countryCode?: unknown,
  regionCode?: unknown
): ShippingMethod | null {
  const shippable = shippableMethodsForDestination(methods, { countryCode, regionCode })
  if (shippable.length === 0) return null
  return shippable.reduce(
    (cheapest, m) =>
      shippingPriceForCountry(m, countryCode) < shippingPriceForCountry(cheapest, countryCode)
        ? m
        : cheapest,
    shippable[0]
  )
}

export interface ResolvedShipping {
  /** Null only when the merchant has no active method configured at all. */
  method: ShippingMethod | null
  /** Name to store on the order — never empty. */
  methodName: string
  /** What to charge, in base currency. Authoritative. */
  fee: number
}

/**
 * Turns a client-supplied method id into a price the server trusts.
 *
 * An unknown id resolves to the default tier rather than erroring: ids can go
 * stale between the shopper loading checkout and the admin editing a method,
 * and failing a paid-for order over that is worse than shipping it at the
 * cheapest rate. The same fallback covers a region-restricted tier the
 * destination doesn't actually qualify for — e.g. a tampered request asking
 * for the Dhaka-only tier on an order going elsewhere quietly resolves to a
 * tier that destination is actually offered, rather than being trusted.
 */
export function resolveShipping(
  methods: ShippingMethod[],
  methodId: unknown,
  opts: { shippingEnabled?: boolean; countryCode?: unknown; regionCode?: unknown } = {}
): ResolvedShipping {
  const shippable = shippableMethodsForDestination(methods, {
    countryCode: opts.countryCode,
    regionCode: opts.regionCode,
  })
  const requested = typeof methodId === "string" ? methodId.trim() : ""
  const method =
    shippable.find((m) => m.id === requested) ??
    defaultShippingMethod(methods, opts.countryCode, opts.regionCode)

  if (!method) return { method: null, methodName: "Standard Shipping", fee: 0 }

  // Master switch in Admin → Settings → Shipping. Keeps the chosen tier's name
  // on the order so the warehouse still knows how fast to send it.
  const fee =
    opts.shippingEnabled === false ? 0 : shippingPriceForCountry(method, opts.countryCode)

  return { method, methodName: method.name, fee: round2(fee) }
}


// ─── UPS live rates ──────────────────────────────────────────────────────────
// A UPS service is chosen through the same radio group as the store's own
// tiers, so it travels as a method id too — namespaced to keep it apart from
// the admin-defined ids. `ups:03` means "UPS Ground, price it from UPS".
// ─────────────────────────────────────────────────────────────────────────────

export const UPS_METHOD_PREFIX = "ups:"

export function upsMethodId(serviceCode: string): string {
  return `${UPS_METHOD_PREFIX}${serviceCode}`
}

/** The UPS service code inside a method id, or null for a store-defined tier. */
export function upsServiceCodeFromMethodId(methodId: unknown): string | null {
  if (typeof methodId !== "string") return null
  if (!methodId.startsWith(UPS_METHOD_PREFIX)) return null
  const code = methodId.slice(UPS_METHOD_PREFIX.length).trim()
  return code || null
}
