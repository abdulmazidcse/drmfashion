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

    const existing = await prisma.length.findFirst({
      where: { value, NOT: { id } },
    })

    if (existing) {
      return NextResponse.json(
        { message: "Length value already exists" },
        { status: 400 }
      )
    }

    const length = await prisma.length.update({
      where: { id },
      data: { name, value },
    })

    return NextResponse.json(length)
  } catch (error) {
    console.log("[LENGTH_PATCH]", error)
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

    await prisma.length.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.log("[LENGTH_DELETE]", error)
    return NextResponse.json(
      { message: "Delete failed" },
      { status: 500 }
    )
  }
}
