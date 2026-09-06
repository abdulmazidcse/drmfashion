import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { DELIVERY_STATUSES, isDeliveryStatus } from "@/lib/delivery"

/**
 * Admin → Deliveries list.
 *
 *   ?status=ALL|PROCESSING|SHIPPED|DELIVERED   (ALL = those three, never PENDING/CANCELLED)
 *   ?carrier=<name>                            exact, case-insensitive
 *   ?search=<order id suffix | name | email | phone>
 *   ?page=&limit=
 *
 * The stats block is store-wide, not filtered, so the cards stay meaningful
 * while the table is narrowed down.
 */
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, parseInt(searchParams.get("page") || "1") || 1)
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20") || 20))
    const status = searchParams.get("status") || "ALL"
    const carrier = (searchParams.get("carrier") || "").trim()
    const search = (searchParams.get("search") || "").trim().replace(/^#/, "")
    const skip = (page - 1) * limit

    const where: Prisma.OrderWhereInput = {
      status: isDeliveryStatus(status) ? status : { in: [...DELIVERY_STATUSES] },
    }
    if (carrier) {
      where.shippingCarrier = { equals: carrier, mode: "insensitive" }
    }
    if (search) {
      where.OR = [
        // Ids are lowercase cuids; the short number customers quote is the suffix.
        { id: { endsWith: search.toLowerCase() } },
        { id: { contains: search } },
        { user: { name: { contains: search, mode: "insensitive" } } },
        { user: { email: { contains: search, mode: "insensitive" } } },
        { shippingPhone: { contains: search } },
      ]
    }

    const now = new Date()
    const startOfToday = new Date(now)
    startOfToday.setHours(0, 0, 0, 0)

    const [rows, total, awaitingDispatch, inTransit, deliveredToday, overdue] = await Promise.all([
      prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          status: true,
          totalAmount: true,
          currencySymbol: true,
          exchangeRate: true,
          createdAt: true,
          shippingPhone: true,
          shippingAddress: true,
          shippingCarrier: true,
          shippingMethod: true,
          trackingNumber: true,
          trackingUrl: true,
          estimatedDeliveryAt: true,
          shippedAt: true,
          deliveredAt: true,
          deliveryNote: true,
          user: { select: { name: true, email: true } },
          _count: { select: { items: true } },
        },
      }),
      prisma.order.count({ where }),
      prisma.order.count({ where: { status: "PROCESSING" } }),
      prisma.order.count({ where: { status: "SHIPPED" } }),
      prisma.order.count({ where: { status: "DELIVERED", deliveredAt: { gte: startOfToday } } }),
      prisma.order.count({ where: { status: "SHIPPED", estimatedDeliveryAt: { lt: now } } }),
    ])

    return NextResponse.json({
      data: rows.map(({ _count, ...row }) => ({ ...row, itemCount: _count.items })),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      stats: { awaitingDispatch, inTransit, deliveredToday, overdue },
    })
  } catch (error) {
    console.error("[ADMIN_DELIVERIES_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load deliveries." }, { status: 500 })
  }
}
