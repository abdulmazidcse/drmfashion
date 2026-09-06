import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'
import { prisma } from '@/lib/prisma'
import { hasPermission, permissionForRequest } from '@/lib/permissions'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  // Warn loudly in server logs — without a secret admin auth will be disabled
  console.error('JWT_SECRET is not set. Admin routes are protected but token verification will fail.')
}

const ADMIN_PANEL_ROLES = ['ADMIN', 'STAFF']

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect both admin UI and admin API routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const token = request.cookies.get('ag_admin_token')?.value
    const isApi = pathname.startsWith('/api/')

    if (!token) {
      // Redirect to the login page if no token is found
      return NextResponse.redirect(new URL('/admin-login', request.url))
    }

    try {
      if (!JWT_SECRET) {
        // Defensive: if secret missing, treat as unauthorized
        return NextResponse.redirect(new URL('/admin-login', request.url))
      }

      // Verify the JWT token
      const secret = new TextEncoder().encode(JWT_SECRET)
      const { payload } = await jwtVerify(token, secret)
      const role = String(payload.role ?? '')

      // Ensure the user belongs to the admin panel (ADMIN or STAFF)
      if (!ADMIN_PANEL_ROLES.includes(role)) {
        return NextResponse.redirect(new URL('/admin-login', request.url))
      }

      // Permissions baked into the token at login. For pages the live copy
      // from the DB replaces it below (same query as the tokenVersion check).
      let permissions: string[] = Array.isArray(payload.permissions)
        ? (payload.permissions as unknown[]).filter((p): p is string => typeof p === 'string')
        : []

      // A force-logged-out admin still holds a validly signed token until it
      // expires, so the signature alone can't be trusted — the version baked
      // into it has to still match the row. Only dashboard pages are checked
      // here; every /api/admin route runs the same check inside
      // getAdminPayload, and doing it twice would double the query per call.
      //
      // Proxy runs on the Node.js runtime in Next 16, so Prisma is available.
      if (!isApi) {
        const user = await prisma.user.findUnique({
          where: { id: String(payload.userId) },
          select: {
            tokenVersion: true,
            role: true,
            isActive: true,
            adminRole: { select: { permissions: true } },
          },
        })

        if (
          !user ||
          !ADMIN_PANEL_ROLES.includes(user.role) ||
          user.role !== role ||
          !user.isActive ||
          (payload.tokenVersion ?? 0) !== user.tokenVersion
        ) {
          const response = NextResponse.redirect(new URL('/admin-login', request.url))
          response.cookies.delete('ag_admin_token')
          return response
        }

        if (user.role === 'STAFF') permissions = user.adminRole?.permissions ?? []
      }

      // Primary permission gate for both pages and APIs — many /api/admin
      // handlers never call getAdminPayload and rely on this alone.
      const required = permissionForRequest(pathname, request.method)
      if (required && !hasPermission(permissions, role, `${required.module}.${required.action}`)) {
        if (isApi) {
          return NextResponse.json({ message: 'Forbidden' }, { status: 403 })
        }
        const forbidden = new URL('/admin/forbidden', request.url)
        forbidden.searchParams.set('from', pathname)
        return NextResponse.redirect(forbidden)
      }

      // Allow request to proceed
      return NextResponse.next()
    } catch (error) {
      // Token is invalid or expired
      const response = NextResponse.redirect(new URL('/admin-login', request.url))
      response.cookies.delete('ag_admin_token') // Clear the invalid cookie
      return response
    }
  }

  // Pass through all other requests
  return NextResponse.next()
}

// See "Matching Paths" below to learn more
export const config = {
  matcher: ['/admin/:path*', '/api/admin/:path*'],
}
