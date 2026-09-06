import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { normalizeSizeChartTable } from "@/lib/sizeChart"

// GET — every chart, with how many products use each. The count is what makes
// a delete safe to reason about, so it is part of the list rather than a
// separate lookup.
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const charts = await prisma.sizeChart.findMany({
      orderBy: { name: "asc" },
      include: { _count: { select: { products: true } } },
    })

    return NextResponse.json(
      charts.map((c) => ({
        id: c.id,
        name: c.name,
        table: c.table,
        productCount: c._count.products,
        updatedAt: c.updatedAt,
      }))
    )
  } catch (error) {
    console.error("[SIZE_CHARTS_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load size charts" }, { status: 500 })
  }
}

// POST — create
export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const name = String(body?.name ?? "").trim()

    if (!name) {
      return NextResponse.json({ message: "A name is required." }, { status: 400 })
    }

    // Normalising here rather than trusting the editor means a half-filled
    // table cannot reach the storefront as a chart with empty rows.
    const table = normalizeSizeChartTable(body?.table)
    if (!table) {
      return NextResponse.json(
        { message: "Add at least one column and one filled row." },
        { status: 400 }
      )
    }

    const existing = await prisma.sizeChart.findUnique({ where: { name } })
    if (existing) {
      return NextResponse.json(
        { message: `A size chart named "${name}" already exists.` },
        { status: 409 }
      )
    }

    const created = await prisma.sizeChart.create({ data: { name, table: table as object } })
    return NextResponse.json({ success: true, sizeChart: created }, { status: 201 })
  } catch (error) {
    console.error("[SIZE_CHARTS_POST_ERROR]", error)
    return NextResponse.json({ message: "Failed to create size chart" }, { status: 500 })
  }
}
