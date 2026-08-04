import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const sizes = await prisma.size.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })
    return NextResponse.json(sizes)
  } catch (error) {
    console.log("[SIZES_GET]", error)
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, value } = body

    if (!name || !value) {
      return NextResponse.json(
        { message: "Name and Size Value are required" },
        { status: 400 }
      )
    }

    const existingSize = await prisma.size.findUnique({
      where: { value },
    })

    if (existingSize) {
      return NextResponse.json(
        { message: "Size with this value already exists" },
        { status: 400 }
      )
    }

    const size = await prisma.size.create({
      data: {
        name,
        value,
      },
    })

    return NextResponse.json(size)
  } catch (error) {
    console.log("[SIZES_POST]", error)
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}
