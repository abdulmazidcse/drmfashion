import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { sendVerificationCode } from "@/lib/emailVerification"

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
        await prisma.user.update({
          where: { email },
          data: { name, phone, password: hashedPassword, emailVerifiedAt: null }
        })
        // A guest row proves nothing about the address — the order was never
        // confirmed by clicking anything — so it still has to be verified.
        await sendVerificationCode(email, name)
        return NextResponse.json({
          success: true,
          requiresVerification: true,
          message: "Enter the code we sent to your email to finish setting up your account.",
        })
      }
      return NextResponse.json({ message: "An account with this email already exists." }, { status: 409 })
    }

    const hashedPassword = await bcrypt.hash(password, 12)

    // emailVerifiedAt stays null until the code is entered; login refuses the
    // account in the meantime.
    await prisma.user.create({
      data: { name, email, phone, password: hashedPassword, role: "USER" }
    })

    const sent = await sendVerificationCode(email, name)
    if (!sent.ok) {
      // The account exists and the code is stored — say so plainly rather than
      // implying the sign-up failed, and let them resend.
      return NextResponse.json(
        { success: true, requiresVerification: true, message: sent.message },
        { status: 201 }
      )
    }

    // The welcome email waits until the address is confirmed, so it is sent
    // from the verify route rather than here.
    return NextResponse.json(
      {
        success: true,
        requiresVerification: true,
        message: "Enter the code we sent to your email to finish setting up your account.",
      },
      { status: 201 }
    )
  } catch (error: any) {
    console.error("[CUSTOMER_REGISTER_ERROR]", error)
    return NextResponse.json({ message: "Internal server error." }, { status: 500 })
  }
}
