import { NextRequest, NextResponse } from "next/server"
import { OAuth2Client } from "google-auth-library"
import { prisma } from "@/lib/prisma"
import { SignJWT } from "jose"
import bcrypt from "bcryptjs"

const JWT_SECRET = process.env.JWT_SECRET
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID

const client = new OAuth2Client(GOOGLE_CLIENT_ID)

export async function POST(req: NextRequest) {
  try {
    const { credential } = await req.json()

    if (!credential) {
      return NextResponse.json({ message: "No credential provided" }, { status: 400 })
    }

    if (!GOOGLE_CLIENT_ID) {
      return NextResponse.json({ message: "Google Client ID is not configured on the server." }, { status: 500 })
    }

    // 1. Verify the Google Token
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: GOOGLE_CLIENT_ID,
    })

    const payload = ticket.getPayload()
    if (!payload || !payload.email) {
      return NextResponse.json({ message: "Invalid Google token" }, { status: 400 })
    }

    const { email, name, picture } = payload

    // 2. Find or Create the User in our database
    let user = await prisma.user.findUnique({ where: { email } })

    if (user) {
      // If user is a GUEST, upgrade to a real user by removing the GUEST_ password
      // For Google login, we can leave password as null or a random string, since they use Google.
      if (user.password?.startsWith("GUEST_")) {
        const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10)
        user = await prisma.user.update({
          where: { email },
          data: { name: user.name === "Guest Customer" ? name || "Google User" : user.name, password: randomPassword }
        })
      }

      // Google has already proven the address, so signing in this way counts as
      // verification — otherwise a Google user would be locked out by the
      // check in the password login route.
      if (!user.emailVerifiedAt) {
        user = await prisma.user.update({
          where: { email },
          data: { emailVerifiedAt: new Date() },
        })
      }
    } else {
      // Create new user
      const randomPassword = await bcrypt.hash(Math.random().toString(36).slice(-10), 10)
      user = await prisma.user.create({
        data: {
          email,
          name: name || "Google User",
          password: randomPassword,
          role: "USER",
          emailVerifiedAt: new Date()
        }
      })
      
      // Optionally send welcome email
      try {
        const { sendWelcomeEmail } = await import("@/lib/email")
        await sendWelcomeEmail(email, { name: user.name })
      } catch (err) {}
    }

    // 3. Generate our internal JWT
    if (!JWT_SECRET) {
      return NextResponse.json({ message: "Server configuration error (JWT_SECRET)" }, { status: 500 })
    }

    const secret = new TextEncoder().encode(JWT_SECRET)
    const token = await new SignJWT({ userId: user.id, role: user.role, email: user.email })
      .setProtectedHeader({ alg: "HS256" })
      .setIssuedAt()
      .setExpirationTime("7d")
      .sign(secret)

    // 4. Set Cookie and Return
    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, phone: user.phone || "" }
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
    console.error("[GOOGLE_LOGIN_ERROR]", error)
    return NextResponse.json({ message: "Google login failed: " + error.message }, { status: 500 })
  }
}
