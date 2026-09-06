/**
 * Admin-panel permission model. Pure and client-safe: no Prisma, no Node APIs,
 * so it can be imported from proxy.ts, route handlers and "use client" files.
 *
 * Every admin page and /api/admin route belongs to exactly one *module*. A
 * module has two *actions*: `view` (GET/HEAD) and `manage` (everything else).
 * A permission key is `${module}.${action}`; `manage` implies `view`.
 *
 * ADMIN accounts bypass the check entirely. STAFF accounts carry the
 * permission list of their `AdminRole`; anything not granted is refused by
 * proxy.ts (403 / redirect to /admin/forbidden) and by getAdminPayload.
 */

export type PermissionAction = "view" | "manage"

export type PermissionModule = {
  key: string
  label: string
  group: string
  /** Page path prefixes under /admin. "/admin" itself matches exactly only. */
  paths: string[]
  /** Route-handler path prefixes under /api/admin. */
  apiPaths: string[]
}

export const PERMISSION_ACTIONS: PermissionAction[] = ["view", "manage"]

export const PERMISSION_MODULES: PermissionModule[] = [
  // ── Main ──────────────────────────────────────────────────────────────
  { key: "dashboard", label: "Dashboard", group: "Main", paths: ["/admin"], apiPaths: ["/api/admin/dashboard"] },
  { key: "analytics", label: "Analytics", group: "Main", paths: ["/admin/analytics"], apiPaths: ["/api/admin/analytics"] },

  // ── E-Commerce ────────────────────────────────────────────────────────
  { key: "orders", label: "Orders", group: "E-Commerce", paths: ["/admin/orders", "/admin/pos"], apiPaths: ["/api/admin/orders"] },
  {
    key: "products",
    label: "Products & SKUs",
    group: "E-Commerce",
    paths: ["/admin/products", "/admin/skus"],
    apiPaths: ["/api/admin/products", "/api/admin/skus", "/api/admin/variants"],
  },
  { key: "categories", label: "Categories", group: "E-Commerce", paths: ["/admin/categories"], apiPaths: ["/api/admin/categories"] },
  { key: "collections", label: "Collections", group: "E-Commerce", paths: ["/admin/collections"], apiPaths: ["/api/admin/collections"] },
  { key: "banners", label: "Banners", group: "E-Commerce", paths: ["/admin/banners"], apiPaths: ["/api/admin/banners"] },
  { key: "menus", label: "Menu Builder", group: "E-Commerce", paths: ["/admin/menus"], apiPaths: ["/api/admin/menus"] },

  // ── Attributes ────────────────────────────────────────────────────────
  {
    key: "attributes",
    label: "Attributes (brands, colors, sizes, charts, lengths)",
    group: "Attributes",
    paths: [
      "/admin/brands",
      "/admin/colors",
      "/admin/sizes",
      "/admin/size-packages",
      "/admin/measurements",
      "/admin/size-charts",
      "/admin/lengths",
    ],
    apiPaths: [
      "/api/admin/brands",
      "/api/admin/colors",
      "/api/admin/sizes",
      "/api/admin/size-packages",
      "/api/admin/measurements",
      "/api/admin/size-charts",
      "/api/admin/lengths",
    ],
  },
  { key: "media", label: "Media Library", group: "Attributes", paths: ["/admin/media"], apiPaths: ["/api/admin/media", "/api/admin/upload"] },

  // ── Operations ────────────────────────────────────────────────────────
  { key: "inventory", label: "Inventory", group: "Operations", paths: ["/admin/inventory"], apiPaths: ["/api/admin/inventory"] },
  { key: "purchases", label: "Purchases", group: "Operations", paths: ["/admin/purchases"], apiPaths: ["/api/admin/purchases"] },
  { key: "suppliers", label: "Suppliers", group: "Operations", paths: ["/admin/suppliers"], apiPaths: ["/api/admin/suppliers"] },
  { key: "deliveries", label: "Deliveries", group: "Operations", paths: ["/admin/deliveries"], apiPaths: ["/api/admin/deliveries"] },
  { key: "returns", label: "Returns & Refunds", group: "Operations", paths: ["/admin/returns"], apiPaths: ["/api/admin/returns"] },

  // ── Reports & Finance ─────────────────────────────────────────────────
  { key: "reports", label: "Reports", group: "Reports", paths: ["/admin/reports"], apiPaths: ["/api/admin/reports"] },
  { key: "accounting", label: "Accounting", group: "Finance", paths: ["/admin/accounting"], apiPaths: ["/api/admin/accounting"] },

  // ── Marketing & Users ─────────────────────────────────────────────────
  { key: "users", label: "Users", group: "Marketing & Users", paths: ["/admin/users"], apiPaths: ["/api/admin/users"] },
  {
    key: "coupons",
    label: "Promo Codes & Gift Cards",
    group: "Marketing & Users",
    paths: ["/admin/coupons", "/admin/gift-cards"],
    apiPaths: ["/api/admin/coupons", "/api/admin/gift-cards"],
  },
  { key: "reviews", label: "Reviews", group: "Marketing & Users", paths: ["/admin/reviews"], apiPaths: ["/api/admin/reviews"] },
  { key: "questions", label: "Product Q&A", group: "Marketing & Users", paths: ["/admin/questions"], apiPaths: ["/api/admin/questions"] },
  { key: "journal", label: "Journal", group: "Marketing & Users", paths: ["/admin/journal"], apiPaths: ["/api/admin/journal"] },
  {
    key: "newsletter",
    label: "Newsletter & Subscribers",
    group: "Marketing & Users",
    paths: ["/admin/newsletter", "/admin/subscribers"],
    apiPaths: ["/api/admin/newsletter", "/api/admin/subscribers"],
  },
  { key: "messages", label: "Messages", group: "Marketing & Users", paths: ["/admin/messages"], apiPaths: ["/api/admin/messages"] },

  // ── System ────────────────────────────────────────────────────────────
  {
    key: "settings",
    label: "Settings (incl. shipping, tax, cache & data purge)",
    group: "System",
    paths: ["/admin/settings"],
    apiPaths: ["/api/admin/settings", "/api/admin/cache", "/api/admin/data"],
  },
  { key: "pages", label: "Pages", group: "System", paths: ["/admin/pages"], apiPaths: ["/api/admin/pages"] },
  { key: "roles", label: "Roles & Permissions", group: "System", paths: ["/admin/roles"], apiPaths: ["/api/admin/roles"] },
]

/** Group names in the order the sidebar / permission matrix should show them. */
export const PERMISSION_GROUPS: string[] = PERMISSION_MODULES.reduce<string[]>((acc, m) => {
  if (!acc.includes(m.group)) acc.push(m.group)
  return acc
}, [])

export const ALL_PERMISSIONS: string[] = PERMISSION_MODULES.flatMap((m) =>
  PERMISSION_ACTIONS.map((a) => `${m.key}.${a}`)
)

const PERMISSION_SET = new Set(ALL_PERMISSIONS)

export function isPermission(key: unknown): key is string {
  return typeof key === "string" && PERMISSION_SET.has(key)
}

/**
 * Paths every signed-in admin-panel user may open regardless of role: their
 * own profile, the forbidden page and the /api/admin/me identity endpoint.
 */
const ALWAYS_ALLOWED_PREFIXES = ["/admin/profile", "/admin/forbidden", "/api/admin/profile", "/api/admin/me"]

/**
 * Admin paths that match no module resolve to this pseudo-module. It is not in
 * ALL_PERMISSIONS, so no role can ever hold it: ADMIN still passes (role
 * bypass) while STAFF is refused — unmapped routes fail closed.
 */
export const RESTRICTED_MODULE = "restricted"

function matchesPrefix(pathname: string, prefix: string): boolean {
  if (pathname === prefix) return true
  // The dashboard root is exact-only; otherwise it would swallow every
  // /admin/* page that has a more specific owner.
  if (prefix === "/admin") return false
  return pathname.startsWith(`${prefix}/`)
}

function isAdminPath(pathname: string): boolean {
  return (
    pathname === "/admin" ||
    pathname.startsWith("/admin/") ||
    pathname === "/api/admin" ||
    pathname.startsWith("/api/admin/")
  )
}

function isAlwaysAllowed(pathname: string): boolean {
  return ALWAYS_ALLOWED_PREFIXES.some((p) => matchesPrefix(pathname, p))
}

/**
 * Resolve the module that owns a path (page or API). Longest matching prefix
 * wins. Returns null for non-admin paths, always-allowed paths and admin paths
 * with no owner (see permissionForRequest for how the latter are gated).
 */
export function moduleForPath(pathname: string): string | null {
  const clean = normalize(pathname)
  if (!isAdminPath(clean) || isAlwaysAllowed(clean)) return null

  let best: { key: string; length: number } | null = null
  for (const mod of PERMISSION_MODULES) {
    for (const prefix of [...mod.paths, ...mod.apiPaths]) {
      if (matchesPrefix(clean, prefix) && (!best || prefix.length > best.length)) {
        best = { key: mod.key, length: prefix.length }
      }
    }
  }
  return best?.key ?? null
}

/**
 * Permission a request must hold. GET/HEAD/OPTIONS need `view`, every other
 * method needs `manage`. Null means "no permission check applies" — either
 * the path is outside the admin panel or it is always allowed.
 */
export function permissionForRequest(
  pathname: string,
  method: string
): { module: string; action: PermissionAction } | null {
  const clean = normalize(pathname)
  if (!isAdminPath(clean) || isAlwaysAllowed(clean)) return null

  const action: PermissionAction = ["GET", "HEAD", "OPTIONS"].includes(method.toUpperCase()) ? "view" : "manage"
  const mod = moduleForPath(clean)
  return { module: mod ?? RESTRICTED_MODULE, action }
}

/**
 * Does a user with `role` and permission list `perms` hold `key`?
 * ADMIN always does; `manage` implies `view`.
 */
export function hasPermission(perms: string[] | null | undefined, role: string, key: string): boolean {
  if (role === "ADMIN") return true
  if (!Array.isArray(perms) || perms.length === 0) return false
  if (perms.includes(key)) return true
  const dot = key.lastIndexOf(".")
  if (dot === -1) return false
  const mod = key.slice(0, dot)
  const action = key.slice(dot + 1)
  return action === "view" && perms.includes(`${mod}.manage`)
}

/** Drop anything that is not a known permission key; dedupe; stable order. */
export function sanitizePermissions(input: unknown): string[] {
  if (!Array.isArray(input)) return []
  const wanted = new Set(input.filter(isPermission))
  return ALL_PERMISSIONS.filter((p) => wanted.has(p))
}

function normalize(pathname: string): string {
  if (!pathname) return "/"
  // Strip a trailing slash so "/admin/orders/" and "/admin/orders" agree.
  return pathname.length > 1 && pathname.endsWith("/") ? pathname.slice(0, -1) : pathname
}
