import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { sendPasswordResetOtpEmail } from "@/lib/email"
import {
  generateOtp,
  hashOtp,
  OTP_EXPIRY_MINUTES,
  OTP_RESEND_COOLDOWN_SECONDS,
} from "@/lib/passwordResetOtp"

// Generic response used whether or not the email exists — prevents attackers
// from probing which emails have accounts (email enumeration).
const GENERIC_OK = {
  success: true,
  message: "If an account exists for this email, a reset code has been sent.",
}

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !email.includes("@")) {
      return NextResponse.json({ message: "A valid email is required." }, { status: 400 })
    }

    const user = await prisma.user.findUnique({ where: { email } })

    // No real account (or a guest-checkout placeholder) → respond generically, send nothing.
    if (!user || !user.password || user.password.startsWith("GUEST_")) {
      return NextResponse.json(GENERIC_OK)
    }

    // Resend cooldown: block rapid re-requests for the same email.
    const recent = await prisma.passwordResetOtp.findFirst({
      where: { email },
      orderBy: { createdAt: "desc" },
    })
    if (recent) {
      const ageSeconds = (Date.now() - recent.createdAt.getTime()) / 1000
      if (ageSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
        return NextResponse.json(
          { message: `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - ageSeconds)}s before requesting another code.` },
          { status: 429 }
        )
      }
    }

    // Invalidate any previous codes, then create a fresh one.
    await prisma.passwordResetOtp.deleteMany({ where: { email } })

    const otp = generateOtp()
    const otpHash = await hashOtp(otp)
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000)

    await prisma.passwordResetOtp.create({
      data: { email, otpHash, expiresAt },
    })

    try {
      await sendPasswordResetOtpEmail(email, {
        name: user.name,
        otp,
        expiresInMinutes: OTP_EXPIRY_MINUTES,
      })
    } catch (mailErr) {
      console.error("[FORGOT_PASSWORD_EMAIL]", mailErr)
      return NextResponse.json({ message: "Failed to send reset email. Please try again." }, { status: 500 })
    }

    return NextResponse.json(GENERIC_OK)
  } catch (error) {
    console.error("[FORGOT_PASSWORD_ERROR]", error)
    return NextResponse.json({ message: "Internal server error." }, { status: 500 })
  }
}
