import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json()
    const { name, email, phone, address } = body

    if (!name) {
      return NextResponse.json({ message: "Supplier name is required" }, { status: 400 })
    }

    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name,
        email,
        phone,
        address
      }
    })

    return NextResponse.json(supplier)
  } catch (error: any) {
    console.error("[SUPPLIERS_PUT]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.supplier.delete({
      where: { id }
    })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[SUPPLIERS_DELETE]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
