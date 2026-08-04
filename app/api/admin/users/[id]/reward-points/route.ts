import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

// PATCH /api/admin/users/[id]/reward-points
// Body: { operation: "add" | "deduct" | "set", amount: number }
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await req.json()
    const { operation, amount } = body

    if (!operation || amount === undefined || amount === null) {
      return NextResponse.json(
        { message: "operation and amount are required" },
        { status: 400 }
      )
    }

    if (!["add", "deduct", "set"].includes(operation)) {
      return NextResponse.json(
        { message: "operation must be 'add', 'deduct', or 'set'" },
        { status: 400 }
      )
    }

    const parsedAmount = parseInt(amount)
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return NextResponse.json(
        { message: "amount must be a non-negative integer" },
        { status: 400 }
      )
    }

    // Get current user
    const user = await prisma.user.findUnique({
      where: { id },
      select: { id: true, rewardPoints: true },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    let newPoints: number

    if (operation === "add") {
      newPoints = user.rewardPoints + parsedAmount
    } else if (operation === "deduct") {
      newPoints = Math.max(0, user.rewardPoints - parsedAmount)
    } else {
      // set
      newPoints = parsedAmount
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { rewardPoints: newPoints },
      select: { id: true, name: true, email: true, rewardPoints: true },
    })

    return NextResponse.json(updatedUser)
  } catch (error: any) {
    console.error("[REWARD_POINTS_PATCH]", error)
    return NextResponse.json(
      { message: error.message || "Internal Server Error" },
      { status: 500 }
    )
  }
}
