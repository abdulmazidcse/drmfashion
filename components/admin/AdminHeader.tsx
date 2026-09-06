"use client"

import { useState } from "react"
import { LogOut, ExternalLink, Search, Settings, Menu, User, Check, RefreshCw } from "lucide-react"
import Link from "next/link"
import api from "@/lib/axios"
import { useAdminSidebar } from "@/providers/AdminSidebarProvider"
import { useAdminAccess } from "@/providers/AdminAccessProvider"
import DeleteDataDialog from "@/components/admin/DeleteDataDialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function AdminHeader() {
  const { toggle } = useAdminSidebar()
  // Identity comes from AdminAccessProvider (one /api/admin/me call for the
  // whole panel) instead of a second profile fetch here.
  const { user: admin, can } = useAdminAccess()
  const [cacheState, setCacheState] = useState<"idle" | "clearing" | "done">("idle")

  const roleLabel = admin
    ? admin.role === "STAFF"
      ? `Staff${admin.adminRole ? ` · ${admin.adminRole.name}` : ""}`
      : admin.role.toLowerCase()
    : "Admin"

  async function handleClearCache() {
    if (cacheState === "clearing") return
    setCacheState("clearing")
    try {
      await api.post("/admin/cache/purge")
      setCacheState("done")
      setTimeout(() => setCacheState("idle"), 2000)
    } catch (err) {
      console.error("Failed to clear cache", err)
      setCacheState("idle")
      alert("Could not clear the cache. Please try again.")
    }
  }

  async function handleLogout() {
    try {
      await api.post("/auth/logout")
      window.location.href = "/admin-login"
    } catch (err) {
      console.error("Logout failed", err)
    }
  }

  const initials =
    admin?.name
      ?.split(" ")
      .map((n) => n[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase() || "AD"

  return (
    <header className="h-16 mx-4 mt-4 px-3 flex items-center justify-between gap-4 rounded-xl border border-border bg-card/80 backdrop-blur-sm shadow-sm no-print">
      {/* LEFT: toggle + search */}
      <div className="flex items-center gap-2 flex-1 min-w-0 max-w-md">
        <Button
          onClick={toggle}
          variant="ghost"
          size="icon"
          aria-label="Toggle sidebar"
          className="rounded-full text-muted-foreground shrink-0"
        >
          <Menu className="size-5" strokeWidth={2} />
        </Button>

        <div className="relative flex-1 min-w-0 hidden sm:block">
          <Search className="size-4 text-muted-foreground absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <Input
            type="search"
            placeholder="Search..."
            aria-label="Search"
            className="h-10 pl-10 rounded-full bg-muted/60 border-transparent focus-visible:bg-card"
          />
        </div>
      </div>

      {/* RIGHT: actions + profile */}
      <div className="flex items-center gap-1 shrink-0">
        {can("settings.manage") && (
        <Button
          onClick={handleClearCache}
          disabled={cacheState === "clearing"}
          variant="ghost"
          size="sm"
          className="rounded-full text-muted-foreground gap-1.5 px-2 sm:px-3"
          title="Clear cached storefront data"
          aria-label="Clear Cache"
        >
          {cacheState === "done" ? (
            <Check className="size-[18px] text-emerald-600" />
          ) : (
            <RefreshCw
              className={`size-[18px] ${cacheState === "clearing" ? "animate-spin" : ""}`}
            />
          )}
          <span className="hidden md:inline text-xs font-medium">
            {cacheState === "clearing"
              ? "Clearing..."
              : cacheState === "done"
                ? "Cleared"
                : "Clear Cache"}
          </span>
        </Button>
        )}

        {can("settings.manage") && <DeleteDataDialog />}

        <Button
          asChild
          variant="ghost"
          size="icon"
          className="rounded-full text-muted-foreground"
          title="View Website"
        >
          <Link href="/" target="_blank" aria-label="View Website">
            <ExternalLink className="size-[18px]" />
          </Link>
        </Button>

        {can("settings.view") && (
          <Button
            asChild
            variant="ghost"
            size="icon"
            className="rounded-full text-muted-foreground"
            title="Settings"
          >
            <Link href="/admin/settings" aria-label="Settings">
              <Settings className="size-[18px]" />
            </Link>
          </Button>
        )}

        <span className="w-px h-8 bg-border mx-1.5 hidden sm:block" />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center gap-2.5 rounded-full pl-1 pr-1 sm:pr-2.5 py-1 hover:bg-muted transition-colors cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
              aria-label="Account menu"
            >
              <div className="relative shrink-0">
                <Avatar className="size-9 border border-border">
                  <AvatarFallback className="bg-primary text-primary-foreground text-xs font-semibold">
                    {initials}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute bottom-0 right-0 size-2.5 rounded-full bg-emerald-500 border-2 border-card" />
              </div>
              <div className="hidden sm:block text-left leading-tight">
                <p className="text-[11px] font-medium text-muted-foreground capitalize truncate max-w-[180px]">
                  {roleLabel}
                </p>
                <p className="text-xs font-semibold text-foreground">{admin?.name || "Admin"}</p>
              </div>
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="flex flex-col gap-0.5">
              <span className="text-sm font-semibold">{admin?.name || "Admin"}</span>
              <span className="text-xs font-normal text-muted-foreground truncate">
                {admin?.email || ""}
              </span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin/profile">
                <User className="size-4" /> Profile
              </Link>
            </DropdownMenuItem>
            {can("settings.view") && (
              <DropdownMenuItem asChild>
                <Link href="/admin/settings">
                  <Settings className="size-4" /> Settings
                </Link>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={handleLogout}
              className="text-destructive focus:text-destructive"
            >
              <LogOut className="size-4 text-destructive" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
