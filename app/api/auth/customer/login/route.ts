import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"

const JWT_SECRET = process.env.JWT_SECRET

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required." }, { status: 400 })
    }

    // Find user
    const user = await prisma.user.findUnique({ where: { email } })

    if (!user) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 })
    }

    // Guest users (created during checkout) have passwords like GUEST_xxx — block them
    if (!user.password || user.password.startsWith("GUEST_")) {
      return NextResponse.json({ message: "No account found with this email. Please register first." }, { status: 401 })
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password)
    if (!isValid) {
      return NextResponse.json({ message: "Invalid email or password." }, { status: 401 })
    }

    if (!JWT_SECRET) {
      return NextResponse.json({ message: "Server configuration error." }, { status: 500 })
    }

    // Issue JWT
    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new SignJWT({ userId: user.id, role: user.role, email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret)

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone }
    })

    response.cookies.set({
      name: "ag_customer_token",
      value: token,
      httpOnly: true,
      secure: req.nextUrl.protocol === "https:" || req.headers.get("x-forwarded-proto") === "https",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error: any) {
    console.error("[CUSTOMER_LOGIN_ERROR]", error)
    return NextResponse.json({ message: "Internal server error." }, { status: 500 })
  }
}
