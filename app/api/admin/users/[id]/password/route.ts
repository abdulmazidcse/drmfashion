import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json()
    const { password } = body

    if (!password) {
      return NextResponse.json({ message: "Password is required" }, { status: 400 })
    }

    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    const user = await prisma.user.update({
      where: { id },
      data: { password: hashedPassword }
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[USERS_PASSWORD_PUT]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
