import { getSettings } from "@/lib/settings"

/**
 * Stock level at or below which a variant counts as "low". Stored as a
 * `Setting` row so it can be tuned from Admin → Reports → Low Stock without a
 * deploy; the inventory list, its summary cards and the low-stock report all
 * read the same value.
 */
export const LOW_STOCK_THRESHOLD_KEY = "low_stock_threshold"
export const DEFAULT_LOW_STOCK_THRESHOLD = 5

/** Non-negative integer, falling back to the default for anything else. */
export function parseLowStockThreshold(raw: string | number | null | undefined): number {
  if (raw === null || raw === undefined || raw === "") return DEFAULT_LOW_STOCK_THRESHOLD
  const n = typeof raw === "number" ? raw : Number.parseInt(String(raw), 10)
  if (!Number.isFinite(n) || n < 0) return DEFAULT_LOW_STOCK_THRESHOLD
  return Math.floor(n)
}

export async function getLowStockThreshold(): Promise<number> {
  const settings = await getSettings()
  return parseLowStockThreshold(settings[LOW_STOCK_THRESHOLD_KEY])
}
