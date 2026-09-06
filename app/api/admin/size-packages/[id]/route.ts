import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

type Params = {
  params: Promise<{ id: string }>
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    const body = await req.json()
    const { name, sizeIds } = body as { name?: string; sizeIds?: string[] }

    if (!name || !Array.isArray(sizeIds) || sizeIds.length === 0) {
      return NextResponse.json(
        { message: "Name and at least one size are required" },
        { status: 400 }
      )
    }

    const clash = await prisma.sizePackage.findFirst({
      where: { name, NOT: { id } },
    })
    if (clash) {
      return NextResponse.json(
        { message: "A package with this name already exists" },
        { status: 400 }
      )
    }

    // `set` replaces the whole size list in one call — added and removed sizes
    // are both handled without diffing here.
    const updated = await prisma.sizePackage.update({
      where: { id },
      data: {
        name,
        sizes: { set: sizeIds.map((sid) => ({ id: sid })) },
      },
      include: { sizes: true },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.log("[SIZE_PACKAGE_PATCH]", error)
    return NextResponse.json({ message: "Update failed" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params
    await prisma.sizePackage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.log("[SIZE_PACKAGE_DELETE]", error)
    return NextResponse.json({ message: "Delete failed" }, { status: 500 })
  }
}
