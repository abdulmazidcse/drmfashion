"use client"

import { useEffect, useState } from "react"
import { LogOut, ExternalLink, Search, Settings, Menu, User } from "lucide-react"
import Link from "next/link"
import api from "@/lib/axios"
import { useAdminSidebar } from "@/providers/AdminSidebarProvider"
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
  const [admin, setAdmin] = useState<{ name: string; email: string; role: string } | null>(null)

  useEffect(() => {
    async function fetchProfile() {
      try {
        const res = await api.get("/admin/profile")
        setAdmin({ name: res.data.name, email: res.data.email, role: res.data.role })
      } catch (err) {
        console.error("Failed to load admin profile", err)
      }
    }
    fetchProfile()
  }, [])

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
                <p className="text-[11px] font-medium text-muted-foreground capitalize">
                  {admin?.role ? admin.role.toLowerCase() : "Admin"}
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
            <DropdownMenuItem asChild>
              <Link href="/admin/settings">
                <Settings className="size-4" /> Settings
              </Link>
            </DropdownMenuItem>
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
