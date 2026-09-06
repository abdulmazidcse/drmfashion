import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { sanitizePermissions } from "@/lib/permissions"
import { ensureDefaultRoles, slugifyRole } from "@/lib/roles"

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

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch (e) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureDefaultRoles()
    const roles = await prisma.adminRole.findMany({
      orderBy: [{ isSystem: "desc" }, { name: "asc" }],
      select: roleSelect,
    })
    return NextResponse.json(roles)
  } catch (error) {
    console.error("[ROLES_GET]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch (e) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const slug = slugifyRole(typeof body.slug === "string" && body.slug.trim() ? body.slug : name)
    const description = typeof body.description === "string" ? body.description.trim() || null : null
    const permissions = sanitizePermissions(body.permissions)

    if (!name || !slug) {
      return NextResponse.json({ message: "Role name is required" }, { status: 400 })
    }

    const clash = await prisma.adminRole.findFirst({
      where: { OR: [{ name }, { slug }] },
      select: { id: true },
    })
    if (clash) {
      return NextResponse.json({ message: "A role with this name or slug already exists" }, { status: 409 })
    }

    const role = await prisma.adminRole.create({
      data: { name, slug, description, permissions },
      select: roleSelect,
    })

    return NextResponse.json(role, { status: 201 })
  } catch (error) {
    console.error("[ROLES_POST]", error)
    return NextResponse.json({ message: "Something went wrong" }, { status: 500 })
  }
}
