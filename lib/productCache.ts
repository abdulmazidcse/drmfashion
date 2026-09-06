import { invalidateCache } from "@/lib/redis"

/**
 * Redis keys on the home page that hold product data.
 *
 * The home page caches these for an hour, so without an explicit purge a
 * created, edited or deleted product keeps showing its old state for up to that
 * long — `revalidatePath` only clears Next's own render cache, not Redis.
 *
 * `bestSellers` is keyed by the current month, so it is rebuilt here from the
 * same month boundary app/page.tsx uses.
 */
export function productCacheKeys(now = new Date()): string[] {
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  return [
    "home:products:v2",
    `home:bestSellers:v2:${monthStart.getTime()}`,
    "home:flash_sale:products_data",
    "home:trendingCategories:v2",
  ]
}

/** Fire-and-forget purge; Redis is fail-soft here as everywhere else. */
export async function invalidateProductCaches(): Promise<void> {
  await Promise.all(
    productCacheKeys().map((key) =>
      invalidateCache(key).catch((e) => console.warn("[PRODUCT_CACHE_INVALIDATE]", key, e))
    )
  )
}
