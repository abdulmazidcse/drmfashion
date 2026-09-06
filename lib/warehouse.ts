// ─── Ship-from address ───────────────────────────────────────────────────────
// Where parcels leave from. UPS prices by distance, so this is half of every
// rate quote — a wrong origin makes every quote wrong without ever erroring.
//
// It was hardcoded to a placeholder New York address inside `lib/ups.ts`, which
// meant correcting it needed a deploy. It now lives in the `Setting` table
// under `warehouse_address` so the merchant sets their own.
// ─────────────────────────────────────────────────────────────────────────────

export const WAREHOUSE_KEY = "warehouse_address"

export interface WarehouseAddress {
  name: string
  addressLine: string
  city: string
  /** Province/state code — UPS wants the 2-letter form for US and CA. */
  state: string
  postalCode: string
  country: string
}

export const DEFAULT_WAREHOUSE: WarehouseAddress = {
  name: "",
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  country: "US",
}

export function parseWarehouse(raw: unknown): WarehouseAddress {
  if (!raw) return DEFAULT_WAREHOUSE

  let obj: unknown = raw
  if (typeof raw === "string") {
    if (!raw.trim()) return DEFAULT_WAREHOUSE
    try {
      obj = JSON.parse(raw)
    } catch {
      return DEFAULT_WAREHOUSE
    }
  }

  if (!obj || typeof obj !== "object") return DEFAULT_WAREHOUSE
  const row = obj as Partial<Record<keyof WarehouseAddress, unknown>>

  return {
    name: String(row.name ?? "").trim(),
    addressLine: String(row.addressLine ?? "").trim(),
    city: String(row.city ?? "").trim(),
    state: String(row.state ?? "").trim().toUpperCase(),
    postalCode: String(row.postalCode ?? "").trim(),
    country: String(row.country ?? "").trim().toUpperCase() || "US",
  }
}

export function warehouseFromSettings(
  settings: Record<string, string> | undefined | null
): WarehouseAddress {
  return parseWarehouse(settings?.[WAREHOUSE_KEY])
}

/**
 * Whether the address is complete enough for UPS to rate against.
 *
 * UPS will happily answer a partial origin with a plausible-looking but wrong
 * price, so callers check this first and decline to quote rather than quote
 * badly.
 */
export function isWarehouseComplete(w: WarehouseAddress): boolean {
  return Boolean(w.addressLine && w.city && w.postalCode && w.country)
}
