import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const code = body.code
    const orderTotal = parseFloat(body.total || "0")

    if (!code) {
      return NextResponse.json({ message: "Coupon code is required" }, { status: 400 })
    }

    const coupon = await prisma.coupon.findUnique({ where: { code: code.toUpperCase() } })

    if (!coupon || !coupon.active) {
      return NextResponse.json({ message: "Invalid or inactive coupon code." }, { status: 400 })
    }

    // Check expiry
    if (coupon.expiresAt && new Date() > coupon.expiresAt) {
      return NextResponse.json({ message: "This coupon has expired." }, { status: 400 })
    }

    // Check max uses
    if (coupon.maxUses !== null && coupon.usedCount >= coupon.maxUses) {
      return NextResponse.json({ message: "This coupon has reached its usage limit." }, { status: 400 })
    }

    // Subscriber-only codes. The cart applies a code before it knows who the
    // buyer is, so an email can only be checked when one is supplied (a signed-in
    // customer, say). Without it the code still previews and checkout does the
    // real enforcement — but the response says so, rather than letting the
    // shopper reach the payment step expecting a discount that will be refused.
    if (coupon.subscribersOnly) {
      const email = typeof body.email === "string" ? body.email.trim() : ""

      if (email) {
        const subscriber = await prisma.subscriber.findFirst({
          where: { email: { equals: email, mode: "insensitive" } },
          select: { id: true },
        })
        if (!subscriber) {
          return NextResponse.json(
            { message: "This code is for email subscribers. Sign up with this email address first." },
            { status: 400 }
          )
        }
      }
    }

    // Same story as subscribersOnly: previewable only once an email is known,
    // and enforced for real at checkout.
    if (coupon.firstOrderOnly) {
      const email = typeof body.email === "string" ? body.email.trim() : ""

      if (email) {
        const previousOrder = await prisma.order.findFirst({
          where: {
            user: { email: { equals: email, mode: "insensitive" } },
            status: { not: "CANCELLED" },
          },
          select: { id: true },
        })
        if (previousOrder) {
          return NextResponse.json({ message: "This code is for first orders only." }, { status: 400 })
        }
      }
    }

    // Check minimum order amount
    if (coupon.minOrderAmount && orderTotal < coupon.minOrderAmount) {
      return NextResponse.json({
        message: `This coupon requires a minimum order of ৳${coupon.minOrderAmount.toFixed(0)}.`
      }, { status: 400 })
    }

    // Calculate discount amount
    let discountAmount: number
    if (coupon.type === "PERCENTAGE") {
      discountAmount = Math.min((orderTotal * coupon.discount) / 100, orderTotal)
    } else {
      discountAmount = Math.min(coupon.discount, orderTotal)
    }

    return NextResponse.json({
      valid: true,
      couponId: coupon.id,
      code: coupon.code,
      type: coupon.type,
      discount: coupon.discount,
      discountAmount: parseFloat(discountAmount.toFixed(2)),
      // Lets the cart warn that checkout will need a subscribed email, instead
      // of the shopper finding out when the order is refused.
      subscribersOnly: coupon.subscribersOnly,
    })
  } catch (error) {
    console.error("[COUPON_VALIDATE_ERROR]", error)
    return NextResponse.json({ message: "Failed to validate coupon" }, { status: 500 })
  }
}
