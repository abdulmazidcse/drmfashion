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
        shippingCarrier: order.shippingCarrier,
        shippingMethod: order.shippingMethod,
        trackingNumber: order.trackingNumber,
        trackingUrl: order.trackingUrl,
        estimatedDeliveryAt: order.estimatedDeliveryAt,
        shippedAt: order.shippedAt,
        deliveredAt: order.deliveredAt,
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

/**
 * Self-service account deletion.
 *
 * The row is kept and its personal details overwritten rather than deleted
 * outright: orders, payments and return requests all reference this user, and
 * the shop's own records have to survive. What goes is everything that
 * identifies the person — name, email, phone, password, addresses, reviews,
 * questions, wishlist and cart.
 *
 * The password is required so a leaked email alone cannot wipe an account.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    if (!user || user.deletedAt) {
      return NextResponse.json({ error: "Account not found." }, { status: 404 })
    }

    // Guest rows are created by checkout with a placeholder password and were
    // never signed up for, so there is no account to delete.
    if (!user.password || user.password.startsWith("GUEST_")) {
      return NextResponse.json({ error: "This email has no registered account." }, { status: 400 })
    }

    const bcrypt = (await import("bcryptjs")).default
    if (!(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Incorrect password." }, { status: 401 })
    }

    // Admins have to be removed by another admin — self-deleting one could
    // leave the dashboard unreachable.
    if (user.role === "ADMIN") {
      return NextResponse.json(
        { error: "Admin accounts cannot be deleted here. Contact another administrator." },
        { status: 403 }
      )
    }

    // Unique constraint on email means the address has to be replaced, not
    // blanked — freeing it also lets the person sign up again later.
    const anonymisedEmail = `deleted-${user.id}@deleted.invalid`

    await prisma.$transaction([
      prisma.address.deleteMany({ where: { userId: user.id } }),
      prisma.review.deleteMany({ where: { userId: user.id } }),
      prisma.productQuestion.deleteMany({ where: { userId: user.id } }),
      prisma.wishlist.deleteMany({ where: { userId: user.id } }),
      prisma.cart.deleteMany({ where: { userId: user.id } }),
      prisma.subscriber.deleteMany({ where: { email: { equals: email, mode: "insensitive" } } }),
      prisma.user.update({
        where: { id: user.id },
        data: {
          name: "Deleted user",
          email: anonymisedEmail,
          phone: null,
          // Not a valid bcrypt hash, so no password can ever match it.
          password: `DELETED_${Math.random().toString(36).slice(-12)}`,
          isActive: false,
          deletedAt: new Date(),
          tokenVersion: { increment: 1 },
          rewardPoints: 0,
        },
      }),
    ])

    const response = NextResponse.json({ success: true, message: "Your account has been deleted." })
    response.cookies.delete("ag_customer_token")
    return response
  } catch (error: any) {
    console.error("[CUSTOMER_ACCOUNT_DELETE_ERROR]", error)
    return NextResponse.json({ error: "Server error deleting account." }, { status: 500 })
  }
}
