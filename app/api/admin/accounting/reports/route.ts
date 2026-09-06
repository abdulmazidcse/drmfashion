import { NextRequest, NextResponse } from "next/server"
import { getAdminPayload } from "@/lib/auth"
import { toCsv, csvResponse } from "@/lib/csv"
import {
  balanceSheet,
  DAY_MS,
  endOfDay,
  ensureDefaultAccounts,
  ledger,
  parseYmd,
  profitAndLoss,
  trialBalance,
  ymd,
  type StatementLine,
} from "@/lib/accounting"

export const dynamic = "force-dynamic"

type ReportType = "pnl" | "balance-sheet" | "trial-balance" | "ledger"
const REPORT_TYPES: ReportType[] = ["pnl", "balance-sheet", "trial-balance", "ledger"]

const section = (name: string, lines: StatementLine[], total: number, totalLabel: string) => [
  ...lines.map((l) => ({ section: name, code: l.code, account: l.name, amount: l.amount })),
  { section: name, code: "", account: totalLabel, amount: total },
]

/**
 * Financial statements. `from`/`to` bound the P&L and ledger (default: this
 * month to date); `asOf` is the cut-off for the balance sheet and trial
 * balance (default: today). Dates are UTC calendar days, matching the sales
 * report.
 */
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const type = (searchParams.get("type") || "pnl") as ReportType
    if (!REPORT_TYPES.includes(type)) {
      return NextResponse.json({ message: `type must be one of ${REPORT_TYPES.join(", ")}` }, { status: 400 })
    }
    const format = searchParams.get("format") === "csv" ? "csv" : "json"

    const today = new Date(`${ymd(new Date())}T00:00:00.000Z`)
    const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1))

    const fromParam = searchParams.get("from")
    const toParam = searchParams.get("to")
    const asOfParam = searchParams.get("asOf")
    const from = fromParam ? parseYmd(fromParam) : monthStart
    const to = toParam ? parseYmd(toParam) : today
    const asOf = asOfParam ? parseYmd(asOfParam) : today
    if (!from || !to || !asOf) {
      return NextResponse.json({ message: "Dates must be in YYYY-MM-DD format" }, { status: 400 })
    }
    if (from > to) {
      return NextResponse.json({ message: "'from' must not be after 'to'" }, { status: 400 })
    }
    if (to.getTime() - from.getTime() > 366 * 5 * DAY_MS) {
      return NextResponse.json({ message: "Date range may not exceed five years" }, { status: 400 })
    }

    await ensureDefaultAccounts()
    const rangeEnd = endOfDay(to)
    const asOfEnd = endOfDay(asOf)

    switch (type) {
      case "pnl": {
        const report = await profitAndLoss(from, rangeEnd)
        if (format === "json") return NextResponse.json(report)
        const rows = [
          ...section("Revenue", report.revenue, report.totalRevenue, "Total revenue"),
          ...section("Cost of sales", report.costOfSales, report.totalCostOfSales, "Total cost of sales"),
          { section: "Gross profit", code: "", account: "Gross profit", amount: report.grossProfit },
          ...section("Operating expenses", report.operatingExpenses, report.totalOperatingExpenses, "Total operating expenses"),
          { section: "Net profit", code: "", account: "Net profit", amount: report.netProfit },
        ]
        return csvResponse(toCsv(rows, ["section", "code", "account", "amount"]), `profit-and-loss-${report.from}-${report.to}.csv`)
      }

      case "balance-sheet": {
        const report = await balanceSheet(asOfEnd)
        if (format === "json") return NextResponse.json(report)
        const rows = [
          ...section("Assets", report.assets, report.totalAssets, "Total assets"),
          ...section("Liabilities", report.liabilities, report.totalLiabilities, "Total liabilities"),
          ...section("Equity", report.equity, report.totalEquity, "Total equity"),
          { section: "Equity", code: "", account: "Net income to date", amount: report.netIncome },
          { section: "Total", code: "", account: "Total liabilities & equity", amount: report.totalLiabilitiesAndEquity },
        ]
        return csvResponse(toCsv(rows, ["section", "code", "account", "amount"]), `balance-sheet-${report.asOf}.csv`)
      }

      case "trial-balance": {
        const report = await trialBalance(asOfEnd)
        if (format === "json") return NextResponse.json(report)
        const rows = [
          ...report.rows.map((r) => ({ code: r.code, account: r.name, type: r.type, debit: r.debit, credit: r.credit })),
          { code: "", account: "Total", type: "", debit: report.totalDebit, credit: report.totalCredit },
        ]
        return csvResponse(toCsv(rows, ["code", "account", "type", "debit", "credit"]), `trial-balance-${report.asOf}.csv`)
      }

      case "ledger": {
        const accountId = searchParams.get("accountId")
        if (!accountId) return NextResponse.json({ message: "accountId is required for the ledger" }, { status: 400 })
        const report = await ledger(accountId, from, rangeEnd)
        if (!report) return NextResponse.json({ message: "Account not found" }, { status: 404 })
        if (format === "json") return NextResponse.json(report)
        const rows = [
          { entryNo: "", date: report.from, memo: "Opening balance", source: "", reference: "", description: "", debit: "", credit: "", balance: report.openingBalance },
          ...report.rows.map((r) => ({
            entryNo: r.entryNo,
            date: r.date.toISOString().slice(0, 10),
            memo: r.memo,
            source: r.source,
            reference: [r.referenceType, r.referenceId].filter(Boolean).join(":"),
            description: r.description,
            debit: r.debit,
            credit: r.credit,
            balance: r.balance,
          })),
          { entryNo: "", date: report.to, memo: "Closing balance", source: "", reference: "", description: "", debit: report.totalDebit, credit: report.totalCredit, balance: report.closingBalance },
        ]
        return csvResponse(
          toCsv(rows, ["entryNo", "date", "memo", "source", "reference", "description", "debit", "credit", "balance"]),
          `ledger-${report.account.code}-${report.from}-${report.to}.csv`,
        )
      }
    }
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_REPORTS]", e)
    return NextResponse.json({ message: "Failed to build report" }, { status: 500 })
  }
}
