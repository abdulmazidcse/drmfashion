import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json()
    const { stock } = body

    if (typeof stock !== "number") {
      return NextResponse.json({ message: "Invalid stock value" }, { status: 400 })
    }

    const updatedVariant = await prisma.productVariant.update({
      where: { id },
      data: { stock }
    })

    return NextResponse.json(updatedVariant)
  } catch (error: any) {
    console.error("[VARIANT_PATCH_ERROR]", error)
    return NextResponse.json({ message: "Failed to update variant" }, { status: 500 })
  }
}
