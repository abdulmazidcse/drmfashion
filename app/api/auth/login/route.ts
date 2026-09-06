import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { redis } from "@/lib/redis"
import bcrypt from "bcryptjs"
import { SignJWT } from "jose"

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  console.error('JWT_SECRET is not configured — auth cannot issue tokens')
}

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ message: "Email and password are required" }, { status: 400 })
    }

    // Rate limiting: per-IP and per-email (Redis-backed)
    try {
      const MAX_ATTEMPTS = 5
      const WINDOW = 15 * 60 // 15 minutes in seconds

      const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').toString().split(',')[0].trim()
      const keyIp = `rl:login:ip:${ip}`
      const keyEmail = `rl:login:email:${email}`

      const ipCount = await redis.incr(keyIp)
      if (ipCount === 1) await redis.expire(keyIp, WINDOW)
      if (ipCount > MAX_ATTEMPTS) {
        return NextResponse.json({ message: "Too many login attempts from this IP. Try again later." }, { status: 429 })
      }

      const emailCount = await redis.incr(keyEmail)
      if (emailCount === 1) await redis.expire(keyEmail, WINDOW)
      if (emailCount > MAX_ATTEMPTS) {
        return NextResponse.json({ message: "Too many login attempts for this account. Try again later." }, { status: 429 })
      }
    } catch (rlErr) {
      // If Redis fails, log and continue without blocking login (fail-open)
      console.warn('[RATE_LIMITER_ERROR]', rlErr)
    }

    // 1. Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
      include: { adminRole: { select: { permissions: true } } },
    })

    if (!user) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    // 2. Ensure user belongs to the admin panel (ADMIN = full access,
    //    STAFF = limited by the permissions of their AdminRole)
    if (user.role !== "ADMIN" && user.role !== "STAFF") {
      return NextResponse.json({ message: "Unauthorized access" }, { status: 403 })
    }

    // 3. Verify password
    if (!user.password) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    const isValidPassword = await bcrypt.compare(password, user.password)

    if (!isValidPassword) {
      return NextResponse.json({ message: "Invalid credentials" }, { status: 401 })
    }

    // Checked after the password so a wrong password and a deactivated account
    // are indistinguishable to an attacker probing for valid credentials.
    if (!user.isActive) {
      return NextResponse.json(
        { message: "This account has been deactivated. Contact an administrator." },
        { status: 403 }
      )
    }

    // 4. Generate JWT Token
    if (!JWT_SECRET) {
      return NextResponse.json({ message: "Server misconfiguration: JWT secret missing" }, { status: 500 })
    }

    const secret = new TextEncoder().encode(JWT_SECRET)
    // tokenVersion travels in the token so an admin can revoke it later by
    // bumping the column — see the force-logout route.
    // STAFF permissions are baked in so proxy.ts can gate every request
    // without a DB round-trip; editing a role bumps tokenVersion for its
    // members, which is what retires the stale copy. ADMIN needs none.
    const permissions = user.role === "STAFF" ? user.adminRole?.permissions ?? [] : []
    const token = await new SignJWT({ userId: user.id, role: user.role, email: user.email, tokenVersion: user.tokenVersion, permissions })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('24h') // Token expires in 24 hours
      .sign(secret)

    // 5. Create Response and set Cookie
    const response = NextResponse.json({ success: true, message: "Login successful" })
    // Clear rate-limit counters on successful login
    try {
      const ip = (req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || 'unknown').toString().split(',')[0].trim()
      const keyIp = `rl:login:ip:${ip}`
      const keyEmail = `rl:login:email:${email}`
      await Promise.all([redis.del(keyIp), redis.del(keyEmail)])
    } catch (e) {
      console.warn('[RATE_LIMITER_CLEAR_ERROR]', e)
    }
    
    response.cookies.set({
      name: 'ag_admin_token',
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production' && req.nextUrl.protocol === 'https:',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 // 24 hours in seconds
    })

    return response

  } catch (error: any) {
    console.error("[AUTH_LOGIN_ERROR]", error)
    return NextResponse.json({ message: "Internal server error" }, { status: 500 })
  }
}
