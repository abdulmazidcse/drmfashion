"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from "react"
import api from "@/lib/axios"
import { hasPermission } from "@/lib/permissions"

export type AdminAccessUser = {
  id: string
  name: string
  email: string
  role: "ADMIN" | "STAFF"
  adminRole: { id: string; name: string } | null
  permissions: string[]
}

interface AdminAccessContextType {
  user: AdminAccessUser | null
  loading: boolean
  /** True when the signed-in user holds `key` (e.g. "orders.manage"). ADMIN always does. */
  can: (key: string) => boolean
  refresh: () => Promise<void>
}

const AdminAccessContext = createContext<AdminAccessContextType>({
  user: null,
  loading: true,
  can: () => false,
  refresh: async () => {},
})

/**
 * Fetches /api/admin/me once per admin-panel session and exposes the live
 * permission list so the sidebar and header can hide what the user cannot
 * open. Purely cosmetic — proxy.ts and getAdminPayload are the real gates.
 */
async function fetchMe(): Promise<AdminAccessUser | null> {
  try {
    const res = await api.get("/admin/me")
    return res.data as AdminAccessUser
  } catch (err) {
    console.error("Failed to load admin access", err)
    return null
  }
}

export function AdminAccessProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AdminAccessUser | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(
    () =>
      fetchMe().then((me) => {
        setUser(me)
        setLoading(false)
      }),
    []
  )

  useEffect(() => {
    let cancelled = false
    fetchMe().then((me) => {
      if (cancelled) return
      setUser(me)
      setLoading(false)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const can = useCallback(
    (key: string) => (user ? hasPermission(user.permissions, user.role, key) : false),
    [user]
  )

  const value = useMemo(() => ({ user, loading, can, refresh }), [user, loading, can, refresh])

  return <AdminAccessContext.Provider value={value}>{children}</AdminAccessContext.Provider>
}

export function useAdminAccess() {
  return useContext(AdminAccessContext)
}
