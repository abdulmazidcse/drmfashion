import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { normalizeSizeChartTable } from "@/lib/sizeChart"

type Params = { params: Promise<{ id: string }> }

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const chart = await prisma.sizeChart.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })
    if (!chart) return NextResponse.json({ message: "Size chart not found" }, { status: 404 })

    return NextResponse.json({
      id: chart.id,
      name: chart.name,
      table: chart.table,
      productCount: chart._count.products,
    })
  } catch (error) {
    console.error("[SIZE_CHART_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load size chart" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    const name = String(body?.name ?? "").trim()
    if (!name) return NextResponse.json({ message: "A name is required." }, { status: 400 })

    const table = normalizeSizeChartTable(body?.table)
    if (!table) {
      return NextResponse.json(
        { message: "Add at least one column and one filled row." },
        { status: 400 }
      )
    }

    // A rename must not collide with another chart — the name is what the
    // product picker shows, so two identical entries would be unpickable.
    const clash = await prisma.sizeChart.findFirst({
      where: { name, NOT: { id } },
      select: { id: true },
    })
    if (clash) {
      return NextResponse.json(
        { message: `A size chart named "${name}" already exists.` },
        { status: 409 }
      )
    }

    const updated = await prisma.sizeChart.update({
      where: { id },
      data: { name, table: table as object },
    })

    return NextResponse.json({ success: true, sizeChart: updated })
  } catch (error) {
    console.error("[SIZE_CHART_PUT_ERROR]", error)
    return NextResponse.json({ message: "Failed to save size chart" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    // `onDelete: SetNull` means deleting is not destructive to the products —
    // they simply stop offering a chart. Saying how many are affected first is
    // what makes that an informed decision rather than a surprise.
    const chart = await prisma.sizeChart.findUnique({
      where: { id },
      include: { _count: { select: { products: true } } },
    })
    if (!chart) return NextResponse.json({ message: "Size chart not found" }, { status: 404 })

    await prisma.sizeChart.delete({ where: { id } })

    return NextResponse.json({ success: true, unlinkedProducts: chart._count.products })
  } catch (error) {
    console.error("[SIZE_CHART_DELETE_ERROR]", error)
    return NextResponse.json({ message: "Failed to delete size chart" }, { status: 500 })
  }
}
