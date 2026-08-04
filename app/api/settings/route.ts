import { NextResponse } from "next/server"
import { getCache, setCache } from "@/lib/redis"
import {
  getPublicSettings,
  PUBLIC_SETTINGS_CACHE_KEY,
  PUBLIC_SETTINGS_CACHE_TTL,
} from "@/lib/settings"

// Public API for settings used by frontend (checkout, etc.)
//
// Hot path: SettingsProvider and CurrencyProvider both hit this on every page
// load. It used to run an uncached `setting.findMany()` *and*, whenever
// SQUARE_LOCATION_ID was absent from env, an outbound call to Square's API —
// per request. Both are now behind a short Redis TTL, and the response carries
// a Cache-Control header so a browser serving two near-simultaneous callers
// only pays for one trip.
const RESPONSE_CACHE_KEY = PUBLIC_SETTINGS_CACHE_KEY
const RESPONSE_CACHE_TTL = PUBLIC_SETTINGS_CACHE_TTL

async function resolveSquareLocationId(squareAppId: string): Promise<string> {
  const fromEnv = process.env.NEXT_PUBLIC_SQUARE_LOCATION_ID || process.env.SQ_LOCATION_ID || ""
  if (fromEnv || !squareAppId) return fromEnv

  const squareAccessToken = process.env.SQUARE_ACCESS_TOKEN || process.env.SQ_APPLICATION_SECRET
  if (!squareAccessToken) return ""

  try {
    const isSandbox = squareAppId.startsWith("sandbox-")
    const baseUrl = isSandbox
      ? "https://connect.squareupsandbox.com"
      : "https://connect.squareup.com"

    const locRes = await fetch(`${baseUrl}/v2/locations`, {
      headers: {
        "Authorization": `Bearer ${squareAccessToken}`,
        "Content-Type": "application/json",
        "Square-Version": "2024-05-15"
      }
    })
    if (locRes.ok) {
      const locData = await locRes.json()
      if (locData.locations && locData.locations.length > 0) {
        const activeLoc = locData.locations.find((l: any) => l.status === "ACTIVE") || locData.locations[0]
        return activeLoc.id
      }
    }
  } catch (e) {
    console.error("Auto-fetch Square Location ID failed:", e)
  }
  return ""
}

export async function GET() {
  try {
    const cached = await getCache<Record<string, string>>(RESPONSE_CACHE_KEY)
    if (cached) {
      return NextResponse.json(cached, {
        headers: { "Cache-Control": `private, max-age=${RESPONSE_CACHE_TTL}` }
      })
    }

    // Shares the Redis entry and per-request memoisation of @/lib/settings,
    // including the brand_logo_url / brand_favicon_url URL formatting and the
    // public defaults the storefront relies on.
    const settingsObj: Record<string, string> = { ...(await getPublicSettings()) }

    // Square credentials (application ID and Location ID are safe to expose)
    const squareAppId = process.env.NEXT_PUBLIC_SQUARE_APPLICATION_ID || process.env.SQ_APPLICATION_ID || ""
    settingsObj["square_app_id"] = squareAppId
    settingsObj["square_location_id"] = await resolveSquareLocationId(squareAppId)

    await setCache(RESPONSE_CACHE_KEY, settingsObj, RESPONSE_CACHE_TTL)

    return NextResponse.json(settingsObj, {
      headers: { "Cache-Control": `private, max-age=${RESPONSE_CACHE_TTL}` }
    })
  } catch (error: any) {
    console.error("[PUBLIC_SETTINGS_GET]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
