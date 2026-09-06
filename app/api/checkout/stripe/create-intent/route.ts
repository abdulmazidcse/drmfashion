import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import Stripe from "stripe"
import { resolveOrderShipping } from "@/lib/shippingServer"
import { resolveTax, taxSettingsFromSettings } from "@/lib/tax"

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2026-04-22.dahlia", // Use the latest API version or your account's default
})

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { items, pointsRedeemed, email, promoCode, shippingMethodId, shippingDestination } = body

    if (!items || items.length === 0) {
      return NextResponse.json({ message: "No items provided" }, { status: 400 })
    }

    // Fetch settings
    const settings = await prisma.setting.findMany()
    const settingsObj = settings.reduce((acc, s) => {
      acc[s.key] = s.value
      return acc
    }, {} as Record<string, string>)

    let calculatedTotal = 0
    let pointsToDeduct = 0

    // Verify user points if any redeemed
    if (email && pointsRedeemed && pointsRedeemed > 0) {
      const user = await prisma.user.findUnique({ where: { email } })
      if (user && user.rewardPoints >= pointsRedeemed) {
        pointsToDeduct = pointsRedeemed
      }
    }

    // Securely calculate total from DB
    for (const item of items) {
      let variant = await prisma.productVariant.findFirst({
        where: {
          productId: item.productId,
          color: item.color,
          size: item.size,
          length: item.length || null,
        },
        include: { product: true }
      })

      if (!variant) {
        variant = await prisma.productVariant.findFirst({
          where: { productId: item.productId },
          include: { product: true }
        })
      }

      if (variant) {
        const actualPrice = variant.price || variant.product.discountPrice || variant.product.basePrice
        calculatedTotal += actualPrice * item.quantity
      }
    }

    // Calculate reward point value
    const pointValue = Number(settingsObj["reward_point_value"] || 1)
    const pointsDiscount = pointsToDeduct * pointValue

    let preTaxAmount = Math.max(0, calculatedTotal - pointsDiscount)
    let appliedDiscount = 0

    // Validate and apply promo code
    if (promoCode) {
      const coupon = await prisma.coupon.findUnique({ where: { code: promoCode.toUpperCase() } })
      if (coupon && coupon.active) {
        const isExpired = coupon.expiresAt && new Date() > coupon.expiresAt
        const isMaxUsed = coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses
        const isMinOrderUnmet = coupon.minOrderAmount && calculatedTotal < coupon.minOrderAmount

        if (!isExpired && !isMaxUsed && !isMinOrderUnmet) {
          if (coupon.type === "PERCENTAGE") {
            appliedDiscount = Math.min((calculatedTotal * coupon.discount) / 100, calculatedTotal)
          } else {
            appliedDiscount = Math.min(coupon.discount, calculatedTotal)
          }
          preTaxAmount = Math.max(0, preTaxAmount - appliedDiscount)
        }
      }
    }

    // Same resolution as /api/checkout, so the amount authorised here matches
    // the amount the order is later written for.
    const finalShippingFee = (
      await resolveOrderShipping({
        settings: settingsObj,
        shippingMethodId,
        destination: shippingDestination,
        items,
      })
    ).fee

    const tax = resolveTax(taxSettingsFromSettings(settingsObj), {
      country: shippingDestination?.countryCode,
      state: shippingDestination?.state,
      taxableAmount: preTaxAmount,
      shippingFee: finalShippingFee,
    }).amount

    const finalPayableAmount = preTaxAmount + tax + finalShippingFee

    // Stripe requires amount in cents (or smallest currency unit). Assuming USD ($)
    const amountInCents = Math.round(finalPayableAmount * 100)

    if (amountInCents <= 0) {
      return NextResponse.json({ 
        message: "Total is 0, no payment needed.", 
        clientSecret: null 
      })
    }

    // Create PaymentIntent
    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInCents,
      currency: "usd",
      automatic_payment_methods: {
        enabled: true,
      },
      metadata: {
        customerEmail: email || "guest"
      }
    })

    return NextResponse.json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id
    })

  } catch (error: any) {
    console.error("[STRIPE_INTENT_ERROR]", error)
    return NextResponse.json(
      { message: error.message || "Failed to create payment intent" },
      { status: 500 }
    )
  }
}
