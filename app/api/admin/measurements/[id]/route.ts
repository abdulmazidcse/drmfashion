import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { slugify } from "@/lib/journal"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ id: string }> }

const SURCHARGE_TYPES = ["FLAT", "PERCENT"] as const

function parseSurchargeType(value: unknown) {
  return SURCHARGE_TYPES.includes(value as any) ? (value as "FLAT" | "PERCENT") : "FLAT"
}

// PUT update a measurement template
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const name = String(body.name || "").trim()

    if (!name) {
      return NextResponse.json({ message: "Name is required" }, { status: 400 })
    }

    const slug = slugify(body.slug || name)
    if (!slug) {
      return NextResponse.json({ message: "A valid slug is required" }, { status: 400 })
    }

    const surchargeValue = Number(body.surchargeValue)

    const template = await prisma.measurementTemplate.update({
      where: { id },
      data: {
        name,
        slug,
        description: String(body.description || "").trim() || null,
        instructions: String(body.instructions || "").trim() || null,
        surchargeType: parseSurchargeType(body.surchargeType),
        surchargeValue: Number.isFinite(surchargeValue) && surchargeValue > 0 ? surchargeValue : 0,
        active: body.active !== false,
        position: Number.isFinite(Number(body.position)) ? Number(body.position) : 0,
      },
      include: {
        fields: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          include: { tiers: { orderBy: [{ position: "asc" }, { minValue: "asc" }] } },
        },
      },
    })

    revalidatePath("/product/[slug]", "page")

    return NextResponse.json(template)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ message: "Slug must be unique" }, { status: 400 })
    }
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Measurement template not found" }, { status: 404 })
    }
    console.error("[MEASUREMENT_PUT_ERROR]", error)
    return NextResponse.json({ message: "Failed to update measurement template" }, { status: 500 })
  }
}

// DELETE a measurement template. Products keep working — they simply fall back
// to standard sizing because measurementTemplateId is set to null.
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    const linkedProducts = await prisma.product.count({ where: { measurementTemplateId: id } })
    if (linkedProducts > 0) {
      await prisma.product.updateMany({
        where: { measurementTemplateId: id },
        data: { customMeasurementEnabled: false, measurementTemplateId: null },
      })
    }

    await prisma.measurementTemplate.delete({ where: { id } })

    revalidatePath("/product/[slug]", "page")

    return NextResponse.json({ success: true, detachedProducts: linkedProducts })
  } catch (error: any) {
    if (error.code === "P2025") {
      return NextResponse.json({ message: "Measurement template not found" }, { status: 404 })
    }
    console.error("[MEASUREMENT_DELETE_ERROR]", error)
    return NextResponse.json({ message: "Failed to delete measurement template" }, { status: 500 })
  }
}
