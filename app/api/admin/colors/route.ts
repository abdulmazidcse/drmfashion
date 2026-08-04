import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { colorSchema } from "@/lib/validations"

export async function GET() {
  try {
    const colors = await prisma.color.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })
    return NextResponse.json(colors)
  } catch (error) {
    console.log("[COLORS_GET]", error)
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const parsed = colorSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { message: parsed.error.issues[0]?.message || "Invalid color" },
        { status: 400 }
      )
    }

    const existingColor = await prisma.color.findFirst({
      where: { name: { equals: parsed.data.name, mode: "insensitive" } },
    })

    if (existingColor) {
      return NextResponse.json(
        { message: "Color with this name already exists" },
        { status: 400 }
      )
    }

    const color = await prisma.color.create({
      data: parsed.data,
    })

    return NextResponse.json(color)
  } catch (error) {
    console.log("[COLORS_POST]", error)
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}
