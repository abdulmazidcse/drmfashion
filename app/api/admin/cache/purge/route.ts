import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { getAdminPayload } from "@/lib/auth"
import { invalidateCachePattern } from "@/lib/redis"

export const dynamic = "force-dynamic"

/**
 * Every Redis prefix the storefront reads from. Anything cached under one of
 * these is safe to drop — it is all derived from Postgres and rebuilt on the
 * next request.
 *
 * Deliberately excluded: `rl:*`-style rate-limit counters and any auth/session
 * keys, which are state rather than cache and must survive a purge.
 */
const CACHE_PATTERNS = [
  "home:*",        // app/page.tsx — hero, products, best sellers, flash sale
  "header:*",      // components/Header.tsx — nav menus
  "shop:*",        // app/shop/page.tsx — category tree, sizes, colors
  "settings:*",    // lib/settings.ts — store settings (both keys)
  "api:*",         // app/api/categories
  "exchange-rates:*",
]

export async function POST(req: NextRequest) {
  // Guard: ensure request is from an authenticated admin
  try {
    await getAdminPayload(req)
  } catch (err) {
    console.warn("[ADMIN_GUARD_CACHE_PURGE]", err instanceof Error ? err.message : err)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const counts = await Promise.all(CACHE_PATTERNS.map(invalidateCachePattern))
    const keysCleared = counts.reduce((sum, n) => sum + n, 0)

    // Purges Next's own render/data cache for every route beneath the root
    // layout — Redis alone would leave pre-rendered HTML stale.
    revalidatePath("/", "layout")

    return NextResponse.json({ keysCleared })
  } catch (error) {
    console.error("[CACHE_PURGE_ERROR]", error)
    return NextResponse.json({ message: "Failed to clear cache" }, { status: 500 })
  }
}
