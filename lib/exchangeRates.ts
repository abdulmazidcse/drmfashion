import { cache } from "react"
import { getCache, setCache } from "@/lib/redis"

// ─── Exchange rates ──────────────────────────────────────────────────────────
// `CurrencyProvider` used to call https://open.er-api.com/v6/latest/USD from the
// browser, on mount, on every page load — and it `await`ed that call *before*
// reading settings, so the whole currency chain (and therefore every rendered
// price, since `formatPrice` comes from that context) sat behind a cross-origin
// DNS + TLS + request round trip to a third party.
//
// Same data, fetched once per hour on the server and handed to the client with
// the initial payload. Fail-soft in the same style as `@/lib/redis`: if the
// upstream is slow or down we return null and the client keeps its bundled
// fallback rates.
// ─────────────────────────────────────────────────────────────────────────────

const RATES_CACHE_KEY = "exchange-rates:usd"
const RATES_CACHE_TTL = 3600
const UPSTREAM_TIMEOUT_MS = 3000

export type ExchangeRates = Record<string, number>

export const getExchangeRates = cache(async (): Promise<ExchangeRates | null> => {
  try {
    const cached = await getCache<ExchangeRates>(RATES_CACHE_KEY)
    if (cached) return cached

    // `next.revalidate`, never `cache: "no-store"`: this runs from the root
    // layout, and an uncached fetch there opts every page below it out of static
    // rendering (/men, /women, /cart, /gift-cards … all became per-request SSR).
    //
    // The timeout matters for the same reason — a slow upstream must not hold a
    // render open. The bundled fallback rates cover the gap.
    const res = await fetch("https://open.er-api.com/v6/latest/USD", {
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
      next: { revalidate: RATES_CACHE_TTL },
    })
    if (!res.ok) return null

    const data = await res.json()
    if (!data?.rates || typeof data.rates !== "object") return null

    const rates: ExchangeRates = {}
    for (const [code, rate] of Object.entries(data.rates)) {
      if (typeof rate === "number" && Number.isFinite(rate)) rates[code] = rate
    }
    if (Object.keys(rates).length === 0) return null

    await setCache(RATES_CACHE_KEY, rates, RATES_CACHE_TTL)
    return rates
  } catch (error) {
    console.error("[EXCHANGE_RATES_ERROR]", error)
    return null
  }
})
