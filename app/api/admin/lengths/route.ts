import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const lengths = await prisma.length.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })
    return NextResponse.json(lengths)
  } catch (error) {
    console.log("[LENGTHS_GET]", error)
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
        { message: "Name and Length Value are required" },
        { status: 400 }
      )
    }

    const existingLength = await prisma.length.findUnique({
      where: { value },
    })

    if (existingLength) {
      return NextResponse.json(
        { message: "Length with this value already exists" },
        { status: 400 }
      )
    }

    const length = await prisma.length.create({
      data: {
        name,
        value,
      },
    })

    return NextResponse.json(length)
  } catch (error) {
    console.log("[LENGTHS_POST]", error)
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}
