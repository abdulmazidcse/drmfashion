import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

// GET /api/admin/skus — every variant row in the catalogue, soft-deleted ones
// included, with the reference counts the delete button needs to explain
// itself. Paginated and filterable by search text and status.
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch (err: any) {
    console.warn("[ADMIN_GUARD_SKUS_GET]", err.message)
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"))
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20")))
    const search = searchParams.get("search") || ""
    // all | active | deleted
    const status = searchParams.get("status") || "all"

    const where: any = {}
    if (status === "active") where.deletedAt = null
    if (status === "deleted") where.deletedAt = { not: null }
    if (search) {
      where.OR = [
        { sku: { contains: search, mode: "insensitive" } },
        { size: { contains: search, mode: "insensitive" } },
        { color: { contains: search, mode: "insensitive" } },
        { product: { title: { contains: search, mode: "insensitive" } } },
        { product: { productCode: { contains: search, mode: "insensitive" } } },
      ]
    }

    const [variants, total] = await Promise.all([
      prisma.productVariant.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          sku: true,
          size: true,
          color: true,
          length: true,
          stock: true,
          deletedAt: true,
          createdAt: true,
          product: { select: { id: true, title: true, productCode: true, thumbnail: true } },
          _count: {
            select: {
              orderItems: true,
              purchaseItems: true,
              cartItems: true,
              wishlistItems: true,
              inventoryLogs: true,
              stockAlerts: true,
            },
          },
        },
      }),
      prisma.productVariant.count({ where }),
    ])

    return NextResponse.json({
      data: variants,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    })
  } catch (error) {
    console.error("[SKUS_LIST_ERROR]", error)
    return NextResponse.json({ message: "Failed to load SKUs" }, { status: 500 })
  }
}
