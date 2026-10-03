import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { buildStockSheet } from "@/lib/stockSheet"

/**
 * Admin → Inventory → Stock Sheet.
 *
 * The store kept stock in a Google Sheet laid out one block per product
 * number: photo, code, colour, prices, then a size grid of Blazer / Waistcoat /
 * Pant quantities. This serves the same shape from the live catalogue.
 *
 * Products are grouped by the number in their product code — "B-141" (blazer),
 * "W-141" (waistcoat), "PA-141" (pant) and "F-141" (full set) all belong to
 * group 141 — which is how the sheet groups them; checked against it, e.g.
 * sheet code 05's pant column equals product PA-05's stock size for size.
 * What a product is (blazer / waistcoat / pant / full set) comes from its
 * category name, not the code prefix, since prefixes are not used consistently.
 */

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const products = await prisma.product.findMany({
      where: { deletedAt: null, category: { slug: { not: "gift-cards" } } },
      select: {
        id: true,
        title: true,
        productCode: true,
        thumbnail: true,
        basePrice: true,
        discountPrice: true,
        category: { select: { name: true, parent: { select: { name: true } } } },
        variants: {
          where: { deletedAt: null },
          select: { id: true, size: true, color: true, length: true, stock: true },
        },
      },
    })

    return NextResponse.json(buildStockSheet(products))
  } catch (e) {
    console.error("[INVENTORY_SHEET_ERROR]", e)
    return NextResponse.json({ message: "Failed to load the stock sheet." }, { status: 500 })
  }
}

/** PATCH { variantId, stock } — one cell. Whole numbers ≥ 0 only. */
export async function PATCH(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const variantId = typeof body?.variantId === "string" ? body.variantId : ""
    const stock = Number(body?.stock)
    if (!variantId || !Number.isInteger(stock) || stock < 0 || stock > 100000) {
      return NextResponse.json({ message: "Stock must be a whole number of 0 or more." }, { status: 400 })
    }
    const updated = await prisma.productVariant.update({
      where: { id: variantId },
      data: { stock },
      select: { id: true, stock: true },
    })
    return NextResponse.json(updated)
  } catch (e) {
    console.error("[INVENTORY_SHEET_PATCH_ERROR]", e)
    return NextResponse.json({ message: "Failed to update stock." }, { status: 500 })
  }
}
