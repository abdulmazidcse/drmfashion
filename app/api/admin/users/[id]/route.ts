import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

const ROLES = ["USER", "ADMIN", "STAFF"] as const
type RoleValue = (typeof ROLES)[number]

/**
 * Change a user's access: `role` (USER / ADMIN / STAFF) and, for STAFF, the
 * `adminRoleId` whose permissions they inherit. Any change bumps tokenVersion
 * so a live admin session picks up the new access only after signing in
 * again — the old JWT carries the old role and permission list.
 */
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  let actor: Awaited<ReturnType<typeof getAdminPayload>>
  try {
    actor = await getAdminPayload(req)
  } catch (e) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params;
    const body = await req.json()
    const role = body.role as RoleValue | undefined

    if (!role || !ROLES.includes(role)) {
      return NextResponse.json({ message: "Role is required" }, { status: 400 })
    }

    const adminRoleId: string | null =
      role === "STAFF" && typeof body.adminRoleId === "string" && body.adminRoleId ? body.adminRoleId : null

    if (role === "STAFF") {
      if (!adminRoleId) {
        return NextResponse.json({ message: "A staff role must be selected for STAFF users" }, { status: 400 })
      }
      const adminRole = await prisma.adminRole.findUnique({ where: { id: adminRoleId }, select: { id: true } })
      if (!adminRole) {
        return NextResponse.json({ message: "Selected staff role does not exist" }, { status: 400 })
      }
    }

    const target = await prisma.user.findUnique({
      where: { id },
      select: { id: true, role: true, adminRoleId: true, isActive: true },
    })
    if (!target) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    // Changing your own access signs you out mid-session; that has to be
    // another admin's deliberate act, not a misclick.
    if (target.id === actor.userId && (role !== target.role || adminRoleId !== target.adminRoleId)) {
      return NextResponse.json({ message: "You cannot change your own access level." }, { status: 400 })
    }

    // Never leave the dashboard without a full administrator.
    if (target.role === "ADMIN" && role !== "ADMIN") {
      const otherActiveAdmins = await prisma.user.count({
        where: { role: "ADMIN", isActive: true, NOT: { id } },
      })
      if (otherActiveAdmins === 0) {
        return NextResponse.json(
          { message: "This is the last active admin — demoting it would lock everyone out." },
          { status: 400 }
        )
      }
    }

    const accessChanged = role !== target.role || adminRoleId !== target.adminRoleId

    const user = await prisma.user.update({
      where: { id },
      data: {
        role,
        adminRoleId,
        ...(accessChanged ? { tokenVersion: { increment: 1 } } : {}),
      },
      include: { adminRole: { select: { id: true, name: true } } },
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error("[USERS_PUT]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;

    // Check if user is the last admin before deleting?
    // Let's just delete the user for now
    await prisma.user.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[USERS_DELETE]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
