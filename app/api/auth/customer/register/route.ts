import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function POST(req: NextRequest) {
  try {
    const { name, email, phone, password } = await req.json()

    if (!name || !email || !password) {
      return NextResponse.json({ message: "Name, email and password are required." }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters." }, { status: 400 })
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      // If they are a guest (no real password), upgrade their account
      if (existing.password?.startsWith("GUEST_")) {
        const hashedPassword = await bcrypt.hash(password, 12)
        const updated = await prisma.user.update({
          where: { email },
          data: { name, phone, password: hashedPassword }
        })
        return NextResponse.json({ success: true, message: "Account created successfully." })
      }
      return NextResponse.json({ message: "An account with this email already exists." }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    await prisma.user.create({
      data: { name, email, phone, password: hashedPassword, role: "USER" }
    })

    // Send welcome email (non-blocking)
    try {
      const { sendWelcomeEmail } = await import("@/lib/email")
      await sendWelcomeEmail(email, { name })
    } catch (emailErr) {
      console.error("[REGISTER_WELCOME_EMAIL_ERROR]", emailErr)
    }

    return NextResponse.json({ success: true, message: "Account created successfully." }, { status: 201 })
  } catch (error: any) {
    console.error("[CUSTOMER_REGISTER_ERROR]", error)
    return NextResponse.json({ message: "Internal server error." }, { status: 500 })
  }
}
