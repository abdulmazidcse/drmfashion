// ─── Region lookup (server only) ─────────────────────────────────────────────
// `country-region-data` carries every ISO 3166-2 subdivision for 249 countries.
// That is far too much to ship to the browser for a form that only ever needs
// one country at a time, so it is read here and served through
// `/api/regions/[country]` instead of being imported by any client component.
//
// `lib/regions.ts` keeps Canada and the US inline: they are the countries this
// store actually taxes, and a shopper picking their own province should not
// have to wait for a round trip to see the list.
// ─────────────────────────────────────────────────────────────────────────────

import { allCountries } from "country-region-data"
import type { Region } from "@/lib/regions"

// The package exposes tuples, not objects: [name, countryCode, [[regionName, regionShortCode], ...]]
type PackedCountry = [string, string, Array<[string, string]>]

const BY_CODE = new Map<string, Array<[string, string]>>(
  (allCountries as unknown as PackedCountry[]).map((c) => [c[1].toUpperCase(), c[2]])
)

/**
 * Subdivisions for a country, or an empty array when it has none listed.
 *
 * Entries without a short code are dropped rather than given a made-up one: the
 * code is what gets stored on the order and matched against a tax rate, so a
 * placeholder would quietly fail to match later.
 */
export function regionsForCountry(countryCode: string): Region[] {
  const rows = BY_CODE.get((countryCode || "").toUpperCase())
  if (!rows) return []

  return rows
    .filter(([name, code]) => Boolean(name && code))
    .map(([name, code]) => ({ code: code.toUpperCase(), name }))
}
