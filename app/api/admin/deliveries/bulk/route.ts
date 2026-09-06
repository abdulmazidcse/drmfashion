import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { deliveryStatusData, notifyOrderStatus } from "@/lib/deliveryUpdate"

const BULK_STATUSES = new Set(["SHIPPED", "DELIVERED"])
const MAX_IDS = 100

/**
 * Marks several orders SHIPPED or DELIVERED at once. Body: `{ ids, status }`.
 *
 * Cancelled orders and ones already in the target status are left alone (and
 * reported as `skipped`) so a stray tick can't ship a cancelled order or
 * re-send the "your order has shipped" email.
 */
export async function PATCH(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const status = body?.status
    const ids: unknown = body?.ids

    if (typeof status !== "string" || !BULK_STATUSES.has(status)) {
      return NextResponse.json({ message: "Status must be SHIPPED or DELIVERED." }, { status: 400 })
    }
    if (!Array.isArray(ids) || ids.length === 0 || !ids.every((id) => typeof id === "string" && id.trim())) {
      return NextResponse.json({ message: "Select at least one order." }, { status: 400 })
    }
    if (ids.length > MAX_IDS) {
      return NextResponse.json({ message: `At most ${MAX_IDS} orders per batch.` }, { status: 400 })
    }

    const targetStatus = status as "SHIPPED" | "DELIVERED"
    const orders = await prisma.order.findMany({
      where: { id: { in: ids as string[] }, status: { notIn: ["CANCELLED", targetStatus] } },
      select: { id: true, shippedAt: true, deliveredAt: true },
    })

    if (orders.length > 0) {
      await prisma.$transaction(
        orders.map((order) =>
          prisma.order.update({
            where: { id: order.id },
            data: deliveryStatusData(targetStatus, order),
          })
        )
      )
    }

    // Emails go out after the write; each call swallows its own failure.
    for (const order of orders) {
      await notifyOrderStatus(order.id, targetStatus)
    }

    return NextResponse.json({
      success: true,
      updated: orders.length,
      skipped: ids.length - orders.length,
    })
  } catch (error) {
    console.error("[ADMIN_DELIVERIES_BULK_ERROR]", error)
    return NextResponse.json({ message: "Failed to update deliveries." }, { status: 500 })
  }
}
