import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function PATCH(
  req: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, value } = body

    if (!name || !value) {
      return NextResponse.json(
        { message: "Name and value are required" },
        { status: 400 }
      )
    }

    const existing = await prisma.size.findFirst({
      where: { value, NOT: { id } },
    })

    if (existing) {
      return NextResponse.json(
        { message: "Size value already exists" },
        { status: 400 }
      )
    }

    const size = await prisma.size.update({
      where: { id },
      data: { name, value },
    })

    return NextResponse.json(size)
  } catch (error) {
    console.log("[SIZE_PATCH]", error)
    return NextResponse.json(
      { message: "Update failed" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params

    await prisma.size.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.log("[SIZE_DELETE]", error)
    return NextResponse.json(
      { message: "Delete failed" },
      { status: 500 }
    )
  }
}
