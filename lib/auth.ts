import { jwtVerify, type JWTPayload } from 'jose'
import type { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hasPermission, permissionForRequest } from '@/lib/permissions'

const ADMIN_PANEL_ROLES = ['ADMIN', 'STAFF']

export type AdminPayload = Record<string, unknown> & {
  userId: string
  role: 'ADMIN' | 'STAFF'
  email?: string
  tokenVersion?: number
  /** Live permission list from the user's AdminRole (empty for ADMIN — they bypass). */
  permissions: string[]
}

/**
 * Verify admin JWT stored in cookie and return payload.
 * Throws Error on failure; callers should handle and return proper responses.
 *
 * Accepts ADMIN and STAFF accounts. For STAFF the request's path + method is
 * resolved to a permission (see lib/permissions.ts) and checked against the
 * live role, so a handler that only calls getAdminPayload is still gated even
 * if it is reached without going through proxy.ts. Throws 'Forbidden' when
 * the permission is missing — callers map every throw to 401, which is
 * acceptable: the caller is refused either way.
 */
export async function getAdminPayload(req: NextRequest): Promise<AdminPayload> {
  const JWT_SECRET = process.env.JWT_SECRET
  if (!JWT_SECRET) throw new Error('JWT_SECRET not configured')

  const token = req.cookies.get('ag_admin_token')?.value
  if (!token) throw new Error('No admin token')

  let payload: JWTPayload
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const verified = await jwtVerify(token, secret)
    payload = verified.payload
    if (!ADMIN_PANEL_ROLES.includes(String(payload.role))) throw new Error('Insufficient role')
  } catch {
    throw new Error('Invalid or expired token')
  }

  // Signature alone can't express revocation: a 24h token stays valid after the
  // account is force-logged-out. The version in the token has to still match
  // the row. proxy.ts only repeats this check for pages, not API calls.
  const user = await prisma.user.findUnique({
    where: { id: String(payload.userId) },
    select: {
      tokenVersion: true,
      role: true,
      isActive: true,
      adminRole: { select: { permissions: true } },
    },
  })

  if (!user || !ADMIN_PANEL_ROLES.includes(user.role) || user.role !== payload.role) {
    throw new Error('Invalid or expired token')
  }
  if (!user.isActive) throw new Error('Account deactivated')
  if ((typeof payload.tokenVersion === 'number' ? payload.tokenVersion : 0) !== user.tokenVersion) {
    throw new Error('Session revoked')
  }

  const permissions = user.role === 'STAFF' ? user.adminRole?.permissions ?? [] : []

  if (user.role === 'STAFF') {
    const required = permissionForRequest(req.nextUrl.pathname, req.method)
    if (required && !hasPermission(permissions, user.role, `${required.module}.${required.action}`)) {
      throw new Error('Forbidden')
    }
  }

  return { ...payload, userId: String(payload.userId), role: user.role, permissions } as AdminPayload
}

/**
 * getAdminPayload plus an explicit permission check, for handlers whose
 * required permission differs from what the path/method implies (e.g. a GET
 * that exports data and should need `manage`). Throws 'Forbidden'.
 */
export async function requirePermission(req: NextRequest, key: string): Promise<AdminPayload> {
  const payload = await getAdminPayload(req)
  if (!hasPermission(payload.permissions, payload.role, key)) throw new Error('Forbidden')
  return payload
}
