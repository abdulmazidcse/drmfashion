// ─── Delivery carriers ───────────────────────────────────────────────────────
// Admin → Deliveries lets the merchant pick a carrier per order and paste the
// tracking number. Carriers live as one JSON row in the `Setting` table (key
// `delivery_carriers`), the same shape `shipping_methods` uses, so adding one
// needs no migration.
//
// Each carrier owns a tracking URL template with a `{tracking}` placeholder.
// The order's `trackingUrl` is resolved from it when the number is saved, so
// the customer-facing pages only ever see a finished link.
//
// This module is pure (no Prisma / settings reads) so the admin UI can reuse
// `buildTrackingUrl` for the live preview. Server-side glue lives in
// `lib/deliveryUpdate.ts`.
// ─────────────────────────────────────────────────────────────────────────────

export const DELIVERY_CARRIERS_KEY = "delivery_carriers"

export const TRACKING_PLACEHOLDER = "{tracking}"

export interface DeliveryCarrier {
  /** Stable slug used as the React key and to dedupe rows. */
  id: string
  /** Stored on the order as `shippingCarrier`. */
  name: string
  /** Contains `{tracking}`; empty when the carrier has no public tracking page. */
  trackingUrlTemplate: string
  active: boolean
}

export const DEFAULT_DELIVERY_CARRIERS: DeliveryCarrier[] = [
  { id: "ups", name: "UPS", trackingUrlTemplate: "https://www.ups.com/track?tracknum={tracking}", active: true },
  { id: "fedex", name: "FedEx", trackingUrlTemplate: "https://www.fedex.com/fedextrack/?trknbr={tracking}", active: true },
  { id: "dhl", name: "DHL", trackingUrlTemplate: "https://www.dhl.com/en/express/tracking.html?AWB={tracking}", active: true },
  { id: "usps", name: "USPS", trackingUrlTemplate: "https://tools.usps.com/go/TrackConfirmAction?tLabels={tracking}", active: true },
  { id: "local-courier", name: "Local Courier", trackingUrlTemplate: "", active: true },
]

/** Slug for a carrier the admin just named, kept URL/JSON safe and non-empty. */
export function slugifyCarrierId(name: string, fallback: string): string {
  const slug = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
  return slug || fallback
}

/**
 * Normalises whatever is in the settings row into usable carriers.
 *
 * Anything malformed (bad JSON, not an array, rows missing a name) falls back
 * to the defaults rather than leaving the delivery dialog with nothing to pick.
 */
export function parseDeliveryCarriers(raw: unknown): DeliveryCarrier[] {
  if (Array.isArray(raw)) return sanitise(raw)
  if (typeof raw !== "string" || !raw.trim()) return DEFAULT_DELIVERY_CARRIERS
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return DEFAULT_DELIVERY_CARRIERS
    return sanitise(parsed)
  } catch {
    return DEFAULT_DELIVERY_CARRIERS
  }
}

function sanitise(rows: unknown[]): DeliveryCarrier[] {
  const seen = new Set<string>()
  const carriers: DeliveryCarrier[] = []

  rows.forEach((raw, i) => {
    if (!raw || typeof raw !== "object") return
    const row = raw as Partial<Record<keyof DeliveryCarrier, unknown>>
    const name = String(row.name ?? "").trim()
    if (!name) return

    let id = String(row.id ?? "").trim() || slugifyCarrierId(name, `carrier-${i + 1}`)
    while (seen.has(id)) id = `${id}-${i + 1}`
    seen.add(id)

    carriers.push({
      id,
      name,
      trackingUrlTemplate: String(row.trackingUrlTemplate ?? "").trim(),
      active: row.active !== false,
    })
  })

  return carriers.length > 0 ? carriers : DEFAULT_DELIVERY_CARRIERS
}

/** Reads the carriers out of a settings map (`getSettings`). */
export function carriersFromSettings(
  settings: Record<string, string> | undefined | null
): DeliveryCarrier[] {
  return parseDeliveryCarriers(settings?.[DELIVERY_CARRIERS_KEY])
}

export function activeDeliveryCarriers(carriers: DeliveryCarrier[]): DeliveryCarrier[] {
  return carriers.filter((c) => c.active)
}

/** Case-insensitive lookup by the name stored on the order. */
export function findCarrierByName(
  carriers: DeliveryCarrier[],
  carrierName: string | null | undefined
): DeliveryCarrier | null {
  const wanted = (carrierName ?? "").trim().toLowerCase()
  if (!wanted) return null
  return carriers.find((c) => c.name.trim().toLowerCase() === wanted) ?? null
}

/**
 * The public tracking link for a number, or null when the carrier is unknown,
 * has no template, or the number is blank.
 */
export function buildTrackingUrl(
  carriers: DeliveryCarrier[],
  carrierName: string | null | undefined,
  trackingNumber: string | null | undefined
): string | null {
  const number = (trackingNumber ?? "").trim()
  if (!number) return null
  const carrier = findCarrierByName(carriers, carrierName)
  const template = carrier?.trackingUrlTemplate.trim()
  if (!template || !template.includes(TRACKING_PLACEHOLDER)) return null
  return template.split(TRACKING_PLACEHOLDER).join(encodeURIComponent(number))
}

// ─── Status date stamping ────────────────────────────────────────────────────
// Shared by the single-order PATCH and the bulk route so the two can never
// disagree on when `shippedAt` / `deliveredAt` get written.
// ─────────────────────────────────────────────────────────────────────────────

export const ORDER_STATUSES = ["PENDING", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"] as const
export type OrderStatusValue = (typeof ORDER_STATUSES)[number]

/** The statuses the Deliveries screen deals with. */
export const DELIVERY_STATUSES = ["PROCESSING", "SHIPPED", "DELIVERED"] as const
export type DeliveryStatus = (typeof DELIVERY_STATUSES)[number]

export function isOrderStatus(value: unknown): value is OrderStatusValue {
  return typeof value === "string" && (ORDER_STATUSES as readonly string[]).includes(value)
}

export function isDeliveryStatus(value: unknown): value is DeliveryStatus {
  return typeof value === "string" && (DELIVERY_STATUSES as readonly string[]).includes(value)
}

/**
 * Timestamps to write alongside a status change. Existing stamps are kept —
 * re-marking an order SHIPPED must not move the original dispatch date.
 */
export function deliveryStatusDates(
  status: string | undefined,
  existing: { shippedAt: Date | null; deliveredAt: Date | null },
  now: Date = new Date()
): { shippedAt?: Date; deliveredAt?: Date } {
  const data: { shippedAt?: Date; deliveredAt?: Date } = {}
  if (status === "SHIPPED" && !existing.shippedAt) data.shippedAt = now
  if (status === "DELIVERED" && !existing.deliveredAt) data.deliveredAt = now
  return data
}
