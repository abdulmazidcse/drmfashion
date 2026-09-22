import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { baseCurrencyCode } from "@/lib/settings"
import { resolveOrderShipping } from "@/lib/shippingServer"
import { createOrderFromCheckout, findOrCreateCheckoutUser, runPostOrderSideEffects } from "@/lib/orderCreation"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { fullName, email, phone, address, paymentMethod, items, shippingMethodId, shippingDestination } = body

    if (!email || !fullName || !phone || !address || !items || items.length === 0) {
      return NextResponse.json(
        { message: "Missing required fields for order submission." },
        { status: 400 }
      )
    }

    // bKash is a redirect-based gateway — the order can't exist until the
    // customer returns and app/api/checkout/bkash/callback has verified the
    // payment. A direct POST here with paymentMethod "bkash" would have no
    // way to prove money actually moved, so it's refused rather than trusted.
    if (paymentMethod === "bkash") {
      return NextResponse.json(
        { message: "bKash checkout must go through /api/checkout/bkash/create-payment." },
        { status: 400 }
      )
    }

    // Fetch dynamic settings
    const settings = await prisma.setting.findMany()
    const settingsObj = settings.reduce((acc: Record<string, string>, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {})
    const earnRate = Number(settingsObj["reward_point_earn_rate"]) || 10

    // 1. Create or Find User.
    const { user, generatedPassword } = await findOrCreateCheckoutUser({ email, fullName, phone })

    // Shipping is priced before the transaction opens: a UPS service needs an
    // outbound re-quote, and holding a pooled DB connection across that call is
    // what turns a slow carrier into a database outage.
    const resolvedShipping = await resolveOrderShipping({
      settings: settingsObj,
      shippingMethodId,
      destination: shippingDestination,
      items,
    })

    // 2. Run order creation inside an atomic transaction
    const { order } = await prisma.$transaction(async (tx) => {
      return createOrderFromCheckout(tx, {
        body,
        user,
        settingsObj,
        earnRate,
        resolvedShipping,
      })
    })

    if (!order) {
      // Unreachable outside dryRun, kept only so TypeScript knows `order` is
      // non-null below.
      throw new Error("Order creation failed unexpectedly.")
    }

    // Ledger entry + order confirmation email + guest-account email — all
    // non-blocking, each failure logged and swallowed independently.
    await runPostOrderSideEffects({ order, body, generatedPassword })

    return NextResponse.json({
      success: true,
      orderId: order.id,
      accountCreated: !!generatedPassword,
      // For the GA4 `purchase` event. Sent from here rather than recomputed in
      // the browser because coupons, shipping, tax and redeemed points are all
      // applied server-side — a client-side total would not match what was
      // actually charged.
      analytics: {
        value: order.totalAmount,
        currency: baseCurrencyCode(settingsObj),
        shipping: order.shippingFee,
      },
    })
  } catch (error) {
    console.error("[CHECKOUT_POST_ERROR]", error)
    return NextResponse.json(
      { message: error instanceof Error ? error.message : "Failed to process checkout order." },
      { status: 500 }
    )
  }
}
