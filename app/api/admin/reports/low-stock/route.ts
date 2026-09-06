import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { getLowStockThreshold, parseLowStockThreshold } from "@/lib/inventory"
import { toCsv, csvResponse } from "@/lib/csv"

export const dynamic = "force-dynamic"

/**
 * Low stock report — every live variant at or below the threshold, with the
 * two numbers a buyer needs next to it:
 *
 *   onOrder    units on purchase orders that are placed but not yet in stock
 *              (status ORDERED or SHIPPED). DRAFT POs have not been sent to the
 *              supplier, RECEIVED ones already incremented `stock`, CANCELLED
 *              never will — none of those are "coming".
 *   sold30d    units sold in the last 30 days across non-cancelled orders.
 *   daysOfCover  stock ÷ (sold30d ÷ 30); null when nothing sold, since
 *              "infinite cover" is not a useful number.
 *
 * `stats.valueAtRisk` is Σ sold30d × basePrice over the returned rows — what a
 * month of sales at the current velocity is worth, i.e. the revenue that goes
 * missing if these variants are allowed to run out.
 */

const OUTSTANDING_PO_STATUSES = ["ORDERED", "SHIPPED"] as const
const DAY_MS = 86_400_000

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)

    const thresholdParam = searchParams.get("threshold")
    const threshold =
      thresholdParam !== null && thresholdParam !== ""
        ? parseLowStockThreshold(thresholdParam)
        : await getLowStockThreshold()
    const includeOutOfStock = searchParams.get("includeOutOfStock") !== "false"
    const search = (searchParams.get("search") || "").trim()
    const categoryId = (searchParams.get("categoryId") || "").trim()
    const format = searchParams.get("format") === "csv" ? "csv" : "json"

    // A parent category in the filter should include its subcategories, the
    // same way the storefront listing treats them.
    let categoryIds: string[] | null = null
    if (categoryId) {
      const children = await prisma.category.findMany({
        where: { parentId: categoryId },
        select: { id: true, children: { select: { id: true } } },
      })
      categoryIds = [categoryId, ...children.flatMap((c) => [c.id, ...c.children.map((g) => g.id)])]
    }

    // Mirrors the inventory route: soft-deleted rows and gift cards are not stock.
    const where: Prisma.ProductVariantWhereInput = {
      deletedAt: null,
      stock: includeOutOfStock ? { lte: threshold } : { gt: 0, lte: threshold },
      product: {
        deletedAt: null,
        category: { slug: { not: "gift-cards" } },
        ...(categoryIds ? { categoryId: { in: categoryIds } } : {}),
      },
    }

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
        { product: { title: { contains: search, mode: "insensitive" } } },
      ]
    }

    const variants = await prisma.productVariant.findMany({
      where,
      orderBy: [{ stock: "asc" }, { product: { title: "asc" } }, { sku: "asc" }],
      select: {
        id: true,
        sku: true,
        color: true,
        size: true,
        length: true,
        stock: true,
        product: {
          select: {
            id: true,
            title: true,
            slug: true,
            thumbnail: true,
            basePrice: true,
            category: { select: { name: true } },
            brand: { select: { name: true } },
          },
        },
      },
    })

    const variantIds = variants.map((v) => v.id)
    const since = new Date(Date.now() - 30 * DAY_MS)

    // Two grouped queries instead of two per row.
    const [onOrderRows, soldRows] = variantIds.length
      ? await Promise.all([
          prisma.purchaseOrderItem.groupBy({
            by: ["variantId"],
            where: {
              variantId: { in: variantIds },
              purchaseOrder: { status: { in: [...OUTSTANDING_PO_STATUSES] } },
            },
            _sum: { quantity: true },
          }),
          prisma.orderItem.groupBy({
            by: ["variantId"],
            where: {
              variantId: { in: variantIds },
              order: { status: { not: "CANCELLED" }, createdAt: { gte: since } },
            },
            _sum: { quantity: true },
          }),
        ])
      : [[], []]

    const onOrderById = new Map(onOrderRows.map((r) => [r.variantId, r._sum.quantity || 0]))
    const soldById = new Map(soldRows.map((r) => [r.variantId, r._sum.quantity || 0]))

    const rows = variants.map((v) => {
      const sold30d = soldById.get(v.id) || 0
      const daysOfCover = sold30d > 0 ? Math.round((v.stock / (sold30d / 30)) * 10) / 10 : null
      return {
        variantId: v.id,
        productId: v.product.id,
        title: v.product.title,
        slug: v.product.slug,
        thumbnail: v.product.thumbnail,
        sku: v.sku,
        color: v.color,
        size: v.size,
        length: v.length,
        stock: v.stock,
        category: v.product.category?.name || "Uncategorized",
        brand: v.product.brand?.name || "No brand",
        basePrice: v.product.basePrice,
        onOrder: onOrderById.get(v.id) || 0,
        sold30d,
        daysOfCover,
      }
    })

    const stats = {
      total: rows.length,
      outOfStock: rows.filter((r) => r.stock === 0).length,
      valueAtRisk: Math.round(rows.reduce((sum, r) => sum + r.sold30d * r.basePrice, 0) * 100) / 100,
    }

    if (format === "csv") {
      const csv = toCsv(rows, [
        "sku",
        "title",
        "color",
        "size",
        "length",
        "category",
        "brand",
        "stock",
        "onOrder",
        "sold30d",
        "daysOfCover",
        "basePrice",
        "productId",
        "variantId",
      ])
      return csvResponse(csv, `low-stock-${threshold}-${new Date().toISOString().slice(0, 10)}.csv`)
    }

    return NextResponse.json({ threshold, rows, stats })
  } catch (e) {
    console.error("[ADMIN_REPORTS_LOW_STOCK]", e)
    return NextResponse.json({ message: "Failed to build low stock report" }, { status: 500 })
  }
}
