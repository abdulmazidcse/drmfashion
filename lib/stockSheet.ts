import { formatImageUrl } from "@/lib/utils"

/**
 * Grouping for Admin → Inventory → Stock Sheet (see the route for the why).
 * Pure functions over already-fetched products, so they can be checked
 * against real data without going through the admin API.
 */

export type Kind = "blazer" | "waistcoat" | "pant" | "fullSet" | "other"

export function kindOf(categoryName: string, parentName: string, title: string): Kind {
  const text = `${categoryName} ${parentName} ${title}`.toLowerCase()
  const cat = categoryName.toLowerCase()
  if (/waist\s*coat|koti/.test(cat)) return "waistcoat"
  if (/pant|trouser/.test(cat)) return "pant"
  if (/suit|full\s*set/.test(cat)) return "fullSet"
  if (/blazer/.test(cat)) return "blazer"
  // Category names that do not say (e.g. "Blazer & Waistcoat"): fall back to
  // the title, checked in the same order.
  if (/waist\s*coat|koti/.test(text)) return "waistcoat"
  if (/pant|trouser/.test(text)) return "pant"
  if (/suit|full\s*set/.test(text)) return "fullSet"
  if (/blazer/.test(text)) return "blazer"
  return "other"
}

/** "B-141" / "PA-0141" / "B - 44" / "B01" → "141" / "141" / "44" / "1". */
export function groupNumber(code: string | null): string | null {
  const match = String(code || "").match(/(\d+)\s*$/)
  return match ? String(parseInt(match[1], 10)) : null
}

// Letter sizes in wear order; the sheet labels them with chest sizes.
const LETTER_ORDER = ["XS", "S", "M", "L", "XL", "2XL", "XXL", "3XL", "XXXL", "4XL", "5XL", "6XL"]
const CHEST: Record<string, number> = { M: 34, L: 36, XL: 38, "2XL": 40, XXL: 40, "3XL": 42, XXXL: 42, "4XL": 44, "5XL": 46, "6XL": 48 }

function sizeRank(size: string) {
  const s = size.trim().toUpperCase()
  const letter = LETTER_ORDER.indexOf(s)
  if (letter >= 0) return letter
  const n = parseFloat(s)
  return Number.isFinite(n) ? 100 + n : 1000
}

function sizeLabel(size: string) {
  const chest = CHEST[size.trim().toUpperCase()]
  return chest ? `${chest} (${size.trim()})` : size.trim()
}

export interface Cell {
  variantId: string
  size: string
  label: string
  stock: number
  color: string
}

export interface Member {
  productId: string
  code: string | null
  title: string
  price: number
  cells: Cell[]
}

/** "Grey Check - 144" / "BLACK	-B25" → "Grey Check" / "BLACK": the code suffix
 *  variants carry is already shown as the block's product code. */
function cleanColour(raw: string | undefined) {
  return String(raw || "")
    .replace(/\s+/g, " ")
    .replace(/\s*-\s*[A-Z]{0,3}\s*\d+\s*$/i, "")
    .trim()
}

export interface SheetProduct {
  id: string
  title: string
  productCode: string | null
  thumbnail: string
  basePrice: number
  discountPrice: number | null
  category: { name: string; parent: { name: string } | null } | null
  variants: { id: string; size: string; color: string; stock: number }[]
}

export interface Group {
  key: string
  number: string | null
  image: string
  colour: string
  members: Partial<Record<Kind, Member[]>>
}

export function buildStockSheet(products: SheetProduct[]) {
    const groups = new Map<string, Group>()

    for (const p of products) {
      const kind = kindOf(p.category?.name || "", p.category?.parent?.name || "", p.title)
      const number = groupNumber(p.productCode)
      const key = number ? `n:${number}` : `p:${p.id}`

      // One cell per size: lengths of the same size are summed, as the sheet
      // keeps a single count per size.
      const bySize = new Map<string, Cell>()
      for (const v of p.variants) {
        const size = (v.size || "").trim() || "—"
        const existing = bySize.get(size)
        if (existing) {
          existing.stock += v.stock
          // A merged cell cannot be edited as one value.
          existing.variantId = ""
        } else {
          bySize.set(size, { variantId: v.id, size, label: sizeLabel(size), stock: v.stock, color: v.color })
        }
      }
      const cells = [...bySize.values()].sort((a, b) => sizeRank(a.size) - sizeRank(b.size))

      const member: Member = {
        productId: p.id,
        code: p.productCode,
        title: p.title,
        price: p.discountPrice ?? p.basePrice,
        cells,
      }

      const group = groups.get(key) ?? {
        key,
        number,
        image: "",
        colour: "",
        members: {},
      }
      ;(group.members[kind] ??= []).push(member)
      // The blazer's photo and colour lead the block, like the sheet.
      if (!group.image || kind === "blazer") group.image = formatImageUrl(p.thumbnail)
      if (!group.colour || kind === "blazer") group.colour = cleanColour(cells[0]?.color)
      groups.set(key, group)
    }

    const list = [...groups.values()].sort((a, b) => {
      if (a.number && b.number) return Number(a.number) - Number(b.number)
      if (a.number) return -1
      if (b.number) return 1
      return a.key.localeCompare(b.key)
    })

    const sum = (kind: Kind) =>
      list.reduce(
        (total, g) => total + (g.members[kind] ?? []).reduce((t, m) => t + m.cells.reduce((s, c) => s + c.stock, 0), 0),
        0
      )

    return {
      groups: list,
      totals: { blazer: sum("blazer"), waistcoat: sum("waistcoat"), pant: sum("pant"), fullSet: sum("fullSet") },
    }
}
