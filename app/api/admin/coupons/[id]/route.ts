import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json()
    const { active, code, type, discount, minOrderAmount, maxUses, expiresAt } = body

    const updated = await prisma.coupon.update({
      where: { id },
      data: {
        ...(active !== undefined && { active }),
        ...(code !== undefined && { code }),
        ...(type !== undefined && { type }),
        ...(discount !== undefined && { discount }),
        ...(minOrderAmount !== undefined && { minOrderAmount }),
        ...(maxUses !== undefined && { maxUses }),
        ...(expiresAt !== undefined && { expiresAt: expiresAt ? new Date(expiresAt) : null }),
      }
    })

    return NextResponse.json(updated)
  } catch (error: any) {
    console.error("[COUPON_PATCH_ERROR]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.coupon.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[COUPON_DELETE_ERROR]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
