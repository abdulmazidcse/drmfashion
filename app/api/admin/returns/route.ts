import { NextRequest, NextResponse } from "next/server"
import Stripe from "stripe"
import { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { returnRequestInclude } from "@/lib/returns"
import { sendReturnStatusEmail } from "@/lib/email"
import { postRefundEntry } from "@/lib/accounting"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-04-22.dahlia",
})

const REFUND_METHODS = ["stripe", "manual"] as const
type RefundMethod = (typeof REFUND_METHODS)[number]

// GET — List all return requests (Admin)
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "ALL"

    const where: Prisma.ReturnRequestWhereInput = {}
    if (status !== "ALL") where.status = status as Prisma.ReturnRequestWhereInput["status"]

    const returns = await prisma.returnRequest.findMany({
      where,
      include: returnRequestInclude,
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(returns)
  } catch (error) {
    console.error("[ADMIN_RETURNS_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load returns" }, { status: 500 })
  }
}

// PATCH — Update return status / process refund
export async function PATCH(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { id, status, adminNote, refundAmount, refundMethod, restock } = body

    if (!id || !status) {
      return NextResponse.json({ message: "Missing id or status" }, { status: 400 })
    }

    if (!["APPROVED", "REJECTED", "REFUNDED"].includes(status)) {
      return NextResponse.json({ message: "Invalid status" }, { status: 400 })
    }

    const existing = await prisma.returnRequest.findUnique({
      where: { id },
      include: {
        user: { select: { name: true, email: true } },
        order: {
          select: {
            id: true,
            totalAmount: true,
            currencySymbol: true,
            payment: { select: { id: true, provider: true, transactionId: true, status: true } },
            items: { select: { variantId: true, quantity: true, isCustom: true } },
          },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ message: "Return request not found" }, { status: 404 })
    }

    if (existing.status === "REFUNDED") {
      return NextResponse.json({ message: "Already refunded" }, { status: 400 })
    }

    // ── APPROVED / REJECTED: simple status flip ──────────────────────────────
    if (status !== "REFUNDED") {
      const returnReq = await prisma.returnRequest.update({
        where: { id },
        data: { status, adminNote },
        include: { user: { select: { name: true, email: true } } },
      })

      await notifyCustomer(returnReq.user?.email, {
        customerName: returnReq.user?.name || "Customer",
        orderId: returnReq.orderId,
        returnStatus: status,
        note: adminNote,
      })

      return NextResponse.json(returnReq)
    }

    // ── REFUNDED: validate, refund through gateway if needed, then persist ────
    const order = existing.order
    const orderTotal = Number(order.totalAmount)

    const amount =
      refundAmount === undefined || refundAmount === null || refundAmount === ""
        ? orderTotal
        : Number(refundAmount)

    if (!Number.isFinite(amount) || amount <= 0) {
      return NextResponse.json({ message: "Refund amount must be greater than 0" }, { status: 400 })
    }
    if (amount > orderTotal + 0.005) {
      return NextResponse.json(
        { message: `Refund amount cannot exceed the order total (${orderTotal.toFixed(2)})` },
        { status: 400 }
      )
    }

    const method: RefundMethod = refundMethod
    if (!REFUND_METHODS.includes(method)) {
      return NextResponse.json({ message: "Refund method must be 'stripe' or 'manual'" }, { status: 400 })
    }

    let refundTransactionId: string | null = null

    if (method === "stripe") {
      const payment = order.payment
      if (!payment || payment.provider !== "card" || !payment.transactionId?.startsWith("pi_")) {
        return NextResponse.json(
          { message: "Stripe refunds are only available for card payments with a Stripe PaymentIntent" },
          { status: 400 }
        )
      }
      if (!process.env.STRIPE_SECRET_KEY) {
        return NextResponse.json({ message: "Stripe is not configured" }, { status: 400 })
      }

      try {
        // PaymentIntents are created in cents (see /api/checkout/stripe/create-intent),
        // so the refund is expressed the same way.
        const refund = await stripe.refunds.create({
          payment_intent: payment.transactionId,
          amount: Math.round(amount * 100),
        })
        refundTransactionId = refund.id
      } catch (stripeErr: unknown) {
        console.error("[RETURN_STRIPE_REFUND_ERROR]", stripeErr)
        return NextResponse.json(
          { message: stripeErr instanceof Error ? stripeErr.message : "Stripe refund failed" },
          { status: 400 }
        )
      }
    }

    const shouldRestock = !!restock
    const fullRefund = Math.abs(amount - orderTotal) < 0.005
    const now = new Date()

    const returnReq = await prisma.$transaction(async (tx) => {
      const updated = await tx.returnRequest.update({
        where: { id },
        data: {
          status: "REFUNDED",
          adminNote,
          refundAmount: amount,
          refundMethod: method,
          refundTransactionId,
          refundedAt: now,
          restocked: shouldRestock,
        },
        include: { user: { select: { name: true, email: true } } },
      })

      if (shouldRestock) {
        for (const item of order.items) {
          if (item.isCustom) continue
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { stock: true },
          })
          if (!variant) continue
          const previousStock = variant.stock
          const newStock = previousStock + item.quantity
          await tx.productVariant.update({
            where: { id: item.variantId },
            data: { stock: newStock },
          })
          await tx.inventoryLog.create({
            data: {
              variantId: item.variantId,
              previousStock,
              newStock,
              note: `Restocked ${item.quantity} units from return ${id} (order ${order.id})`,
            },
          })
        }
      }

      if (fullRefund) {
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: "REFUNDED" },
        })
        if (order.payment) {
          await tx.payment.update({
            where: { id: order.payment.id },
            data: { status: "REFUNDED" },
          })
        }
      }

      return updated
    })

    // Mirror the refund into the ledger (non-blocking; the refund is already done)
    try {
      await postRefundEntry(id)
    } catch (e) {
      console.error("[ACCOUNTING_POST_ERROR]", e)
    }

    await notifyCustomer(returnReq.user?.email, {
      customerName: returnReq.user?.name || "Customer",
      orderId: returnReq.orderId,
      returnStatus: "REFUNDED",
      note: adminNote,
      refundAmount: amount,
      refundMethod: method,
      currencySymbol: order.currencySymbol || "$",
    })

    return NextResponse.json(returnReq)
  } catch (error) {
    console.error("[ADMIN_RETURNS_PATCH_ERROR]", error)
    return NextResponse.json({ message: "Failed to update return" }, { status: 500 })
  }
}

// Email notification — failures are logged and never fail the request.
async function notifyCustomer(
  email: string | null | undefined,
  data: Parameters<typeof sendReturnStatusEmail>[1]
) {
  if (!email) return
  try {
    await sendReturnStatusEmail(email, data)
  } catch (emailErr) {
    console.error("[RETURN_EMAIL_ERROR]", emailErr)
  }
}
