import { NextRequest, NextResponse } from "next/server"
import type { AccountType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { accountBalances, endOfDay, ensureDefaultAccounts, entryInclude, round2, SYSTEM_ACCOUNT_CODES, ymd } from "@/lib/accounting"

export const dynamic = "force-dynamic"

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
const SERIES_MONTHS = 6

type MonthRow = { period: Date; type: AccountType; debit: number; credit: number }

// GET — overview numbers for the accounting dashboard
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureDefaultAccounts()

    const now = new Date()
    const today = new Date(`${ymd(now)}T00:00:00.000Z`)
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))
    const seriesStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() - (SERIES_MONTHS - 1), 1))
    const todayEnd = endOfDay(today)

    const [monthBalances, allTime, monthRows, recent, entryCount] = await Promise.all([
      accountBalances({ from: monthStart, to: todayEnd }),
      accountBalances({ to: todayEnd }),
      prisma.$queryRaw<MonthRow[]>`
        SELECT
          date_trunc('month', e."date") AS period,
          a."type",
          COALESCE(SUM(l."debit"), 0)::float8 AS debit,
          COALESCE(SUM(l."credit"), 0)::float8 AS credit
        FROM "JournalLine" l
        JOIN "JournalEntry" e ON e."id" = l."entryId"
        JOIN "Account" a ON a."id" = l."accountId"
        WHERE e."date" >= ${seriesStart}
          AND e."date" <= ${todayEnd}
          AND a."type" IN ('INCOME', 'EXPENSE')
        GROUP BY 1, 2
      `,
      prisma.journalEntry.findMany({ include: entryInclude, orderBy: [{ date: "desc" }, { entryNo: "desc" }], take: 8 }),
      prisma.journalEntry.count(),
    ])

    const sumType = (rows: typeof monthBalances, type: AccountType) =>
      round2(rows.filter((a) => a.type === type).reduce((s, a) => s + a.balance, 0))
    const byCode = (code: string) => allTime.find((a) => a.code === code)?.balance ?? 0

    const revenue = sumType(monthBalances, "INCOME")
    const expenses = sumType(monthBalances, "EXPENSE")

    // Series with empty months filled in.
    const buckets = new Map<string, { revenue: number; expenses: number }>()
    for (const r of monthRows) {
      const key = ymd(r.period)
      const b = buckets.get(key) ?? { revenue: 0, expenses: 0 }
      if (r.type === "INCOME") b.revenue += r.credit - r.debit
      else b.expenses += r.debit - r.credit
      buckets.set(key, b)
    }
    const series: { period: string; label: string; revenue: number; expenses: number; profit: number }[] = []
    for (let i = 0; i < SERIES_MONTHS; i++) {
      const d = new Date(Date.UTC(seriesStart.getUTCFullYear(), seriesStart.getUTCMonth() + i, 1))
      const b = buckets.get(ymd(d)) ?? { revenue: 0, expenses: 0 }
      series.push({
        period: ymd(d),
        label: `${MONTHS[d.getUTCMonth()]} ${String(d.getUTCFullYear()).slice(2)}`,
        revenue: round2(b.revenue),
        expenses: round2(b.expenses),
        profit: round2(b.revenue - b.expenses),
      })
    }

    return NextResponse.json({
      month: { from: ymd(monthStart), to: ymd(today) },
      kpis: {
        revenue,
        expenses,
        netProfit: round2(revenue - expenses),
        cash: round2(byCode(SYSTEM_ACCOUNT_CODES.CASH) + byCode(SYSTEM_ACCOUNT_CODES.STRIPE_CLEARING)),
        cashOnHand: round2(byCode(SYSTEM_ACCOUNT_CODES.CASH)),
        stripeClearing: round2(byCode(SYSTEM_ACCOUNT_CODES.STRIPE_CLEARING)),
        receivable: round2(byCode(SYSTEM_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE)),
        payable: round2(byCode(SYSTEM_ACCOUNT_CODES.ACCOUNTS_PAYABLE)),
        inventory: round2(byCode(SYSTEM_ACCOUNT_CODES.INVENTORY)),
      },
      series,
      recent: recent.map((e) => ({
        ...e,
        totalDebit: round2(e.lines.reduce((s, l) => s + l.debit, 0)),
        totalCredit: round2(e.lines.reduce((s, l) => s + l.credit, 0)),
      })),
      entryCount,
    })
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_SUMMARY]", e)
    return NextResponse.json({ message: "Failed to load accounting summary" }, { status: 500 })
  }
}
