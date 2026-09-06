/**
 * Rename the singular `man-` / `woman-` slug prefixes to `men-` / `women-`.
 *
 * Category slugs and MenuItem urls have to move together — a renamed category
 * with a stale menu url is a 404 — so both run inside one transaction.
 *
 *   npx tsx scripts/rename-gender-slugs.ts           # dry run, changes nothing
 *   npx tsx scripts/rename-gender-slugs.ts --apply   # commit
 *
 * Safe to run twice: rows already renamed no longer match the prefixes.
 */
import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const APPLY = process.argv.includes("--apply")

/** man-jeans → men-jeans, woman-tops → women-tops. Anything else is untouched. */
function renameSlug(slug: string): string | null {
  if (slug.startsWith("man-")) return `men-${slug.slice(4)}`
  if (slug.startsWith("woman-")) return `women-${slug.slice(6)}`
  return null
}

function renameUrl(url: string): string | null {
  let next = url
    .replace(/\/category\/man-/g, "/category/men-")
    .replace(/\/category\/woman-/g, "/category/women-")
    // `?category=man` points at a slug that never existed — the shop page
    // silently falls back to showing everything.
    .replace(/([?&]category=)man\b/g, "$1men")
    .replace(/([?&]category=)woman\b/g, "$1women")
  return next === url ? null : next
}

async function main() {
  console.log(APPLY ? "APPLY — writing changes\n" : "DRY RUN — nothing will be written\n")

  const categories = await prisma.category.findMany({ select: { id: true, slug: true } })
  const catChanges = categories
    .map((c) => ({ id: c.id, from: c.slug, to: renameSlug(c.slug) }))
    .filter((c): c is { id: string; from: string; to: string } => c.to !== null)

  const menus = await prisma.menuItem.findMany({ select: { id: true, title: true, url: true } })
  const menuChanges = menus
    .map((m) => ({ id: m.id, title: m.title, from: m.url, to: renameUrl(m.url || "") }))
    .filter((m): m is { id: string; title: string; from: string; to: string } => m.to !== null)

  console.log(`Categories to rename: ${catChanges.length}`)
  catChanges.forEach((c) => console.log(`  ${c.from}  →  ${c.to}`))
  console.log(`\nMenu items to rewrite: ${menuChanges.length}`)
  menuChanges.forEach((m) => console.log(`  [${m.title}] ${m.from}  →  ${m.to}`))

  // slug is @unique — a collision would abort mid-transaction, so check first.
  const existing = new Set(categories.map((c) => c.slug))
  const collisions = catChanges.filter((c) => existing.has(c.to))
  if (collisions.length) {
    console.error("\nABORT — target slugs already in use:")
    collisions.forEach((c) => console.error(`  ${c.to}`))
    return
  }

  if (!APPLY) {
    console.log("\nRe-run with --apply to commit.")
    return
  }

  await prisma.$transaction([
    ...catChanges.map((c) =>
      prisma.category.update({ where: { id: c.id }, data: { slug: c.to } })
    ),
    ...menuChanges.map((m) =>
      prisma.menuItem.update({ where: { id: m.id }, data: { url: m.to } })
    ),
  ])

  console.log(`\nDone — ${catChanges.length} categories, ${menuChanges.length} menu items.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exitCode = 1
  })
  .finally(() => prisma.$disconnect())
