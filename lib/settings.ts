import { cache } from "react"
import { prisma } from "@/lib/prisma"
import { getCache, setCache, invalidateCache } from "@/lib/redis"
import { formatImageUrl } from "@/lib/utils"
import { DEFAULT_SHIPPING_METHODS, SHIPPING_METHODS_KEY } from "@/lib/shipping"

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
  // Storefronts that have never opened Admin -> Settings -> Shipping still need
  // a set of methods to render, so the defaults ship as the fallback value.
  [SHIPPING_METHODS_KEY]: JSON.stringify(DEFAULT_SHIPPING_METHODS),
}

/**
 * Setting keys that must never reach the browser.
 *
 * `/api/settings` serves whatever `getPublicSettings` returns, and it returns
 * the table — so a credential stored as an ordinary row would be readable by
 * anyone who requested that endpoint. Anything secret is listed here and
 * stripped on the way out; server code that genuinely needs the value reads it
 * from `getSettings()` instead.
 */
export const SECRET_SETTING_KEYS = new Set([
  "ups_client_id",
  "ups_client_secret",
  "ups_account_number",
])

/** Settings as the storefront should see them, with public defaults applied. */
export async function getPublicSettings(): Promise<Settings> {
  const settings = await getSettings()
  const merged: Settings = { ...PUBLIC_SETTING_DEFAULTS }
  for (const [key, value] of Object.entries(settings)) {
    if (SECRET_SETTING_KEYS.has(key)) continue
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

/**
 * The store's own currency — the `supported_currencies` entry whose rate is 1.
 *
 * Prices and order totals are stored against this, so it is what analytics and
 * anything else comparing amounts across visitors has to report. The currency a
 * shopper happened to be browsing in is a display concern.
 */
export function baseCurrencyCode(settings: Record<string, string>): string {
  try {
    const parsed = JSON.parse(settings.supported_currencies || "[]")
    if (!Array.isArray(parsed) || parsed.length === 0) return "USD"
    return (parsed.find((c) => c?.rate === 1) || parsed[0])?.code || "USD"
  } catch {
    return "USD"
  }
}

/** Call after any write to the `Setting` table so readers see it immediately. */
export async function invalidateSettingsCache(): Promise<void> {
  await Promise.all([
    invalidateCache(SETTINGS_CACHE_KEY),
    invalidateCache(PUBLIC_SETTINGS_CACHE_KEY),
  ])
}
