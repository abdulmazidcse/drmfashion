import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { toCsv, csvResponse } from "@/lib/csv"
import {
  AccountingError,
  endOfDay,
  ensureDefaultAccounts,
  expenseInclude,
  parseExpenseBody,
  parseYmd,
  postExpenseEntry,
  round2,
  type ExpenseInput,
} from "@/lib/accounting"

export const dynamic = "force-dynamic"

const CSV_LIMIT = 5000

// GET — expenses list with totals, optionally as CSV
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

    const accountId = searchParams.get("accountId") || null
    const search = searchParams.get("search")?.trim() || ""
    const page = Math.max(1, Number(searchParams.get("page")) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit")) || 25))
    const format = searchParams.get("format") === "csv" ? "csv" : "json"

    const where: Prisma.ExpenseWhereInput = {}
    if (from || to) {
      where.date = {}
      if (from) where.date.gte = from
      if (to) where.date.lte = endOfDay(to)
    }
    if (accountId) where.accountId = accountId
    if (search) {
      where.OR = [
        { vendor: { contains: search, mode: "insensitive" } },
        { reference: { contains: search, mode: "insensitive" } },
        { note: { contains: search, mode: "insensitive" } },
        { supplier: { name: { contains: search, mode: "insensitive" } } },
        { account: { name: { contains: search, mode: "insensitive" } } },
      ]
    }

    const orderBy: Prisma.ExpenseOrderByWithRelationInput[] = [{ date: "desc" }, { createdAt: "desc" }]

    if (format === "csv") {
      const expenses = await prisma.expense.findMany({ where, include: expenseInclude, orderBy, take: CSV_LIMIT })
      const rows = expenses.map((e) => ({
        date: e.date.toISOString().slice(0, 10),
        account: `${e.account.code} ${e.account.name}`,
        paidFrom: `${e.paidFromAccount.code} ${e.paidFromAccount.name}`,
        amount: e.amount,
        payee: e.supplier?.name || e.vendor || "",
        reference: e.reference,
        note: e.note,
        receiptUrl: e.receiptUrl,
        entryNo: e.entry?.entryNo ?? "",
      }))
      const suffix = [fromParam, toParam].filter(Boolean).join("-") || "all"
      return csvResponse(toCsv(rows, ["date", "account", "paidFrom", "amount", "payee", "reference", "note", "receiptUrl", "entryNo"]), `expenses-${suffix}.csv`)
    }

    const [total, agg, expenses] = await Promise.all([
      prisma.expense.count({ where }),
      prisma.expense.aggregate({ where, _sum: { amount: true } }),
      prisma.expense.findMany({ where, include: expenseInclude, orderBy, skip: (page - 1) * limit, take: limit }),
    ])

    return NextResponse.json({
      expenses,
      total,
      totalAmount: round2(agg._sum.amount ?? 0),
      page,
      limit,
      pages: Math.max(1, Math.ceil(total / limit)),
    })
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_EXPENSES_GET]", e)
    return NextResponse.json({ message: "Failed to load expenses" }, { status: 500 })
  }
}

// POST — record an expense and post it in the same transaction
export async function POST(req: NextRequest) {
  let payload: Record<string, unknown>
  try {
    payload = await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureDefaultAccounts()
    const body = await req.json()
    const parsed = await parseExpenseBody(body)
    if ("error" in parsed) return NextResponse.json({ message: parsed.error }, { status: 400 })
    const data = parsed.data as ExpenseInput

    const expense = await prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: { ...data, createdById: typeof payload.userId === "string" ? payload.userId : null },
      })
      await postExpenseEntry(created.id, tx)
      return tx.expense.findUniqueOrThrow({ where: { id: created.id }, include: expenseInclude })
    })

    return NextResponse.json(expense, { status: 201 })
  } catch (e) {
    if (e instanceof AccountingError) {
      return NextResponse.json({ message: e.message }, { status: e.status })
    }
    console.error("[ADMIN_ACCOUNTING_EXPENSES_POST]", e)
    return NextResponse.json({ message: "Failed to create expense" }, { status: 500 })
  }
}
