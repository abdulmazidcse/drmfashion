import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { resolveOrderShipping } from "@/lib/shippingServer"
import { createOrderFromCheckout, findOrCreateCheckoutUser } from "@/lib/orderCreation"
import { createBkashPayment } from "@/lib/bkash"
import { requestSiteUrl } from "@/lib/siteUrl"

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Starts a bKash payment: prices the order exactly as /api/checkout would
 * (via createOrderFromCheckout's dryRun mode, so nothing is written to stock,
 * coupons or points yet), stashes the checkout payload in PendingCheckout,
 * and hands back bKash's hosted payment URL. The real order is only created
 * by app/api/checkout/bkash/callback once bKash confirms the charge.
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fullName, email, phone, address, items, shippingMethodId, shippingDestination } = body

    if (!email || !fullName || !phone || !address || !items || items.length === 0) {
      return NextResponse.json(
        { message: "Missing required fields for order submission." },
        { status: 400 }
      )
    }

    // This endpoint exists for exactly one payment method — trust the URL,
    // not whatever the client happened to send.
    const checkoutBody = { ...body, paymentMethod: "bkash" }

    const settings = await prisma.setting.findMany()
    const settingsObj = settings.reduce((acc: Record<string, string>, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {})
    const earnRate = Number(settingsObj["reward_point_earn_rate"]) || 10

    const { user, generatedPassword } = await findOrCreateCheckoutUser({ email, fullName, phone })

    const resolvedShipping = await resolveOrderShipping({
      settings: settingsObj,
      shippingMethodId,
      destination: shippingDestination,
      items,
    })

    // Read-only: validates stock/coupon/points and computes the total without
    // touching the database.
    const { pricing } = await createOrderFromCheckout(prisma, {
      body: checkoutBody,
      user,
      settingsObj,
      earnRate,
      resolvedShipping,
      dryRun: true,
    })

    if (pricing.finalPayableAmount <= 0) {
      return NextResponse.json(
        { message: "This order totals ৳0 — bKash can't process a zero-amount payment. Choose another payment method." },
        { status: 400 }
      )
    }

    const merchantInvoiceNumber = `INV${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`
    const siteUrl = await requestSiteUrl()

    const pending = await prisma.pendingCheckout.create({
      data: {
        merchantInvoiceNumber,
        provider: "bkash",
        amount: pricing.finalPayableAmount,
        payload: checkoutBody,
        generatedPassword,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })

    try {
      const created = await createBkashPayment({
        amount: pricing.finalPayableAmount,
        callbackURL: `${siteUrl}/api/checkout/bkash/callback`,
        merchantInvoiceNumber,
        payerReference: phone,
      })

      await prisma.pendingCheckout.update({
        where: { id: pending.id },
        data: { paymentID: created.paymentID },
      })

      return NextResponse.json({ bkashURL: created.bkashURL })
    } catch (err) {
      await prisma.pendingCheckout.update({
        where: { id: pending.id },
        data: { status: "FAILED", failureReason: errorMessage(err).slice(0, 500) },
      })
      throw err
    }
  } catch (error) {
    console.error("[BKASH_CREATE_PAYMENT_ERROR]", error)
    return NextResponse.json(
      { message: errorMessage(error) || "Failed to start bKash payment." },
      { status: 500 }
    )
  }
}
