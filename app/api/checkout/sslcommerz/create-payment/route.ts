import { NextRequest, NextResponse } from "next/server"
import crypto from "crypto"
import { prisma } from "@/lib/prisma"
import { resolveOrderShipping } from "@/lib/shippingServer"
import { createOrderFromCheckout, findOrCreateCheckoutUser } from "@/lib/orderCreation"
import { createSslcommerzSession } from "@/lib/sslcommerz"
import { requestSiteUrl } from "@/lib/siteUrl"

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : String(err)
}

/**
 * Starts an SSLCommerz payment — mirrors app/api/checkout/bkash/create-payment
 * exactly (see that file's comment for the full rationale): prices the order
 * via createOrderFromCheckout's dryRun mode, stashes the checkout payload in
 * PendingCheckout, and hands back SSLCommerz's hosted payment URL. The real
 * order is only created by app/api/checkout/sslcommerz/callback once
 * SSLCommerz confirms the charge via its Validation API.
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
    const checkoutBody = { ...body, paymentMethod: "sslcommerz" }

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
        { message: "This order totals ৳0 — SSLCommerz can't process a zero-amount payment. Choose another payment method." },
        { status: 400 }
      )
    }

    const tranId = `INV${Date.now()}${crypto.randomBytes(3).toString("hex").toUpperCase()}`
    const siteUrl = await requestSiteUrl()

    const pending = await prisma.pendingCheckout.create({
      data: {
        merchantInvoiceNumber: tranId,
        provider: "sslcommerz",
        amount: pricing.finalPayableAmount,
        payload: checkoutBody,
        generatedPassword,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 30 * 60 * 1000),
      },
    })

    try {
      const session = await createSslcommerzSession({
        amount: pricing.finalPayableAmount,
        tranId,
        successUrl: `${siteUrl}/api/checkout/sslcommerz/callback?result=success`,
        failUrl: `${siteUrl}/api/checkout/sslcommerz/callback?result=fail`,
        cancelUrl: `${siteUrl}/api/checkout/sslcommerz/callback?result=cancel`,
        ipnUrl: `${siteUrl}/api/checkout/sslcommerz/callback?result=ipn`,
        customer: {
          name: fullName,
          email,
          phone,
          address: shippingDestination?.addressLine || address,
          city: shippingDestination?.city || "N/A",
          postcode: shippingDestination?.postalCode || "N/A",
          country: shippingDestination?.countryCode || "N/A",
        },
        productName: items.map((i: { title?: string }) => i.title).filter(Boolean).join(", ").slice(0, 255) || "Order",
      })

      await prisma.pendingCheckout.update({
        where: { id: pending.id },
        data: { paymentID: session.sessionkey },
      })

      return NextResponse.json({ gatewayPageURL: session.gatewayPageURL })
    } catch (err) {
      await prisma.pendingCheckout.update({
        where: { id: pending.id },
        data: { status: "FAILED", failureReason: errorMessage(err).slice(0, 500) },
      })
      throw err
    }
  } catch (error) {
    console.error("[SSLCOMMERZ_CREATE_PAYMENT_ERROR]", error)
    return NextResponse.json(
      { message: errorMessage(error) || "Failed to start SSLCommerz payment." },
      { status: 500 }
    )
  }
}
