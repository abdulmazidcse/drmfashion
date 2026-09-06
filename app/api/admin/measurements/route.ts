import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { slugify } from "@/lib/journal"

export const dynamic = "force-dynamic"

const SURCHARGE_TYPES = ["FLAT", "PERCENT"] as const

function parseSurchargeType(value: unknown) {
  return SURCHARGE_TYPES.includes(value as any) ? (value as "FLAT" | "PERCENT") : "FLAT"
}

// GET all measurement templates with their fields
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const templates = await prisma.measurementTemplate.findMany({
      orderBy: [{ position: "asc" }, { name: "asc" }],
      include: {
        fields: {
          orderBy: [{ position: "asc" }, { createdAt: "asc" }],
          include: { tiers: { orderBy: [{ position: "asc" }, { minValue: "asc" }] } },
        },
        _count: { select: { products: true } },
      },
    })
    return NextResponse.json(templates)
  } catch (error: any) {
    console.error("[MEASUREMENTS_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load measurement templates" }, { status: 500 })
  }
}

// POST create a measurement template
export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
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

    const template = await prisma.measurementTemplate.create({
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
      include: { fields: true },
    })

    revalidatePath("/product/[slug]", "page")

    return NextResponse.json(template)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ message: "Slug must be unique" }, { status: 400 })
    }
    console.error("[MEASUREMENTS_POST_ERROR]", error)
    return NextResponse.json({ message: "Failed to create measurement template" }, { status: 500 })
  }
}
