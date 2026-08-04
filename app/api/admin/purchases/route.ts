import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    
    const skip = (page - 1) * limit

    const [purchases, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        skip,
        take: limit,
        include: {
          supplier: true,
          items: {
            include: {
              variant: {
                include: {
                  product: true
                }
              }
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.purchaseOrder.count()
    ])

    return NextResponse.json({
      data: purchases,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error("[PURCHASES_GET]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { supplierId, status, items, notes } = body

    if (!supplierId || !items || !items.length) {
      return NextResponse.json({ message: "Supplier and Items are required" }, { status: 400 })
    }

    // Calculate total cost
    const totalCost = items.reduce((sum: number, item: any) => sum + (item.quantity * item.unitCost), 0)

    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        supplierId,
        status: status || 'DRAFT',
        totalCost,
        notes,
        items: {
          create: items.map((item: any) => ({
            variantId: item.variantId,
            quantity: item.quantity,
            unitCost: item.unitCost
          }))
        }
      },
      include: {
        supplier: true,
        items: true
      }
    })

    return NextResponse.json(purchaseOrder)
  } catch (error: any) {
    console.error("[PURCHASES_POST]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
