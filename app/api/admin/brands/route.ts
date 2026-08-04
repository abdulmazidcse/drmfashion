import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const brands = await prisma.brand.findMany({
      orderBy: {
        createdAt: "desc",
      },
    })
    return NextResponse.json(brands)
  } catch (error) {
    console.log("[BRANDS_GET]", error)
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, slug, image, description } = body

    if (!name || !slug) {
      return NextResponse.json(
        { message: "Name and Slug are required" },
        { status: 400 }
      )
    }

    const existingBrand = await prisma.brand.findUnique({
      where: { slug },
    })

    if (existingBrand) {
      return NextResponse.json(
        { message: "Slug already exists" },
        { status: 400 }
      )
    }

    const brand = await prisma.brand.create({
      data: {
        name,
        slug,
        image,
        description,
      },
    })

    return NextResponse.json(brand)
  } catch (error) {
    console.log("[BRANDS_POST]", error)
    return NextResponse.json(
      { message: "Something went wrong" },
      { status: 500 }
    )
  }
}
