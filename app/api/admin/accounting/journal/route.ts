import { NextRequest, NextResponse } from "next/server"
import type { JournalSource, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { toCsv, csvResponse } from "@/lib/csv"
import {
  AccountingError,
  endOfDay,
  entryInclude,
  ensureDefaultAccounts,
  parseYmd,
  postEntry,
  withTotals,
  type PostLine,
} from "@/lib/accounting"

export const dynamic = "force-dynamic"

const SOURCES: JournalSource[] = ["MANUAL", "ORDER", "PAYMENT", "REFUND", "PURCHASE", "EXPENSE", "ADJUSTMENT"]
const CSV_LIMIT = 5000

// GET — paginated journal, optionally as CSV
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)

    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")
    const from = fromParam ? parseYmd(fromParam) : null
    const to = toParam ? parseYmd(toParam) : null
    if ((fromParam && !from) || (toParam && !to)) {
      return NextResponse.json({ message: "Dates must be in YYYY-MM-DD format" }, { status: 400 })
    }
    if (from && to && from > to) {
      return NextResponse.json({ message: "'from' must not be after 'to'" }, { status: 400 })
    }

    const sourceParam = searchParams.get("source")
    if (sourceParam && !SOURCES.includes(sourceParam as JournalSource)) {
      return NextResponse.json({ message: `source must be one of ${SOURCES.join(", ")}` }, { status: 400 })
    }

    const accountId = searchParams.get("accountId") || null
    const search = searchParams.get("search")?.trim() || ""
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25))
    const format = searchParams.get("format") === "csv" ? "csv" : "json"

    const where: Prisma.JournalEntryWhereInput = {}
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = from
      if (to) where.date.lte = endOfDay(to)
    }
    if (sourceParam) where.source = sourceParam as JournalSource
    if (accountId) where.lines = { some: { accountId } }
    if (search) {
      const or: Prisma.JournalEntryWhereInput[] = [
        { memo: { contains: search, mode: "insensitive" } },
        { referenceId: { contains: search, mode: "insensitive" } },
        { lines: { some: { description: { contains: search, mode: "insensitive" } } } },
      ]
      if (/^\d+$/.test(search)) or.push({ entryNo: Number(search) })
      where.OR = or
    }

    const orderBy: Prisma.JournalEntryOrderByWithRelationInput[] = [{ date: "desc" }, { entryNo: "desc" }]

    if (format === "csv") {
      const entries = await prisma.journalEntry.findMany({ where, include: entryInclude, orderBy, take: CSV_LIMIT })
      const rows = entries.flatMap((e) =>
        e.lines.map((l) => ({
          entryNo: e.entryNo,
          date: e.date.toISOString().slice(0, 10),
          memo: e.memo,
          source: e.source,
          referenceType: e.referenceType,
          referenceId: e.referenceId,
          accountCode: l.account.code,
          accountName: l.account.name,
          description: l.description,
          debit: l.debit,
          credit: l.credit,
        })),
      )
      const columns = ["entryNo", "date", "memo", "source", "referenceType", "referenceId", "accountCode", "accountName", "description", "debit", "credit"]
      const suffix = [fromParam, toParam].filter(Boolean).join("-") || "all"
      return csvResponse(toCsv(rows, columns), `journal-${suffix}.csv`)
    }

    const [total, entries] = await Promise.all([
      prisma.journalEntry.count({ where }),
      prisma.journalEntry.findMany({ where, include: entryInclude, orderBy, skip: (page - 1) * limit, take: limit }),
    ])

    return NextResponse.json({
      entries: entries.map(withTotals),
      total,
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_JOURNAL_GET]", e)
    return NextResponse.json({ message: "Failed to load journal" }, { status: 500 })
  }
}

// POST — manual journal entry
export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>
  try {
    payload = await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const date = typeof body.date === "string" && body.date ? new Date(body.date) : new Date()
    if (Number.isNaN(date.getTime())) {
      return NextResponse.json({ message: "Invalid date" }, { status: 400 })
    }
    if (!Array.isArray(body.lines)) {
      return NextResponse.json({ message: "Lines are required" }, { status: 400 })
    }

    const lines: PostLine[] = body.lines.map((l: Record<string, unknown>) => ({
      accountId: typeof l.accountId === "string" ? l.accountId : undefined,
      accountCode: typeof l.accountCode === "string" ? l.accountCode : undefined,
      debit: Number(l.debit) || 0,
      credit: Number(l.credit) || 0,
      description: typeof l.description === "string" ? l.description : null,
    }))

    await ensureDefaultAccounts()
    const { entry } = await postEntry({
      date,
      memo: typeof body.memo === "string" ? body.memo : null,
      source: "MANUAL",
      lines,
      createdById: typeof payload.userId === "string" ? payload.userId : null,
    })

    return NextResponse.json(withTotals(entry), { status: 201 })
  } catch (e) {
    if (e instanceof AccountingError) {
      return NextResponse.json({ message: e.message }, { status: e.status })
    }
    console.error("[ADMIN_ACCOUNTING_JOURNAL_POST]", e)
    return NextResponse.json({ message: "Failed to create journal entry" }, { status: 500 })
  }
}
