"use client"

import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { useAdminSidebar } from "@/providers/AdminSidebarProvider"
import { useSettings } from "@/providers/SettingsProvider"
import { useAdminAccess } from "@/providers/AdminAccessProvider"
import { moduleForPath } from "@/lib/permissions"

import {
  LayoutDashboard,
  BarChart3,
  ShoppingCart, // kept for the commented-out POS Checkout link below
  ClipboardList,
  Shirt,
  FolderTree,
  PanelsTopLeft,
  Tag,
  Palette,
  Ruler,
  PencilRuler,
  MoveVertical,
  Package,
  Image as ImageIcon,
  Barcode,
  Boxes,
  PackagePlus,
  Warehouse,
  RotateCcw,
  Users,
  Ticket,
  Gift,
  Star,
  HelpCircle,
  Mail,
  MailPlus,
  MessageSquare,
  Settings,
  FileText,
  Newspaper,
  Truck,
  Percent,
  Layers,
  GalleryHorizontal,
  PackageCheck,
  LineChart,
  AlertTriangle,
  Calculator,
  ShieldCheck,
  ChevronDown,
  type LucideIcon,
} from "lucide-react"

import { useMemo, useState } from "react"

type NavLink = { label: string; href: string; icon: LucideIcon }
type NavGroup = { title: string; links: NavLink[] }

const navGroups: NavGroup[] = [
  {
    title: "Main",
    links: [
      { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
      { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
    ],
  },
  {
    title: "E-Commerce",
    links: [
      // Hidden for now — the /admin/pos page itself is still in place.
      // { label: "POS Checkout", href: "/admin/pos", icon: ShoppingCart },
      { label: "Orders", href: "/admin/orders", icon: ClipboardList },
      { label: "Products", href: "/admin/products", icon: Shirt },
      { label: "SKU List", href: "/admin/skus", icon: Barcode },
      { label: "Categories", href: "/admin/categories", icon: FolderTree },
      { label: "Collections", href: "/admin/collections", icon: Layers },
      { label: "Banners", href: "/admin/banners", icon: GalleryHorizontal },
      { label: "Menu Builder", href: "/admin/menus", icon: PanelsTopLeft },
    ],
  },
  {
    title: "Attributes",
    links: [
      { label: "Brands", href: "/admin/brands", icon: Tag },
      { label: "Colors", href: "/admin/colors", icon: Palette },
      { label: "Sizes", href: "/admin/sizes", icon: Ruler },
      { label: "Size Packages", href: "/admin/size-packages", icon: Package },
      { label: "Custom Measurements", href: "/admin/measurements", icon: PencilRuler },
      { label: "Size Charts", href: "/admin/size-charts", icon: Ruler },
      { label: "Lengths", href: "/admin/lengths", icon: MoveVertical },
      { label: "Media Library", href: "/admin/media", icon: ImageIcon },
    ],
  },
  {
    title: "Operations",
    links: [
      { label: "Inventory", href: "/admin/inventory", icon: Boxes },
      { label: "Purchases", href: "/admin/purchases", icon: PackagePlus },
      { label: "Suppliers", href: "/admin/suppliers", icon: Warehouse },
      { label: "Deliveries", href: "/admin/deliveries", icon: PackageCheck },
      { label: "Returns & Refunds", href: "/admin/returns", icon: RotateCcw },
    ],
  },
  {
    title: "Reports",
    links: [
      { label: "Sales Report", href: "/admin/reports/sales", icon: LineChart },
      { label: "Low Stock Report", href: "/admin/reports/low-stock", icon: AlertTriangle },
    ],
  },
  {
    title: "Finance",
    links: [
      { label: "Accounting", href: "/admin/accounting", icon: Calculator },
    ],
  },
  {
    title: "Marketing & Users",
    links: [
      { label: "Users", href: "/admin/users", icon: Users },
      { label: "Promo Codes", href: "/admin/coupons", icon: Ticket },
      { label: "Gift Cards", href: "/admin/gift-cards", icon: Gift },
      { label: "Reviews", href: "/admin/reviews", icon: Star },
      { label: "Product Q&A", href: "/admin/questions", icon: HelpCircle },
      { label: "Journal", href: "/admin/journal", icon: Newspaper },
      { label: "Newsletter", href: "/admin/newsletter", icon: Mail },
      { label: "Subscribers", href: "/admin/subscribers", icon: MailPlus },
      { label: "Messages", href: "/admin/messages", icon: MessageSquare },
    ],
  },
  {
    title: "System",
    links: [
      { label: "Settings", href: "/admin/settings", icon: Settings },
      { label: "Roles & Permissions", href: "/admin/roles", icon: ShieldCheck },
      { label: "Pages", href: "/admin/pages", icon: FileText },
      { label: "Shipping", href: "/admin/settings/shipping", icon: Truck },
      { label: "Tax", href: "/admin/settings/tax", icon: Percent },
    ],
  },
]

export default function AdminSidebar() {
  const pathname = usePathname()
  const { collapsed } = useAdminSidebar()
  const { settings } = useSettings()
  const { can, loading: accessLoading } = useAdminAccess()

  // Only links the user may open. Purely cosmetic — proxy.ts is the gate — but
  // a STAFF member should not see a wall of sections that would 403 on them.
  // Nothing is rendered until /api/admin/me answers, so the menu never flashes
  // from "everything" to "a few items".
  const visibleGroups = useMemo(() => {
    if (accessLoading) return []
    return navGroups
      .map((group) => ({
        ...group,
        links: group.links.filter((link) => {
          const mod = moduleForPath(link.href)
          return mod ? can(`${mod}.view`) : true
        }),
      }))
      .filter((group) => group.links.length > 0)
  }, [accessLoading, can])

  // By default, all groups are open
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>(() => {
    const initialState: Record<string, boolean> = {}
    navGroups.forEach((group) => {
      initialState[group.title] = true
    })
    return initialState
  })

  const toggleGroup = (title: string) => {
    setOpenGroups((prev) => ({ ...prev, [title]: !prev[title] }))
  }

  // Exact match for the dashboard root; prefix match for every other section so
  // sub-pages (e.g. /admin/products/create) keep their parent item highlighted.
  const isActive = (href: string) =>
    pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`))

  return (
    <aside
      className={`admin-sidebar ${collapsed ? "w-20" : "w-72"} h-screen fixed left-0 top-0 z-20 bg-[#131A2E] border-r border-black/20 text-[#AEB4C6] flex flex-col no-print transition-[width] duration-200 ease-out`}
    >
      {/* BRAND SECTION — the wide logo needs horizontal room, so the collapsed
          rail falls back to the square favicon instead of squashing it. */}
      <div className={`h-16 ${collapsed ? "px-2 justify-center" : "px-6 justify-start"} flex items-center shrink-0`}>
        <div className={`relative ${collapsed ? "h-8 w-8" : "h-6 w-32"} transition-[width] duration-200`}>
          {/* The sidebar is dark, so every mark (default or uploaded) is flattened
              to white — a dark uploaded logo would otherwise be invisible here.
              `unoptimized`: Next 16 refuses to optimize images served from local
              IPs unless `dangerouslyAllowLocalIP` is on, so the MinIO-hosted
              favicon 400s in dev. A 32px brand mark gains nothing from the
              optimizer anyway — the .svg default already bypasses it. */}
          <Image
            src={
              collapsed
                ? settings["brand_favicon_url"] || settings["brand_logo_url"] || "/logo.svg"
                : settings["brand_logo_url"] || "/logo.svg"
            }
            alt="Store logo"
            fill
            className={`brightness-0 invert ${collapsed ? "object-contain" : "object-contain object-left"}`}
            priority
            unoptimized
          />
        </div>
      </div>

      {/* NAVIGATION LINKS */}
      <nav className="flex-1 py-3 space-y-5 overflow-y-auto overflow-x-hidden sidebar-scroll">
        {visibleGroups.map((group) => {
          const isOpen = collapsed || openGroups[group.title]

          return (
            <div key={group.title} className="space-y-1">
              {!collapsed && (
                <button
                  onClick={() => toggleGroup(group.title)}
                  className="w-full flex items-center justify-between pl-6 pr-6 pt-1 pb-1.5 group cursor-pointer"
                >
                  <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#6F7690] group-hover:text-[#AEB4C6] transition-colors duration-200">
                    {group.title}
                  </h3>
                  <ChevronDown
                    className={`w-4 h-4 text-[#6F7690] group-hover:text-[#AEB4C6] transition-transform duration-300 ${
                      isOpen ? "rotate-0" : "-rotate-90"
                    }`}
                  />
                </button>
              )}

              <div
                className={`overflow-hidden transition-[max-height] duration-300 ease-in-out ${
                  isOpen ? "max-h-[520px]" : "max-h-0"
                }`}
              >
                <div className="space-y-0.5 px-3">
                  {group.links.map((link) => {
                    const Icon = link.icon
                    const active = isActive(link.href)

                    return (
                      <Link
                        key={link.href}
                        href={link.href}
                        title={collapsed ? link.label : undefined}
                        aria-current={active ? "page" : undefined}
                        className={
                          collapsed
                            ? `group relative flex items-center justify-center w-11 h-11 mx-auto rounded-lg transition-colors duration-200 ease-out ${
                                active
                                  ? "bg-[#4A5FE8] text-white shadow-[0_6px_16px_-6px_rgba(74,95,232,0.5)]"
                                  : "text-[#AEB4C6] hover:bg-white/[0.06] hover:text-white"
                              }`
                            : `group relative flex items-center gap-3 px-3 py-2 rounded-lg transition-colors duration-200 ease-out ${
                                active
                                  ? "bg-[#4A5FE8] text-white shadow-[0_6px_16px_-6px_rgba(74,95,232,0.5)]"
                                  : "text-[#AEB4C6] hover:bg-white/[0.06] hover:text-white"
                              }`
                        }
                      >
                        <Icon
                          size={18}
                          strokeWidth={active ? 2.25 : 2}
                          className={`shrink-0 transition-colors duration-200 ${
                            active ? "text-white" : "text-[#AEB4C6] group-hover:text-white"
                          }`}
                        />
                        {!collapsed && (
                          <span className={`text-sm tracking-tight ${active ? "font-semibold" : "font-medium"}`}>
                            {link.label}
                          </span>
                        )}
                      </Link>
                    )
                  })}
                </div>
              </div>
            </div>
          )
        })}
      </nav>

      {/* FOOTER */}
      {!collapsed && (
        <div className="p-3 border-t border-[#232B40] text-center shrink-0">
          <p className="text-[9px] font-semibold text-[#6F7690] uppercase tracking-[0.15em]">
            Version 1.0.4 • Stable
          </p>
        </div>
      )}
    </aside>
  )
}
