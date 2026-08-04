import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const status = searchParams.get("status") || "ALL"
    const paymentStatus = searchParams.get("paymentStatus") || "ALL"
    
    const skip = (page - 1) * limit

    const whereClause: any = {}
    if (search) {
      whereClause.OR = [
        { id: { contains: search } },
        { user: { name: { contains: search } } },
        { user: { email: { contains: search } } },
        { user: { phone: { contains: search } } }
      ]
    }
    if (status && status !== "ALL") {
      whereClause.status = status
    }
    if (paymentStatus && paymentStatus !== "ALL") {
      whereClause.paymentStatus = paymentStatus
    }

    const [orders, total] = await Promise.all([
      prisma.order.findMany({
        where: whereClause,
        skip,
        take: limit,
        include: {
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              phone: true,
            },
          },
          payment: true,
          items: {
            include: {
              variant: {
                include: {
                  product: {
                    select: {
                      id: true,
                      title: true,
                      thumbnail: true,
                    },
                  },
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      }),
      prisma.order.count({ where: whereClause })
    ])

    return NextResponse.json({
      data: orders,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error("[ADMIN_ORDERS_GET_ERROR]", error)
    return NextResponse.json(
      { message: "Failed to load orders." },
      { status: 500 }
    )
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      userId,
      fullName,
      email,
      phone,
      address,
      paymentMethod,
      paymentStatus,
      status,
      totalAmount,
      items,
      paymentDetails,
    } = body

    if (!items || items.length === 0) {
      return NextResponse.json(
        { message: "No products selected in order." },
        { status: 400 }
      )
    }

    // 1. Resolve or Create User
    let user = null
    if (userId) {
      user = await prisma.user.findUnique({
        where: { id: userId },
      })
    }

    if (!user) {
      const userEmail = email || `walkin_${Date.now()}_${Math.random().toString(36).slice(-4)}@fashionstore.com`
      
      // Look up user by email if we generated or they provided one
      user = await prisma.user.findUnique({
        where: { email: userEmail },
      })

      if (!user) {
        user = await prisma.user.create({
          data: {
            email: userEmail,
            name: fullName || "Walk-in Customer",
            password: `GUEST_${Math.random().toString(36).slice(-8)}`,
            phone: phone || "01900000000",
            role: "USER",
          },
        })
      }
    }

    // 2. Perform checkout transactions
    const order = await prisma.$transaction(async (tx) => {
      const orderItemsData = []

      for (const item of items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          include: { product: true },
        })

        if (!variant) {
          throw new Error(`Variant not found for product ID ${item.variantId}`)
        }

        // Decrement product variant stock
        const newStock = Math.max(0, variant.stock - item.quantity)
        await tx.productVariant.update({
          where: { id: variant.id },
          data: { stock: newStock },
        })

        // Log inventory change
        await tx.inventoryLog.create({
          data: {
            variantId: variant.id,
            previousStock: variant.stock,
            newStock: newStock,
            note: `Stock reduced due to admin POS sale. Order created by Admin.`,
          },
        })

        orderItemsData.push({
          variantId: variant.id,
          quantity: item.quantity,
          price: item.price ?? variant.price ?? variant.product.basePrice,
        })
      }

      // Create main Order record
      const newOrder = await tx.order.create({
        data: {
          userId: user.id,
          totalAmount,
          status: status || "DELIVERED",
          paymentStatus: paymentStatus || "PAID",
          shippingAddress: address || "Shop Pickup",
          shippingPhone: phone || user.phone || "01900000000",
          items: {
            create: orderItemsData,
          },
        },
      })

      // Record payment transaction if PAID
      if (paymentStatus === "PAID" || paymentMethod !== "cod") {
        const transId = paymentDetails?.transactionId || `POS_${Date.now()}`
        await tx.payment.create({
          data: {
            orderId: newOrder.id,
            provider: paymentMethod || "cash",
            amount: totalAmount,
            status: paymentStatus || "PAID",
            transactionId: transId,
          },
        })
      }

      return newOrder
    })

    return NextResponse.json({
      success: true,
      orderId: order.id,
    })
  } catch (error: any) {
    console.error("[ADMIN_ORDERS_POST_ERROR]", error)
    return NextResponse.json(
      { message: error.message || "Failed to process POS order." },
      { status: 500 }
    )
  }
}

export const dynamic = "force-dynamic"

