import { prisma } from "@/lib/prisma"
import { sanitizePermissions } from "@/lib/permissions"

type DefaultRole = {
  name: string
  slug: string
  description: string
  permissions: string[]
}

/**
 * Roles every install starts with. They are created once and never
 * overwritten afterwards, so an admin can reshape them freely — only deletion
 * is blocked (`isSystem`).
 */
export const DEFAULT_ROLES: DefaultRole[] = [
  {
    name: "Order Manager",
    slug: "order-manager",
    description: "Runs fulfilment: full control of orders, deliveries and returns; read-only catalog, stock, customers and reports.",
    permissions: [
      "dashboard.view",
      "orders.manage",
      "deliveries.manage",
      "returns.manage",
      "products.view",
      "inventory.view",
      "users.view",
      "reports.view",
    ],
  },
  {
    name: "Catalog Manager",
    slug: "catalog-manager",
    description: "Owns the storefront catalog: products, categories, collections, banners, attributes, media and menus.",
    permissions: [
      "dashboard.view",
      "products.manage",
      "categories.manage",
      "collections.manage",
      "banners.manage",
      "attributes.manage",
      "media.manage",
      "menus.manage",
    ],
  },
  {
    name: "Support Agent",
    slug: "support-agent",
    description: "Handles customer contact: sees orders, customers, messages, reviews and Q&A; processes returns.",
    permissions: [
      "dashboard.view",
      "orders.view",
      "users.view",
      "messages.view",
      "reviews.view",
      "questions.view",
      "returns.manage",
    ],
  },
  {
    name: "Accountant",
    slug: "accountant",
    description: "Keeps the books: full accounting access plus read-only reports and orders.",
    permissions: ["dashboard.view", "accounting.manage", "reports.view", "orders.view"],
  },
]

/**
 * Create any default role that does not exist yet. Idempotent and cheap —
 * one upsert per default with an empty `update`, so existing rows (and any
 * edits an admin has made to them) are left untouched.
 */
export async function ensureDefaultRoles() {
  for (const role of DEFAULT_ROLES) {
    await prisma.adminRole.upsert({
      where: { slug: role.slug },
      update: {},
      create: {
        name: role.name,
        slug: role.slug,
        description: role.description,
        permissions: sanitizePermissions(role.permissions),
        isSystem: true,
      },
    })
  }
}

export function slugifyRole(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "")
}
