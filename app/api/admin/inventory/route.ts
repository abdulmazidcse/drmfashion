import { NextRequest, NextResponse } from "next/server"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

/**
 * Inventory is a variant-level view, so it paginates variants rather than
 * products — one product with 40 variants must not swallow a whole page.
 *
 * The summary cards need totals across the *entire* catalogue, not the current
 * page, so they are aggregated in the database instead of being derived from
 * the rows we happen to have shipped. That is the whole reason this route
 * exists: the page used to pull every product with every relation
 * (`/admin/products?limit=1000`) just to add three numbers up in the browser.
 */
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch (err) {
    console.warn("[ADMIN_GUARD_INVENTORY]", err instanceof Error ? err.message : err)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "10")))
    const search = (searchParams.get("search") || "").trim()
    const stock = searchParams.get("stock") || "all"

    // Mirrors the product list: soft-deleted rows and gift cards are not stock.
    const baseWhere: Prisma.ProductVariantWhereInput = {
      deletedAt: null,
      product: {
        deletedAt: null,
        category: { slug: { not: "gift-cards" } },
      },
    }

    const where: Prisma.ProductVariantWhereInput = { ...baseWhere }

    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
        { product: { title: { contains: search, mode: "insensitive" } } },
      ]
    }

    if (stock === "low") where.stock = { gt: 0, lte: 5 }
    else if (stock === "out") where.stock = 0
    else if (stock === "in") where.stock = { gt: 5 }

    const [rows, total, agg, lowStockCount, valueRows] = await Promise.all([
      prisma.productVariant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: [{ stock: "asc" }, { createdAt: "desc" }],
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
              thumbnail: true,
              basePrice: true,
              category: { select: { name: true } },
            },
          },
        },
      }),
      prisma.productVariant.count({ where }),

      // Summary cards ignore the filters — they describe the whole inventory.
      prisma.productVariant.aggregate({ where: baseWhere, _sum: { stock: true } }),
      prisma.productVariant.count({ where: { ...baseWhere, stock: { lte: 5 } } }),

      // SUM(stock * basePrice) crosses a relation, which Prisma's aggregate API
      // cannot express — so this one total is a raw query.
      prisma.$queryRaw<{ total: number | null }[]>`
        SELECT COALESCE(SUM(v."stock" * p."basePrice"), 0)::float8 AS total
        FROM "ProductVariant" v
        JOIN "Product" p ON p."id" = v."productId"
        LEFT JOIN "Category" c ON c."id" = p."categoryId"
        WHERE v."deletedAt" IS NULL
          AND p."deletedAt" IS NULL
          AND (c."slug" IS NULL OR c."slug" <> 'gift-cards')
      `,
    ])

    const data = rows.map((v) => ({
      id: v.id,
      productId: v.product.id,
      productName: v.product.title,
      productImage: v.product.thumbnail,
      productCategory: v.product.category?.name || "Uncategorized",
      sku: v.sku || `SKU-${v.product.id.slice(-4)}-${v.color.slice(0, 2)}-${v.size}`,
      color: v.color,
      size: v.size,
      length: v.length,
      stock: v.stock,
      price: v.product.basePrice,
    }))

    return NextResponse.json({
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
      stats: {
        totalUnits: agg._sum.stock || 0,
        lowStockCount,
        totalValue: valueRows[0]?.total || 0,
      },
    })
  } catch (error) {
    console.error("[ADMIN_INVENTORY_GET]", error)
    return NextResponse.json({ message: "Failed to load inventory" }, { status: 500 })
  }
}
