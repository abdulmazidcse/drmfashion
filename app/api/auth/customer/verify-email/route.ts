import { NextRequest, NextResponse } from "next/server"
import { SignJWT } from "jose"
import { prisma } from "@/lib/prisma"
import { verifyOtp } from "@/lib/passwordResetOtp"
import { consumeVerificationCodes, sendVerificationCode } from "@/lib/emailVerification"

const JWT_SECRET = process.env.JWT_SECRET

/**
 * Confirm a sign-up code and sign the customer in.
 *
 * Logging them in here rather than bouncing back to the login form means the
 * code they just typed is the last step — nobody has to re-enter a password
 * they set thirty seconds ago.
 */
export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    const result = await verifyOtp(email, otp, "EMAIL_VERIFICATION")
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || user.deletedAt) {
      return NextResponse.json({ message: "Account not found." }, { status: 404 })
    }
    if (!user.isActive) {
      return NextResponse.json(
        { message: "This account has been deactivated. Please contact support." },
        { status: 403 }
      )
    }

    const verified = await prisma.user.update({
      where: { email },
      data: { emailVerifiedAt: new Date() },
    })
    await consumeVerificationCodes(email)

    // Held back at sign-up so it only lands once the address is known good.
    try {
      const { sendWelcomeEmail } = await import("@/lib/email")
      await sendWelcomeEmail(email, { name: verified.name })
    } catch (e) {
      console.error("[VERIFY_EMAIL_WELCOME_ERROR]", e)
    }

    if (!JWT_SECRET) {
      return NextResponse.json({ message: "Server configuration error." }, { status: 500 })
    }

    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new SignJWT({ userId: verified.id, role: verified.role, email: verified.email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret)

    const response = NextResponse.json({
      success: true,
      message: "Email confirmed.",
      user: { id: verified.id, name: verified.name, email: verified.email, phone: verified.phone },
    })

    response.cookies.set({
      name: "ag_customer_token",
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === "production" && req.nextUrl.protocol === "https:",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    })

    return response
  } catch (error) {
    console.error("[VERIFY_EMAIL_ERROR]", error)
    return NextResponse.json({ message: "Internal server error." }, { status: 500 })
  }
}

/** Resend the code — same cooldown as any other OTP. */
export async function PUT(req: NextRequest) {
  try {
    const { email } = await req.json()

    const user = await prisma.user.findUnique({ where: { email } })

    // Generic reply: confirming which addresses have a pending sign-up would
    // let anyone enumerate accounts.
    const GENERIC = { success: true, message: "If that account needs confirming, a new code is on its way." }

    if (!user || user.deletedAt || user.emailVerifiedAt) {
      return NextResponse.json(GENERIC)
    }

    const sent = await sendVerificationCode(email, user.name)
    if (!sent.ok) {
      return NextResponse.json({ message: sent.message }, { status: sent.status })
    }

    return NextResponse.json(GENERIC)
  } catch (error) {
    console.error("[RESEND_VERIFICATION_ERROR]", error)
    return NextResponse.json({ message: "Internal server error." }, { status: 500 })
  }
}
