import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { getCache, setCache, invalidateCache } from "@/lib/redis"
import { formatImageUrl } from "@/lib/utils"

// ─── Settings reads ──────────────────────────────────────────────────────────
// Every storefront page touches these: the root layout reads them twice (once
// in `generateMetadata`, once when rendering), and most pages call
// `getStoreName()` again from their own `generateMetadata`. Uncached that was
// ~4 DB round trips before a single byte of HTML went out.
//
// Two layers, because they solve different problems:
//   • `cache()`  — dedupes within one render pass, so the repeat calls above
//                  collapse into one lookup.
//   • Redis      — carries the result between requests. Fail-soft, like the
//                  rest of `@/lib/redis`: if Redis is down we just hit Postgres.
//
// Admin writes call `invalidateSettingsCache()`; the TTL is the safety net for
// any write path that forgets to.
// ─────────────────────────────────────────────────────────────────────────────

const SETTINGS_CACHE_KEY = "settings:all"
const SETTINGS_CACHE_TTL = 300

/** Cached response of the public `/api/settings` endpoint, cleared alongside. */
export const PUBLIC_SETTINGS_CACHE_KEY = "settings:public-api"
export const PUBLIC_SETTINGS_CACHE_TTL = 300

type Settings = Record<string, string>

export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const cached = await getCache<Settings>(SETTINGS_CACHE_KEY)
    if (cached) return cached

    const rows = await prisma.setting.findMany()
    const settings = rows.reduce((acc: Settings, setting) => {
      let val = setting.value
      if (setting.key === "brand_logo_url" || setting.key === "brand_favicon_url") {
        val = formatImageUrl(val)
      }
      acc[setting.key] = val
      return acc
    }, {})

    await setCache(SETTINGS_CACHE_KEY, settings, SETTINGS_CACHE_TTL)
    return settings
  } catch (error) {
    console.error("[GET_SETTINGS_ERROR]", error)
    return {}
  }
})

// Fallbacks for keys client components read unconditionally. These used to live
// only inside `/api/settings`, which meant anything reading settings on the
// server saw them as undefined. Shared here so the server-rendered payload and
// the API response agree.
const PUBLIC_SETTING_DEFAULTS: Settings = {
  reward_point_value: "1",
  reward_point_earn_rate: "10",
  shipping_enabled: "true",
  shipping_flat_rate: "60",
  shipping_free_threshold: "1000",
}

/** Settings as the storefront should see them, with public defaults applied. */
export async function getPublicSettings(): Promise<Settings> {
  const settings = await getSettings()
  const merged: Settings = { ...PUBLIC_SETTING_DEFAULTS }
  for (const [key, value] of Object.entries(settings)) {
    if (value !== "") merged[key] = value
  }
  return merged
}

// Reads through `getSettings` rather than issuing its own `findUnique`, so the
// store name is free once anything on the page has loaded settings.
export async function getStoreName(): Promise<string> {
  try {
    const settings = await getSettings()
    return settings["brand_store_name"] || "My Store"
  } catch (err) {
    return "My Store"
  }
}

/** Call after any write to the `Setting` table so readers see it immediately. */
export async function invalidateSettingsCache(): Promise<void> {
  await Promise.all([
    invalidateCache(SETTINGS_CACHE_KEY),
    invalidateCache(PUBLIC_SETTINGS_CACHE_KEY),
  ])
}
