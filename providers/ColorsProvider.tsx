"use client"

import React, { createContext, useContext, useMemo } from "react"
import type { StoreColor } from "@/lib/colors"

/**
 * Makes the Color table available to client components that only know a colour
 * by name — ProductCard above all, which receives `variant.color` as a string
 * and has no way to look up how that colour should be painted.
 *
 * Server-injected from the root layout rather than fetched in the browser, so
 * the first paint of a grid already has real swatches instead of grey
 * placeholders that pop in a moment later.
 */
const ColorsContext = createContext<{
  colors: StoreColor[]
  /** Case-insensitive lookup; returns null when the name has no Color row. */
  getColor: (name: string) => StoreColor | null
}>({ colors: [], getColor: () => null })

export function ColorsProvider({
  children,
  colors = [],
}: {
  children: React.ReactNode
  colors?: StoreColor[]
}) {
  const value = useMemo(() => {
    // Built once per colour list rather than scanning the array inside every
    // card: a grid renders this lookup up to 120 × the number of colourways.
    const byName = new Map(colors.map((c) => [c.name.toLowerCase(), c]))
    return {
      colors,
      getColor: (name: string) => byName.get(name?.toLowerCase?.() ?? "") ?? null,
    }
  }, [colors])

  return <ColorsContext.Provider value={value}>{children}</ColorsContext.Provider>
}

export function useColors() {
  return useContext(ColorsContext)
}
