import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const suppliers = await prisma.supplier.findMany({
      orderBy: { name: 'asc' }
    })
    return NextResponse.json(suppliers)
  } catch (error: any) {
    console.error("[SUPPLIERS_GET]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, address } = body

    if (!name) {
      return NextResponse.json({ message: "Supplier name is required" }, { status: 400 })
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        email,
        phone,
        address
      }
    })

    return NextResponse.json(supplier)
  } catch (error: any) {
    console.error("[SUPPLIERS_POST]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
