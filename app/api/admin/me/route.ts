import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

/**
 * Identity + live permissions of the signed-in admin-panel user. Always
 * allowed for ADMIN and STAFF (see ALWAYS_ALLOWED in lib/permissions.ts);
 * the client uses it to hide navigation the user cannot open.
 */
export async function GET(req: NextRequest) {
  let payload: Awaited<ReturnType<typeof getAdminPayload>>
  try {
    payload = await getAdminPayload(req)
  } catch (e) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        adminRole: { select: { id: true, name: true } },
      },
    })

    if (!user) {
      return NextResponse.json({ message: "User not found" }, { status: 404 })
    }

    return NextResponse.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      adminRole: user.adminRole,
      permissions: payload.permissions,
    })
  } catch (error) {
    console.error("[ADMIN_ME_GET]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
