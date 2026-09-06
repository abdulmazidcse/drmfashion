// ─── Server-side shipping pricing ────────────────────────────────────────────
// The single place where a shipping method id becomes money. Both paths that
// charge a shopper — `/api/checkout` and the Stripe intent — go through this,
// so a quote can never differ between authorising a card and writing the order.
//
// Two kinds of method arrive here:
//   • a store tier  (`standard`)  — priced from the `shipping_methods` setting
//   • a UPS service (`ups:03`)    — re-quoted from UPS at order time
//
// In both cases the browser only names the choice. It never supplies the price.
// ─────────────────────────────────────────────────────────────────────────────

import {
  resolveShipping,
  shippingMethodsFromSettings,
  upsServiceCodeFromMethodId,
} from "@/lib/shipping"
import { upsServiceName, verifyUpsRate } from "@/lib/ups"
import { upsConfigFromSettings } from "@/lib/upsConfig"
import { baseCurrencyCode } from "@/lib/settings"
import { warehouseFromSettings } from "@/lib/warehouse"

export interface OrderShipping {
  methodName: string
  /** "UPS" for a carrier service, null for a tier the store fulfils itself. */
  carrier: string | null
  fee: number
}

interface Destination {
  city?: string
  postalCode?: string
  countryCode?: string
  addressLine?: string
}

interface ResolveArgs {
  settings: Record<string, string>
  shippingMethodId: unknown
  destination?: Destination | null
  items?: Array<{ quantity?: number }> | null
}

/**
 * UPS quotes in its account currency (USD here); order totals are held in the
 * store's base currency. `supported_currencies` lists how many units of each
 * currency make one base unit, so dividing converts back.
 *
 * Throws rather than guessing a rate: an unconvertible quote would be billed at
 * the wrong number, and being wrong about money is worse than refusing.
 */
function toBaseCurrency(
  amount: number,
  fromCode: string,
  settings: Record<string, string>
): number {
  const base = baseCurrencyCode(settings)
  if (!fromCode || fromCode.toUpperCase() === base.toUpperCase()) return amount

  let supported: Array<{ code?: string; rate?: number }> = []
  try {
    const parsed = JSON.parse(settings.supported_currencies || "[]")
    if (Array.isArray(parsed)) supported = parsed
  } catch {
    supported = []
  }

  const entry = supported.find((c) => c?.code?.toUpperCase() === fromCode.toUpperCase())
  if (!entry || !Number.isFinite(Number(entry.rate)) || Number(entry.rate) <= 0) {
    throw new Error(
      `Cannot price UPS shipping: no exchange rate configured for ${fromCode}. Please choose another shipping method.`
    )
  }

  return Math.round(((amount / Number(entry.rate)) + Number.EPSILON) * 100) / 100
}

/** Matches the estimate the checkout page sends when it asks for rates. */
function totalWeightFor(items: ResolveArgs["items"]): number {
  if (!Array.isArray(items) || items.length === 0) return 2.0
  const weight = items.reduce((acc, i) => acc + (Number(i?.quantity) || 0) * 1.5, 0)
  return weight > 0 ? weight : 2.0
}

export async function resolveOrderShipping({
  settings,
  shippingMethodId,
  destination,
  items,
}: ResolveArgs): Promise<OrderShipping> {
  const shippingEnabled = settings["shipping_enabled"] !== "false"
  const upsServiceCode = upsServiceCodeFromMethodId(shippingMethodId)

  if (upsServiceCode) {
    const upsConfig = upsConfigFromSettings(settings)

    if (!upsConfig.enabled) {
      throw new Error(
        "UPS shipping is not available on this store. Please choose another shipping method."
      )
    }

    // Mock rates exist so the UI can be built without credentials. Billing one
    // would mean charging an invented number, so refuse instead of guessing.
    if (!upsConfig.isConfigured) {
      throw new Error(
        "UPS shipping is not configured on this store. Please choose another shipping method."
      )
    }

    if (!destination?.city || !destination?.postalCode) {
      throw new Error(
        "A city and postal code are required to price UPS shipping. Please choose another shipping method."
      )
    }

    const rate = await verifyUpsRate(
      {
        city: destination.city,
        postalCode: destination.postalCode,
        countryCode: destination.countryCode || "US",
        addressLine: destination.addressLine || undefined,
      },
      upsServiceCode,
      totalWeightFor(items),
      warehouseFromSettings(settings),
      upsConfig
    )

    const feeInBase = toBaseCurrency(rate.rate, rate.currency, settings)

    return {
      methodName: upsServiceName(upsServiceCode),
      carrier: "UPS",
      // The master switch zeroes carrier services too — otherwise turning
      // shipping "off" would still bill whatever UPS quoted.
      fee: shippingEnabled ? feeInBase : 0,
    }
  }

  const resolved = resolveShipping(
    shippingMethodsFromSettings(settings),
    shippingMethodId,
    { shippingEnabled }
  )

  return { methodName: resolved.methodName, carrier: null, fee: resolved.fee }
}
