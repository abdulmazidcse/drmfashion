import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { getCache, setCache } from "@/lib/redis"
import type { SwatchColor } from "@/lib/colorStyle"

/**
 * The Color table as the storefront needs it: a name plus everything
 * `swatchStyle()` requires to paint the chip.
 *
 * ProductVariant.color is only a name string — there is no relation to Color —
 * so a product card cannot resolve its own swatch from the data it is given.
 * The table is tiny (a couple of dozen rows) and identical for every visitor,
 * so it is loaded once per render in the root layout and handed down through
 * ColorsProvider, exactly like settings.
 *
 * Cached the same two ways as `getSettings`: `cache()` collapses repeat calls
 * inside one render, Redis carries the result between requests, and both fail
 * soft — a colour with no row still falls back to a flat grey chip.
 */
export type StoreColor = { name: string } & SwatchColor

const COLORS_CACHE_KEY = "colors:all"
const COLORS_CACHE_TTL = 300

export const getStoreColors = cache(async (): Promise<StoreColor[]> => {
  try {
    const cached = await getCache<StoreColor[]>(COLORS_CACHE_KEY)
    if (cached) return cached

    const rows = await prisma.color.findMany({
      select: { name: true, type: true, value: true, value2: true, angle: true, image: true },
      orderBy: { name: "asc" },
    })

    const colors = rows as StoreColor[]
    await setCache(COLORS_CACHE_KEY, colors, COLORS_CACHE_TTL)
    return colors
  } catch (error) {
    console.error("[GET_STORE_COLORS_ERROR]", error)
    return []
  }
})
