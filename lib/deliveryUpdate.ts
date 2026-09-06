// Server-only: pulls in Prisma and Resend. Never import from a client component.
import { prisma } from "@/lib/prisma"
import { getSettings } from "@/lib/settings"
import { sendShippingUpdateEmail } from "@/lib/email"
import { buildTrackingUrl, carriersFromSettings, deliveryStatusDates } from "@/lib/delivery"

// ─── Server-side delivery glue ───────────────────────────────────────────────
// Shared by `PATCH /api/admin/orders/[id]` and `PATCH /api/admin/deliveries/bulk`
// so both paths stamp dates, resolve tracking links and email the customer the
// same way. The pure pieces live in `lib/delivery.ts`.
// ─────────────────────────────────────────────────────────────────────────────

/** Tracking link from the carriers setting, or null when it can't be built. */
export async function resolveTrackingUrl(
  carrierName: string | null | undefined,
  trackingNumber: string | null | undefined
): Promise<string | null> {
  const settings = await getSettings()
  return buildTrackingUrl(carriersFromSettings(settings), carrierName, trackingNumber)
}

/** `status` plus whichever of `shippedAt` / `deliveredAt` this transition sets. */
export function deliveryStatusData<S extends string>(
  status: S,
  existing: { shippedAt: Date | null; deliveredAt: Date | null }
): { status: S; shippedAt?: Date; deliveredAt?: Date } {
  return { status, ...deliveryStatusDates(status, existing) }
}

const EMAILED_STATUSES = new Set(["PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"])

/**
 * Emails the customer about a status change, with the tracking details the
 * order now carries. Never throws — a mail failure must not fail the update.
 */
export async function notifyOrderStatus(orderId: string, status: string): Promise<void> {
  if (!EMAILED_STATUSES.has(status)) return
  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        shippingCarrier: true,
        trackingNumber: true,
        trackingUrl: true,
        estimatedDeliveryAt: true,
        user: { select: { name: true, email: true } },
      },
    })
    if (!order?.user?.email) return
    await sendShippingUpdateEmail(order.user.email, {
      customerName: order.user.name,
      orderId: order.id,
      status,
      carrier: order.shippingCarrier,
      trackingNumber: order.trackingNumber,
      trackingUrl: order.trackingUrl,
      estimatedDeliveryAt: order.estimatedDeliveryAt,
    })
  } catch (emailErr) {
    console.error("[ORDER_STATUS_EMAIL_ERROR]", emailErr)
  }
}
