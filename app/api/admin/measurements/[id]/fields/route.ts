import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { slugify } from "@/lib/journal"

export const dynamic = "force-dynamic"

type RouteParams = { params: Promise<{ id: string }> }

function parseNumber(value: unknown): number | null {
  if (value === undefined || value === null || String(value).trim() === "") return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// POST add a field to a template
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id: templateId } = await params
    const body = await req.json()
    const label = String(body.label || "").trim()

    if (!label) {
      return NextResponse.json({ message: "Label is required" }, { status: 400 })
    }

    // Keys are underscored so they stay valid object keys in the order snapshot.
    const key = slugify(body.key || label).replace(/-/g, "_")
    if (!key) {
      return NextResponse.json({ message: "A valid key is required" }, { status: 400 })
    }

    const minValue = parseNumber(body.minValue)
    const maxValue = parseNumber(body.maxValue)

    if (minValue !== null && maxValue !== null && minValue > maxValue) {
      return NextResponse.json({ message: "Min value cannot be greater than max value" }, { status: 400 })
    }

    const step = parseNumber(body.step)

    const field = await prisma.measurementField.create({
      data: {
        templateId,
        label,
        key,
        unit: String(body.unit || "in").trim() || "in",
        helpText: String(body.helpText || "").trim() || null,
        placeholder: String(body.placeholder || "").trim() || null,
        minValue,
        maxValue,
        step: step && step > 0 ? step : 0.5,
        required: body.required !== false,
        position: Number.isFinite(Number(body.position)) ? Number(body.position) : 0,
      },
    })

    revalidatePath("/product/[slug]", "page")

    return NextResponse.json(field)
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ message: "A field with this key already exists in the template" }, { status: 400 })
    }
    if (error.code === "P2003") {
      return NextResponse.json({ message: "Measurement template not found" }, { status: 404 })
    }
    console.error("[MEASUREMENT_FIELD_POST_ERROR]", error)
    return NextResponse.json({ message: "Failed to create measurement field" }, { status: 500 })
  }
}
