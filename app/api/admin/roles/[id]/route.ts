import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { sanitizePermissions } from "@/lib/permissions"
import { slugifyRole } from "@/lib/roles"

type Params = { params: Promise<{ id: string }> }

const roleSelect = {
  id: true,
  name: true,
  slug: true,
  description: true,
  permissions: true,
  isSystem: true,
  createdAt: true,
  updatedAt: true,
  _count: { select: { users: true } },
} as const

function samePermissions(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  const set = new Set(a)
  return b.every((p) => set.has(p))
}

export async function GET(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch (e) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const role = await prisma.adminRole.findUnique({ where: { id }, select: roleSelect })
    if (!role) return NextResponse.json({ message: "Role not found" }, { status: 404 })
    return NextResponse.json(role)
  } catch (error) {
    console.error("[ROLE_GET]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch (e) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    const existing = await prisma.adminRole.findUnique({
      where: { id },
      select: { id: true, name: true, slug: true, permissions: true },
    })
    if (!existing) return NextResponse.json({ message: "Role not found" }, { status: 404 })

    const data: { name?: string; slug?: string; description?: string | null; permissions?: string[] } = {}

    if (typeof body.name === "string") {
      const name = body.name.trim()
      if (!name) return NextResponse.json({ message: "Role name is required" }, { status: 400 })
      data.name = name
    }
    if (typeof body.slug === "string" && body.slug.trim()) {
      data.slug = slugifyRole(body.slug)
    } else if (data.name && data.name !== existing.name && body.slug === undefined) {
      data.slug = slugifyRole(data.name)
    }
    if (body.description !== undefined) {
      data.description = typeof body.description === "string" ? body.description.trim() || null : null
    }

    let permissionsChanged = false
    if (body.permissions !== undefined) {
      const permissions = sanitizePermissions(body.permissions)
      permissionsChanged = !samePermissions(permissions, existing.permissions)
      data.permissions = permissions
    }

    if (data.name || data.slug) {
      const clash = await prisma.adminRole.findFirst({
        where: {
          NOT: { id },
          OR: [
            ...(data.name ? [{ name: data.name }] : []),
            ...(data.slug ? [{ slug: data.slug }] : []),
          ],
        },
        select: { id: true },
      })
      if (clash) {
        return NextResponse.json({ message: "A role with this name or slug already exists" }, { status: 409 })
      }
    }

    const role = await prisma.$transaction(async (tx) => {
      const updated = await tx.adminRole.update({ where: { id }, data, select: roleSelect })

      // STAFF tokens carry a copy of the permission list from login time.
      // Bumping tokenVersion invalidates every session holding the old copy,
      // so members see the new permissions on their next sign-in.
      if (permissionsChanged) {
        await tx.user.updateMany({
          where: { adminRoleId: id },
          data: { tokenVersion: { increment: 1 } },
        })
      }

      return updated
    })

    return NextResponse.json({ ...role, sessionsRevoked: permissionsChanged })
  } catch (error) {
    console.error("[ROLE_PATCH]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch (e) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const role = await prisma.adminRole.findUnique({
      where: { id },
      select: { id: true, isSystem: true, _count: { select: { users: true } } },
    })
    if (!role) return NextResponse.json({ message: "Role not found" }, { status: 404 })

    if (role.isSystem) {
      return NextResponse.json({ message: "Built-in roles cannot be deleted. Edit its permissions instead." }, { status: 409 })
    }
    if (role._count.users > 0) {
      return NextResponse.json(
        { message: `This role is assigned to ${role._count.users} user${role._count.users === 1 ? "" : "s"}. Reassign them first.` },
        { status: 409 }
      )
    }

    await prisma.adminRole.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ROLE_DELETE]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
