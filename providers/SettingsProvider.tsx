"use client"

import React, { createContext, useContext, useState, useEffect } from "react"

interface SettingsContextType {
  settings: Record<string, string>
  storeName: string
  loading: boolean
}

const defaultContext: SettingsContextType = {
  settings: {},
  storeName: "My Store",
  loading: true
}

const SettingsContext = createContext<SettingsContextType>(defaultContext)

// `initialSettings` is passed down from the root layout, which already loads
// settings server-side. With it there is nothing to fetch: consumers such as
// ProductCard get the store name on first paint instead of after a round trip,
// which also removes the price/brand-line flash that reflow caused.
//
// The fetch is kept as the fallback for any tree that renders this provider
// without the prop.
export function SettingsProvider({
  children,
  initialSettings,
}: {
  children: React.ReactNode
  initialSettings?: Record<string, string>
}) {
  const [settings, setSettings] = useState<Record<string, string>>(initialSettings ?? {})
  const [loading, setLoading] = useState(!initialSettings)

  useEffect(() => {
    if (initialSettings) return

    async function fetchSettings() {
      try {
        const res = await fetch("/api/settings")
        if (res.ok) {
          const text = await res.text()
          if (text && text.trim().startsWith("{")) {
            const data = JSON.parse(text)
            setSettings(data)
          }
        }
      } catch (err) {
        console.error("Failed to fetch settings", err)
      } finally {
        setLoading(false)
      }
    }
    fetchSettings()
  }, [initialSettings])

  const storeName = settings["brand_store_name"] || "My Store"

  return (
    <SettingsContext.Provider value={{ settings, storeName, loading }}>
      {children}
    </SettingsContext.Provider>
  )
}

export function useSettings() {
  return useContext(SettingsContext)
}
