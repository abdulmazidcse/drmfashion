import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// GET — List all return requests (Admin)
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const status = searchParams.get("status") || "ALL"

    const where: any = {}
    if (status !== "ALL") where.status = status

    const returns = await prisma.returnRequest.findMany({
      where,
      include: {
        user: { select: { name: true, email: true } },
        order: {
          select: {
            id: true,
            totalAmount: true,
            status: true,
            items: {
              include: {
                variant: { include: { product: { select: { title: true, thumbnail: true } } } }
              }
            }
          }
        }
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json(returns)
  } catch (error) {
    console.error("[ADMIN_RETURNS_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load returns" }, { status: 500 })
  }
}

// PATCH — Update return status
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json()
    const { id, status, adminNote } = body

    if (!id || !status) {
      return NextResponse.json({ message: "Missing id or status" }, { status: 400 })
    }

    const returnReq = await prisma.returnRequest.update({
      where: { id },
      data: { status, adminNote },
      include: { user: { select: { name: true, email: true } } }
    })

    // Send email notification
    try {
      const { sendReturnStatusEmail } = await import("@/lib/email")
      if (returnReq.user?.email) {
        await sendReturnStatusEmail(returnReq.user.email, {
          customerName: returnReq.user.name,
          orderId: returnReq.orderId,
          returnStatus: status,
          note: adminNote,
        })
      }
    } catch (emailErr) {
      console.error("[RETURN_EMAIL_ERROR]", emailErr)
    }

    return NextResponse.json(returnReq)
  } catch (error) {
    console.error("[ADMIN_RETURNS_PATCH_ERROR]", error)
    return NextResponse.json({ message: "Failed to update return" }, { status: 500 })
  }
}
