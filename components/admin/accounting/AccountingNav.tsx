"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { BookOpen, FileText, LayoutDashboard, ListTree, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"

const TABS = [
  { href: "/admin/accounting", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/admin/accounting/accounts", label: "Accounts", icon: ListTree, exact: false },
  { href: "/admin/accounting/journal", label: "Journal", icon: BookOpen, exact: false },
  { href: "/admin/accounting/expenses", label: "Expenses", icon: Receipt, exact: false },
  { href: "/admin/accounting/reports", label: "Reports", icon: FileText, exact: false },
]

/** Tab strip shared by every accounting page. */
export default function AccountingNav() {
  const pathname = usePathname()
  return (
    <nav className="flex items-center gap-1 rounded-lg border border-border bg-card p-1 w-fit max-w-full overflow-x-auto">
      {TABS.map((tab) => {
        const active = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors",
              active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </Link>
        )
      })}
    </nav>
  )
}
