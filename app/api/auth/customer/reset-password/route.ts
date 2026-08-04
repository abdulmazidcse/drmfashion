import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { verifyOtp } from "@/lib/passwordResetOtp"

export async function POST(req: NextRequest) {
  try {
    const { email, otp, password } = await req.json()

    if (!email || !otp || !password) {
      return NextResponse.json({ message: "Email, code and new password are required." }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ message: "Password must be at least 6 characters." }, { status: 400 })
    }

    // Re-verify the OTP at reset time (defence in depth — the verify step is only UX).
    const result = await verifyOtp(email, otp)
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !user.password || user.password.startsWith("GUEST_")) {
      return NextResponse.json({ message: "No account found for this email." }, { status: 404 })
    }

    const hashed = await bcrypt.hash(password, 10)
    await prisma.user.update({
      where: { email },
      data: { password: hashed },
    })

    // Consume all reset codes for this email so they can't be reused.
    await prisma.passwordResetOtp.deleteMany({ where: { email } })

    return NextResponse.json({ success: true, message: "Password reset successfully. You can now sign in." })
  } catch (error) {
    console.error("[RESET_PASSWORD_ERROR]", error)
    return NextResponse.json({ message: "Internal server error." }, { status: 500 })
  }
}
