/**
 * Puts the menswear links in the order the shop asked for:
 *
 *   Blazer > Waistcoat > Pant > Complete Suit > Panjabi > Panjabi Waistcoat > Payjama
 *
 * Two separate things carry that order, which is why this touches both:
 *
 *   - MenuItem.position drives the header's mega menu.
 *   - Category.sortOrder drives every category listing on the storefront
 *     (/category, the collection pages, the trending grids).
 *
 * Rows are matched on their parent's name plus their own, never on an id, so
 * the same script runs against dev and production without editing. Anything not
 * named below keeps the position it already has, appended after the named ones
 * in whatever order it was already in — "Brunch" and "Tie" are not in the
 * shop's list and are meant to stay where they are, not disappear to the top.
 *
 * Idempotent: running it twice changes nothing the second time.
 *
 *   node scripts/set-menswear-order.mjs          # apply
 *   node scripts/set-menswear-order.mjs --dry    # print what it would do
 */

import { PrismaClient } from "@prisma/client"

const prisma = new PrismaClient()
const dryRun = process.argv.includes("--dry")

/**
 * Parent name -> the children that have a place, in that place's order. The
 * shop writes "Waistcoat" and "Pant"; the catalogue calls them "Blazer
 * Waistcoat" and "Formal Pant", and the catalogue's spelling is what matches.
 */
const ORDER = {
  Men: ["Premium Blazer For Men", "Premium Panjabi For Men"],
  "Premium Blazer For Men": ["Blazer", "Blazer Waistcoat", "Formal Pant", "Complete Suit"],
  "Premium Panjabi For Men": ["Panjabi", "Panjabi Waistcoat", "Payjama"],
}

/**
 * Ranks `siblings` by the wanted list: named rows first in the order given,
 * everything else after, keeping the order it already had.
 */
function ranked(siblings, wanted, nameOf, currentRankOf) {
  const wantedIndex = new Map(wanted.map((name, i) => [name, i]))

  return [...siblings]
    .sort((a, b) => {
      const ai = wantedIndex.has(nameOf(a)) ? wantedIndex.get(nameOf(a)) : Infinity
      const bi = wantedIndex.has(nameOf(b)) ? wantedIndex.get(nameOf(b)) : Infinity
      if (ai !== bi) return ai - bi
      return currentRankOf(a) - currentRankOf(b)
    })
    .map((row, index) => ({ row, index }))
}

async function orderMenuItems() {
  const items = await prisma.menuItem.findMany({
    select: { id: true, title: true, parentId: true, position: true },
  })
  const byId = new Map(items.map((i) => [i.id, i]))
  const updates = []

  for (const [parentName, wanted] of Object.entries(ORDER)) {
    const parents = items.filter((i) => i.title === parentName)
    for (const parent of parents) {
      const children = items.filter((i) => i.parentId === parent.id)
      if (children.length === 0) continue

      for (const { row, index } of ranked(children, wanted, (r) => r.title, (r) => r.position)) {
        if (row.position !== index) updates.push({ row, index, parent: parent.title })
      }
    }
  }

  for (const { row, index, parent } of updates) {
    console.log(`menu   ${parent} > ${row.title}: ${row.position} -> ${index}`)
    if (!dryRun) {
      await prisma.menuItem.update({ where: { id: row.id }, data: { position: index } })
    }
  }

  // Named but absent is worth saying out loud: a typo in ORDER would otherwise
  // look exactly like a clean run.
  for (const [parentName, wanted] of Object.entries(ORDER)) {
    const parent = items.find((i) => i.title === parentName)
    if (!parent) continue
    const childNames = new Set(items.filter((i) => i.parentId === parent.id).map((i) => i.title))
    for (const name of wanted) {
      if (!childNames.has(name)) console.warn(`menu   no "${name}" under "${parentName}"`)
    }
  }

  void byId
  return updates.length
}

async function orderCategories() {
  const cats = await prisma.category.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, parentId: true, sortOrder: true, createdAt: true },
  })
  const updates = []

  for (const [parentName, wanted] of Object.entries(ORDER)) {
    const parents = cats.filter((c) => c.name === parentName)
    for (const parent of parents) {
      const children = cats.filter((c) => c.parentId === parent.id)
      if (children.length === 0) continue

      // `createdAt` is the tie-break the storefront itself falls back to, so an
      // unnamed category lands where it already appeared rather than jumping.
      const rows = ranked(children, wanted, (r) => r.name, (r) => r.createdAt.getTime())
      for (const { row, index } of rows) {
        if (row.sortOrder !== index) updates.push({ row, index, parent: parent.name })
      }
    }
  }

  for (const { row, index, parent } of updates) {
    console.log(`cat    ${parent} > ${row.name}: ${row.sortOrder} -> ${index}`)
    if (!dryRun) {
      await prisma.category.update({ where: { id: row.id }, data: { sortOrder: index } })
    }
  }

  for (const [parentName, wanted] of Object.entries(ORDER)) {
    const parent = cats.find((c) => c.name === parentName)
    if (!parent) continue
    const childNames = new Set(cats.filter((c) => c.parentId === parent.id).map((c) => c.name))
    for (const name of wanted) {
      if (!childNames.has(name)) console.warn(`cat    no "${name}" under "${parentName}"`)
    }
  }

  return updates.length
}

const menu = await orderMenuItems()
const cats = await orderCategories()

console.log(
  dryRun
    ? `\nDry run: ${menu} menu item(s) and ${cats} category(ies) would move.`
    : `\nDone: ${menu} menu item(s) and ${cats} category(ies) moved.`
)

await prisma.$disconnect()
