import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

/**
 * Revoke every session belonging to an admin user by bumping tokenVersion.
 * Their existing JWTs still verify against the secret but no longer match the
 * row, so getAdminPayload rejects them on the next request.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: Record<string, any>
  try {
    actor = await getAdminPayload(req)
  } catch (e) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, name: true, role: true },
    })

    if (!target) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    if (target.role !== "ADMIN" && target.role !== "STAFF") {
      return NextResponse.json(
        { message: "Force logout applies to admin-panel accounts only" },
        { status: 400 }
      )
    }

    // Locking yourself out mid-session is never the intent, and recovering
    // needs a fresh login — so it has to be deliberate, not a misclick.
    if (target.id === String(actor.userId)) {
      return NextResponse.json(
        { message: "You cannot force logout your own session. Use Sign Out instead." },
        { status: 400 }
      )
    }

    const updated = await prisma.user.update({
      where: { id },
      data: { tokenVersion: { increment: 1 } },
      select: { tokenVersion: true },
    })

    return NextResponse.json({
      success: true,
      message: `${target.name} has been signed out of all devices.`,
      tokenVersion: updated.tokenVersion,
    })
  } catch (e) {
    console.error("[ADMIN_FORCE_LOGOUT_ERROR]", e)
    return NextResponse.json({ message: "Failed to force logout" }, { status: 500 })
  }
}
