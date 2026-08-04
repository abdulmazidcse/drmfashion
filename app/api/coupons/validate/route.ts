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
    })
  } catch (error) {
    console.error("[COUPON_VALIDATE_ERROR]", error)
    return NextResponse.json({ message: "Failed to validate coupon" }, { status: 500 })
  }
}
