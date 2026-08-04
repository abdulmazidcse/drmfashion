import { NextResponse } from "next/server"

// ✅ Safe health check endpoint — DB data no longer exposed
export async function GET() {
  return NextResponse.json({ status: "ok", timestamp: new Date().toISOString() })
}