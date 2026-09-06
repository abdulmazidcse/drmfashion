import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

/**
 * Activate or deactivate an account.
 *
 * Deactivating also bumps tokenVersion: without that the user keeps their
 * current session until the 24h token expires, and the block would only bite
 * at the next login — which is the gap Force Logout alone left open.
 */
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: Record<string, any>
  try {
    actor = await getAdminPayload(req)
  } catch (e) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const { isActive } = await req.json()

    if (typeof isActive !== "boolean") {
      return NextResponse.json({ message: "isActive must be true or false" }, { status: 400 })
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true },
    })

    if (!target) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (target.id === String(actor.userId)) {
      return NextResponse.json(
        { message: "You cannot deactivate your own account." },
        { status: 400 }
      )
    }

    // Never leave the dashboard unreachable.
    if (!isActive && target.role === "ADMIN") {
      const activeAdmins = await prisma.user.count({
        where: { role: "ADMIN", isActive: true, NOT: { id } },
      })
      if (activeAdmins === 0) {
        return NextResponse.json(
          { message: "This is the last active admin — deactivating it would lock everyone out." },
          { status: 400 }
        )
      }
    }

    await prisma.user.update({
      where: { id },
      data: isActive
        ? { isActive: true }
        : { isActive: false, tokenVersion: { increment: 1 } },
    })

    return NextResponse.json({
      success: true,
      isActive,
      message: isActive
        ? `${target.name} can sign in again.`
        : `${target.name} has been deactivated and signed out.`,
    })
  } catch (e) {
    console.error("[ADMIN_USER_STATUS_ERROR]", e)
    return NextResponse.json({ message: "Failed to update account status" }, { status: 500 })
  }
}
