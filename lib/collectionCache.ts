import { revalidatePath } from "next/cache"
import { invalidateCache } from "@/lib/redis"

/**
 * Redis keys used by the public collection endpoints
 * (app/api/collections and app/api/collections/[slug]).
 *
 * The storefront pages under /collection are ISR-rendered and cleared with
 * `revalidatePath`; the JSON endpoints cache in Redis and need their own purge,
 * otherwise an admin edit keeps serving the old collection for the TTL.
 */
export const COLLECTIONS_LIST_KEY = "collections:list:v1"
export const COLLECTIONS_CACHE_TTL = 300

export function collectionCacheKey(slug: string): string {
  return `collections:slug:v1:${slug}`
}

/**
 * Purge every cache that could hold the given collections — pass both the old
 * and the new slug when a slug changes — and revalidate the storefront pages.
 */
export async function invalidateCollectionCaches(slugs: Array<string | null | undefined> = []): Promise<void> {
  const keys = [
    COLLECTIONS_LIST_KEY,
    ...slugs.filter((s): s is string => Boolean(s)).map(collectionCacheKey),
  ]

  await Promise.all(
    keys.map((key) =>
      invalidateCache(key).catch((e) => console.warn("[COLLECTION_CACHE_INVALIDATE]", key, e))
    )
  )

  revalidatePath("/collection")
  revalidatePath("/collection/[slug]", "page")
}
