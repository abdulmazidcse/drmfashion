import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { colorSchema } from "@/lib/validations"

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
    const parsed = colorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Invalid color" },
        { status: 400 }
      )
    }

    const existing = await prisma.color.findFirst({
      where: {
        name: { equals: parsed.data.name, mode: "insensitive" },
        NOT: { id },
      },
    })

    if (existing) {
      return NextResponse.json(
        { message: "Color with this name already exists" },
        { status: 400 }
      )
    }

    const color = await prisma.color.update({
      where: { id },
      data: parsed.data,
    })

    return NextResponse.json(color)
  } catch (error) {
    console.log("[COLOR_PATCH]", error)
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

    await prisma.color.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.log("[COLOR_DELETE]", error)
    return NextResponse.json(
      { message: "Delete failed" },
      { status: 500 }
    )
  }
}
