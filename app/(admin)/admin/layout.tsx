"use client"

import { ReactNode } from "react"

import AdminSidebar from "@/components/admin/AdminSidebar"
import AdminHeader from "@/components/admin/AdminHeader"
import { AdminSidebarProvider, useAdminSidebar } from "@/providers/AdminSidebarProvider"

type Props = {
  children: ReactNode
}

function AdminLayoutInner({ children }: Props) {
  const { collapsed } = useAdminSidebar()

  return (
    <div className="admin min-h-screen bg-zinc-100 text-foreground overflow-x-hidden">
      <AdminSidebar />

      <div className={`${collapsed ? "ml-20" : "ml-72"} min-w-0 overflow-x-hidden transition-[margin] duration-200`}>
        <AdminHeader />
        <main className="p-6 overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  )
}

export default function AdminLayout({
  children,
}: Props) {
  return (
    <AdminSidebarProvider>
      <AdminLayoutInner>{children}</AdminLayoutInner>
    </AdminSidebarProvider>
  )
}
