import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

const ROLES = ["USER", "ADMIN", "STAFF"] as const
type RoleValue = (typeof ROLES)[number]

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const page = parseInt(searchParams.get("page") || "1")
    const limit = parseInt(searchParams.get("limit") || "20")
    const search = searchParams.get("search") || ""
    const role = searchParams.get("role") || "ALL"

    const skip = (page - 1) * limit

    const whereClause: any = {}
    if (search) {
      whereClause.OR = [
        { name: { contains: search } },
        { email: { contains: search } },
        { phone: { contains: search } }
      ]
    }
    if (role && role !== "ALL") {
      whereClause.role = role
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: { adminRole: { select: { id: true, name: true } } },
      }),
      prisma.user.count({ where: whereClause })
    ])

    return NextResponse.json({
      data: users,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error: any) {
    console.error("[USERS_GET]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { name, email, phone, password } = body
    const role: RoleValue = ROLES.includes(body.role) ? body.role : "USER"
    const adminRoleId: string | null = role === "STAFF" && typeof body.adminRoleId === "string" && body.adminRoleId ? body.adminRoleId : null

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Name, email, and password are required" }, { status: 400 })
    }

    if (role === "STAFF") {
      if (!adminRoleId) {
        return NextResponse.json({ message: "A staff role must be selected for STAFF users" }, { status: 400 })
      }
      const adminRole = await prisma.adminRole.findUnique({ where: { id: adminRoleId }, select: { id: true } })
      if (!adminRole) {
        return NextResponse.json({ message: "Selected staff role does not exist" }, { status: 400 })
      }
    }

    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ message: "Email is already registered" }, { status: 400 })
    }

    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        phone,
        role,
        adminRoleId,
        password: hashedPassword
      },
      include: { adminRole: { select: { id: true, name: true } } },
    })

    return NextResponse.json(newUser, { status: 201 })
  } catch (error: any) {
    console.error("[USERS_POST]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
