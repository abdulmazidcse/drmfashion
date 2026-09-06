import { NextRequest, NextResponse } from "next/server"
import { getAdminPayload } from "@/lib/auth"
import { endOfDay, parseYmd, syncAccounting } from "@/lib/accounting"

export const dynamic = "force-dynamic"

// POST — backfill ledger entries from orders, refunds, purchases and expenses
export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json().catch(() => ({}))
    const fromParam = typeof body.from === "string" ? body.from : null
    const toParam = typeof body.to === "string" ? body.to : null
    const from = fromParam ? parseYmd(fromParam) : null
    const to = toParam ? parseYmd(toParam) : null
    if ((fromParam && !from) || (toParam && !to)) {
      return NextResponse.json({ message: "Dates must be in YYYY-MM-DD format" }, { status: 400 })
    }
    if (from && to && from > to) {
      return NextResponse.json({ message: "'from' must not be after 'to'" }, { status: 400 })
    }

    const counts = await syncAccounting({ from, to: to ? endOfDay(to) : null })
    return NextResponse.json(counts)
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_SYNC]", e)
    return NextResponse.json({ message: "Sync failed" }, { status: 500 })
  }
}
