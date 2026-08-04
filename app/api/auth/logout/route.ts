import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  const response = NextResponse.json({ success: true, message: "Logged out successfully" })
  
  // Clear the cookie by setting it to expire immediately
  response.cookies.set({
    name: 'ag_admin_token',
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' && req.nextUrl.protocol === 'https:',
    sameSite: 'lax',
    path: '/',
    expires: new Date(0)
  })

  return response
}
