import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { compareLengths } from "@/lib/variants"

export async function GET() {
  try {
    const lengths = await prisma.length.findMany()
    // Ascending by the length itself (30 < 32 < 34, Semi Tall < Tall), not by
    // when the row was added — every picker that lists these shows them as-is.
    lengths.sort((a, b) => compareLengths(a.value, b.value))
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
