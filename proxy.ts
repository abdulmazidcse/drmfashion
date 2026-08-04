import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { jwtVerify } from 'jose'

const JWT_SECRET = process.env.JWT_SECRET
if (!JWT_SECRET) {
  // Warn loudly in server logs — without a secret admin auth will be disabled
  console.error('JWT_SECRET is not set. Admin routes are protected but token verification will fail.')
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Protect both admin UI and admin API routes
  if (pathname.startsWith('/admin') || pathname.startsWith('/api/admin')) {
    const token = request.cookies.get('ag_admin_token')?.value

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

      // Ensure the user has the ADMIN role
      if (payload.role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/admin-login', request.url))
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
