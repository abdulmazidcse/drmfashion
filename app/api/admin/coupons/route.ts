import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const coupons = await prisma.coupon.findMany({
      orderBy: { code: 'asc' }
    })
    return NextResponse.json(coupons)
  } catch (error: any) {
    console.error("[COUPON_GET_ERROR]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { code, discount, expiresAt, active } = body

    if (!code || discount === undefined) {
      return NextResponse.json({ message: "Code and discount are required" }, { status: 400 })
    }

    const uppercaseCode = code.toUpperCase().trim()

    const existing = await prisma.coupon.findUnique({
      where: { code: uppercaseCode }
    })

    if (existing) {
      return NextResponse.json({ message: "Promo code already exists" }, { status: 400 })
    }

    const coupon = await prisma.coupon.create({
      data: {
        code: uppercaseCode,
        discount: parseFloat(discount),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        active: active !== undefined ? active : true
      }
    })

    return NextResponse.json(coupon)

  } catch (error: any) {
    console.error("[COUPON_POST_ERROR]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
