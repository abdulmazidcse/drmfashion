import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const email = searchParams.get("email")

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const user = await prisma.user.findUnique({
      where: { email },
      include: {
        orders: {
          include: {
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
          orderBy: {
            createdAt: "desc"
          }
        }
      }
    })

    if (!user) {
      return NextResponse.json({ found: false, message: "No customer profile found under this email." })
    }

    return NextResponse.json({
      found: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || ""
      },
      orders: user.orders.map(order => ({
        id: order.id,
        totalAmount: order.totalAmount,
        status: order.status,
        paymentStatus: order.paymentStatus,
        shippingAddress: order.shippingAddress,
        shippingPhone: order.shippingPhone,
        currencyCode: order.currencyCode,
        currencySymbol: order.currencySymbol,
        exchangeRate: order.exchangeRate,
        createdAt: order.createdAt,
        items: order.items.map(item => ({
          id: item.id,
          quantity: item.quantity,
          price: item.price,
          productTitle: item.variant.product.title,
          thumbnail: item.variant.product.thumbnail,
          color: item.variant.color,
          size: item.variant.size,
          length: item.variant.length,
          isCustom: item.isCustom,
          customFee: item.customFee,
          customMeasurements: item.customMeasurements
        }))
      }))
    })

  } catch (error: any) {
    console.error("[CUSTOMER_ACCOUNT_GET_ERROR]", error)
    return NextResponse.json({ error: "Server error retrieving profile details." }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { email, name, phone } = body

    if (!email || !name) {
      return NextResponse.json({ error: "Email and name are required." }, { status: 400 })
    }

    let user = await prisma.user.findUnique({
      where: { email }
    })

    if (user) {
      user = await prisma.user.update({
        where: { email },
        data: {
          name,
          phone
        }
      })
    } else {
      user = await prisma.user.create({
        data: {
          email,
          name,
          phone,
          password: `GUEST_${Math.random().toString(36).slice(-8)}`
        }
      })
    }

    return NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || ""
      }
    })

  } catch (error: any) {
    console.error("[CUSTOMER_ACCOUNT_POST_ERROR]", error)
    return NextResponse.json({ error: "Server error saving profile changes." }, { status: 500 })
  }
}
