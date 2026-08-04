"use client"

import { createContext, useContext, useState, ReactNode } from "react"

interface AdminSidebarContextType {
  collapsed: boolean
  toggle: () => void
}

const AdminSidebarContext = createContext<AdminSidebarContextType>({
  collapsed: false,
  toggle: () => {},
})

export function AdminSidebarProvider({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false)

  return (
    <AdminSidebarContext.Provider value={{ collapsed, toggle: () => setCollapsed((c) => !c) }}>
      {children}
    </AdminSidebarContext.Provider>
  )
}

export function useAdminSidebar() {
  return useContext(AdminSidebarContext)
}
