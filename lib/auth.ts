import { jwtVerify } from 'jose'
import type { NextRequest } from 'next/server'

/**
 * Verify admin JWT stored in cookie and return payload.
 * Throws Error on failure; callers should handle and return proper responses.
 */
export async function getAdminPayload(req: NextRequest) {
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured')

  const token = req.cookies.get('ag_admin_token')?.value
  if (!token) throw new Error('No admin token')

  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jwtVerify(token, secret)
    if ((payload as any).role !== 'ADMIN') throw new Error('Insufficient role')
    return payload as Record<string, any>
  } catch (err) {
    throw new Error('Invalid or expired token')
  }
}
