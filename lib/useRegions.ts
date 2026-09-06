"use client"

import { useEffect, useState } from "react"
import { regionsFor, type Region } from "@/lib/regions"

// One cache for the whole tab. The admin tax table renders a selector per row,
// and without this a page with ten Australian rates would fetch AU ten times.
const cache = new Map<string, Region[]>()
const inFlight = new Map<string, Promise<Region[]>>()

async function loadRegions(country: string): Promise<Region[]> {
  const key = country.toUpperCase()

  const cached = cache.get(key)
  if (cached) return cached

  const existing = inFlight.get(key)
  if (existing) return existing

  const request = fetch(`/api/regions/${key}`)
    .then((res) => (res.ok ? res.json() : { regions: [] }))
    .then((data) => {
      const regions: Region[] = Array.isArray(data?.regions) ? data.regions : []
      cache.set(key, regions)
      return regions
    })
    // A failed lookup must not be cached as "this country has no regions",
    // or the field silently degrades to free text until a reload.
    .catch(() => [] as Region[])
    .finally(() => inFlight.delete(key))

  inFlight.set(key, request)
  return request
}

export interface UseRegionsResult {
  regions: Region[]
  /** True until the list is known — render a disabled control, not a text box. */
  loading: boolean
}

/**
 * Subdivisions for a country.
 *
 * Canada and the US resolve synchronously from the bundled lists, so the
 * storefront's own markets never flash a loading state; everywhere else is
 * fetched once and cached.
 */
export function useRegions(country: string | undefined | null): UseRegionsResult {
  const code = (country || "").toUpperCase()
  const bundled = regionsFor(code)

  const [regions, setRegions] = useState<Region[]>(() => bundled.length ? bundled : cache.get(code) ?? [])
  const [loading, setLoading] = useState(() => !bundled.length && !cache.has(code) && Boolean(code))

  useEffect(() => {
    if (!code) {
      setRegions([])
      setLoading(false)
      return
    }

    const local = regionsFor(code)
    if (local.length) {
      setRegions(local)
      setLoading(false)
      return
    }

    const known = cache.get(code)
    if (known) {
      setRegions(known)
      setLoading(false)
      return
    }

    let active = true
    setLoading(true)
    loadRegions(code).then((result) => {
      // The shopper may have changed country while this was in flight; applying
      // a stale list would offer provinces from the wrong place.
      if (!active) return
      setRegions(result)
      setLoading(false)
    })

    return () => {
      active = false
    }
  }, [code])

  return { regions, loading }
}
