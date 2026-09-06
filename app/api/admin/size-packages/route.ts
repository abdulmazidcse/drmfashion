import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const packages = await prisma.sizePackage.findMany({
      orderBy: { createdAt: "desc" },
      include: { sizes: true },
    })
    return NextResponse.json(packages)
  } catch (error) {
    console.log("[SIZE_PACKAGES_GET]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, sizeIds } = body as { name?: string; sizeIds?: string[] }

    if (!name || !Array.isArray(sizeIds) || sizeIds.length === 0) {
      return NextResponse.json(
        { message: "Name and at least one size are required" },
        { status: 400 }
      )
    }

    const existing = await prisma.sizePackage.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json(
        { message: "A package with this name already exists" },
        { status: 400 }
      )
    }

    const created = await prisma.sizePackage.create({
      data: {
        name,
        sizes: { connect: sizeIds.map((id) => ({ id })) },
      },
      include: { sizes: true },
    })

    return NextResponse.json(created)
  } catch (error) {
    console.log("[SIZE_PACKAGES_POST]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
