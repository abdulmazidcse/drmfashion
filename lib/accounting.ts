import { Prisma, type AccountType, type JournalSource, type PrismaClient } from "@prisma/client"
import { prisma } from "@/lib/prisma"

/**
 * Double-entry accounting for the store.
 *
 * Every business event (order, payment, refund, purchase receipt, expense) is
 * mirrored as a balanced `JournalEntry` whose lines hit the system accounts
 * below. Postings are idempotent on `(source, referenceType, referenceId)` so
 * the hooks in the API routes and the "Sync from orders" backfill can both run
 * against the same data without double counting.
 *
 * Sign convention: `debit` and `credit` are stored as positive numbers on each
 * line. An account's *balance* is debit − credit for ASSET / EXPENSE accounts
 * and credit − debit for LIABILITY / EQUITY / INCOME accounts, so a contra
 * account such as Sales Returns (an INCOME account that only ever gets debited)
 * simply carries a negative balance.
 */

// ─── Chart of accounts ───────────────────────────────────────────────────────

export type DefaultAccount = { code: string; name: string; type: AccountType; isSystem: boolean }

export const SYSTEM_ACCOUNT_CODES = {
  CASH: "1000",
  STRIPE_CLEARING: "1050",
  ACCOUNTS_RECEIVABLE: "1100",
  INVENTORY: "1200",
  ACCOUNTS_PAYABLE: "2000",
  SALES_TAX_PAYABLE: "2100",
  OWNERS_EQUITY: "3000",
  RETAINED_EARNINGS: "3100",
  SALES_REVENUE: "4000",
  SHIPPING_INCOME: "4100",
  SALES_RETURNS: "4200",
  COGS: "5000",
} as const

export const DEFAULT_ACCOUNTS: DefaultAccount[] = [
  { code: "1000", name: "Cash & Bank", type: "ASSET", isSystem: true },
  { code: "1050", name: "Stripe Clearing", type: "ASSET", isSystem: true },
  { code: "1100", name: "Accounts Receivable", type: "ASSET", isSystem: true },
  { code: "1200", name: "Inventory", type: "ASSET", isSystem: true },
  { code: "2000", name: "Accounts Payable", type: "LIABILITY", isSystem: true },
  { code: "2100", name: "Sales Tax Payable", type: "LIABILITY", isSystem: true },
  { code: "3000", name: "Owner's Equity", type: "EQUITY", isSystem: true },
  { code: "3100", name: "Retained Earnings", type: "EQUITY", isSystem: true },
  { code: "4000", name: "Sales Revenue", type: "INCOME", isSystem: true },
  { code: "4100", name: "Shipping Income", type: "INCOME", isSystem: true },
  { code: "4200", name: "Sales Returns & Refunds", type: "INCOME", isSystem: true },
  { code: "5000", name: "Cost of Goods Sold", type: "EXPENSE", isSystem: true },
  { code: "6000", name: "Operating Expenses", type: "EXPENSE", isSystem: false },
  { code: "6100", name: "Advertising & Marketing", type: "EXPENSE", isSystem: false },
  { code: "6200", name: "Rent & Utilities", type: "EXPENSE", isSystem: false },
  { code: "6300", name: "Packaging & Supplies", type: "EXPENSE", isSystem: false },
  { code: "6400", name: "Payment Processing Fees", type: "EXPENSE", isSystem: false },
  { code: "6500", name: "Salaries & Wages", type: "EXPENSE", isSystem: false },
  { code: "6900", name: "Other Expenses", type: "EXPENSE", isSystem: false },
]

/** Debit-normal account types; everything else is credit-normal. */
const DEBIT_NORMAL: AccountType[] = ["ASSET", "EXPENSE"]

export function isDebitNormal(type: AccountType): boolean {
  return DEBIT_NORMAL.includes(type)
}

export function normalBalance(type: AccountType, debit: number, credit: number): number {
  return round2(isDebitNormal(type) ? debit - credit : credit - debit)
}

export const round2 = (n: number) => Math.round(n * 100) / 100

// ─── Dates ───────────────────────────────────────────────────────────────────

const YMD = /^\d{4}-\d{2}-\d{2}$/
export const DAY_MS = 86_400_000

export const ymd = (d: Date) => d.toISOString().slice(0, 10)

/** Start of a UTC calendar day from "YYYY-MM-DD"; null when malformed. */
export function parseYmd(raw: string | null | undefined): Date | null {
  if (!raw || !YMD.test(raw)) return null
  const d = new Date(`${raw}T00:00:00.000Z`)
  return Number.isNaN(d.getTime()) || ymd(d) !== raw ? null : d
}

/** Last millisecond of the UTC day that `d` starts. */
export function endOfDay(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) + DAY_MS - 1)
}

// ─── Posting ─────────────────────────────────────────────────────────────────

export type Db = PrismaClient | Prisma.TransactionClient

export type PostLine = {
  accountCode?: string
  accountId?: string
  debit?: number
  credit?: number
  description?: string | null
}

export type PostEntryInput = {
  date?: Date
  memo?: string | null
  source: JournalSource
  referenceType?: string | null
  referenceId?: string | null
  lines: PostLine[]
  createdById?: string | null
}

export const entryInclude = {
  lines: {
    include: { account: { select: { id: true, code: true, name: true, type: true } } },
    orderBy: { debit: "desc" as const },
  },
} satisfies Prisma.JournalEntryInclude

export type PostedEntry = Prisma.JournalEntryGetPayload<{ include: typeof entryInclude }>

export type PostResult = { entry: PostedEntry; created: boolean }

export class AccountingError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = "AccountingError"
    this.status = status
  }
}

/** Seeds the default chart of accounts. Safe to call on every request. */
export async function ensureDefaultAccounts(db: Db = prisma): Promise<void> {
  await db.account.createMany({ data: DEFAULT_ACCOUNTS, skipDuplicates: true })
}

/**
 * Validates and normalises lines: drops zero lines, rejects negatives, resolves
 * account codes to ids and checks the entry balances.
 */
async function prepareLines(db: Db, input: PostLine[]) {
  const lines = input
    .map((l) => ({
      accountCode: l.accountCode?.trim() || undefined,
      accountId: l.accountId?.trim() || undefined,
      debit: round2(Number(l.debit) || 0),
      credit: round2(Number(l.credit) || 0),
      description: l.description?.trim() || null,
    }))
    .filter((l) => l.debit !== 0 || l.credit !== 0)

  for (const l of lines) {
    if (!Number.isFinite(l.debit) || !Number.isFinite(l.credit) || l.debit < 0 || l.credit < 0) {
      throw new AccountingError("Line amounts must be non-negative numbers")
    }
    if (l.debit > 0 && l.credit > 0) {
      throw new AccountingError("A line may carry a debit or a credit, not both")
    }
    if (!l.accountCode && !l.accountId) {
      throw new AccountingError("Every line needs an account")
    }
  }

  if (lines.length < 2) throw new AccountingError("An entry needs at least two non-zero lines")

  const totalDebit = lines.reduce((s, l) => s + l.debit, 0)
  const totalCredit = lines.reduce((s, l) => s + l.credit, 0)
  if (Math.abs(totalDebit - totalCredit) >= 0.005) {
    throw new AccountingError(
      `Entry is out of balance: debits ${totalDebit.toFixed(2)} vs credits ${totalCredit.toFixed(2)}`,
    )
  }

  const codes = Array.from(new Set(lines.filter((l) => !l.accountId).map((l) => l.accountCode as string)))
  const ids = Array.from(new Set(lines.filter((l) => l.accountId).map((l) => l.accountId as string)))

  const accounts = await db.account.findMany({
    where: { OR: [{ code: { in: codes } }, { id: { in: ids } }] },
    select: { id: true, code: true, active: true },
  })
  const byCode = new Map(accounts.map((a) => [a.code, a]))
  const byId = new Map(accounts.map((a) => [a.id, a]))

  return lines.map((l) => {
    const account = l.accountId ? byId.get(l.accountId) : byCode.get(l.accountCode as string)
    if (!account) throw new AccountingError(`Unknown account ${l.accountId ?? l.accountCode}`)
    return { accountId: account.id, debit: l.debit, credit: l.credit, description: l.description }
  })
}

function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002"
}

async function findByReference(
  db: Db,
  source: JournalSource,
  referenceType: string,
  referenceId: string,
): Promise<PostedEntry | null> {
  return db.journalEntry.findFirst({ where: { source, referenceType, referenceId }, include: entryInclude })
}

/**
 * Creates a balanced journal entry. When a reference is supplied and an entry
 * with the same `(source, referenceType, referenceId)` already exists, the
 * existing entry is returned with `created: false` — this is what makes every
 * auto-posting function safe to call repeatedly.
 */
export async function postEntry(input: PostEntryInput, tx?: Db): Promise<PostResult> {
  const db = tx ?? prisma
  const referenceType = input.referenceType?.trim() || null
  const referenceId = input.referenceId?.trim() || null
  const hasRef = Boolean(referenceType && referenceId)

  if (hasRef) {
    const existing = await findByReference(db, input.source, referenceType as string, referenceId as string)
    if (existing) return { entry: existing, created: false }
  }

  const lines = await prepareLines(db, input.lines)
  const date = input.date ?? new Date()
  if (Number.isNaN(date.getTime())) throw new AccountingError("Invalid entry date")

  try {
    const entry = await db.journalEntry.create({
      data: {
        date,
        memo: input.memo?.trim() || null,
        source: input.source,
        referenceType,
        referenceId,
        createdById: input.createdById ?? null,
        lines: { create: lines },
      },
      include: entryInclude,
    })
    return { entry, created: true }
  } catch (e) {
    // Two requests raced on the same reference: the loser takes the winner's row.
    if (hasRef && isUniqueViolation(e)) {
      const existing = await findByReference(db, input.source, referenceType as string, referenceId as string)
      if (existing) return { entry: existing, created: false }
    }
    throw e
  }
}

/** Removes every line of an entry (used before re-posting an edited expense). */
export async function clearEntryLines(entryId: string, tx?: Db): Promise<void> {
  const db = tx ?? prisma
  await db.journalLine.deleteMany({ where: { entryId } })
}

// ─── Business events ─────────────────────────────────────────────────────────

const shortId = (id: string) => id.slice(-8).toUpperCase()

const orderSelect = {
  id: true,
  status: true,
  paymentStatus: true,
  totalAmount: true,
  taxAmount: true,
  shippingFee: true,
  createdAt: true,
  updatedAt: true,
  payment: { select: { provider: true } },
  items: {
    select: {
      quantity: true,
      isCustom: true,
      variant: { select: { product: { select: { costPrice: true } } } },
    },
  },
} satisfies Prisma.OrderSelect

type OrderForPosting = Prisma.OrderGetPayload<{ select: typeof orderSelect }>

/** Cash-side account for money that arrived through the order's gateway. */
function cashAccountFor(provider: string | null | undefined): string {
  return provider === "card" ? SYSTEM_ACCOUNT_CODES.STRIPE_CLEARING : SYSTEM_ACCOUNT_CODES.CASH
}

function orderCost(order: Pick<OrderForPosting, "items">, opts: { skipCustom?: boolean } = {}): number {
  return round2(
    order.items.reduce((sum, item) => {
      if (opts.skipCustom && item.isCustom) return sum
      return sum + (item.variant.product.costPrice ?? 0) * item.quantity
    }, 0),
  )
}

/**
 * Sale entry for an order, plus a cost-of-sales entry when cost prices are
 * known. PENDING (cash-on-delivery) orders debit receivables; paid orders
 * debit cash (or Stripe clearing for card payments). Cancelled orders post
 * nothing. Returns the entries that exist after the call (created or not).
 */
export async function postOrderEntry(orderId: string, tx?: Db): Promise<PostResult[]> {
  const db = tx ?? prisma
  const order = await db.order.findUnique({ where: { id: orderId }, select: orderSelect })
  if (!order || order.status === "CANCELLED") return []

  const results: PostResult[] = []
  const total = round2(order.totalAmount)
  const tax = round2(order.taxAmount)
  const shipping = round2(order.shippingFee)
  const sales = round2(total - tax - shipping)
  const label = `Order #${shortId(order.id)}`

  if (total > 0) {
    // REFUNDED orders were paid first; the refund entry reverses the cash side.
    const settled = order.paymentStatus === "PAID" || order.paymentStatus === "REFUNDED"
    const debitAccount = settled ? cashAccountFor(order.payment?.provider) : SYSTEM_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE

    results.push(
      await postEntry(
        {
          date: order.createdAt,
          memo: `${label} — sale`,
          source: "ORDER",
          referenceType: "order",
          referenceId: order.id,
          lines: [
            { accountCode: debitAccount, debit: total, description: settled ? "Payment received" : "Awaiting payment" },
            { accountCode: SYSTEM_ACCOUNT_CODES.SALES_REVENUE, credit: sales, description: "Merchandise" },
            { accountCode: SYSTEM_ACCOUNT_CODES.SHIPPING_INCOME, credit: shipping, description: "Shipping charged" },
            { accountCode: SYSTEM_ACCOUNT_CODES.SALES_TAX_PAYABLE, credit: tax, description: "Sales tax collected" },
          ],
        },
        db,
      ),
    )
  }

  const cogs = orderCost(order)
  if (cogs > 0) {
    results.push(
      await postEntry(
        {
          date: order.createdAt,
          memo: `${label} — cost of goods sold`,
          source: "ORDER",
          referenceType: "order-cogs",
          referenceId: order.id,
          lines: [
            { accountCode: SYSTEM_ACCOUNT_CODES.COGS, debit: cogs },
            { accountCode: SYSTEM_ACCOUNT_CODES.INVENTORY, credit: cogs },
          ],
        },
        db,
      ),
    )
  }

  return results
}

/**
 * Settles the receivable when a previously unpaid order is marked PAID.
 *
 * Only posts when the order's sale entry actually debited receivables: if the
 * sale was posted while the order was already PAID, cash was debited there and
 * a second entry would double count. When no sale entry exists yet (an order
 * placed before accounting was switched on) the sale is posted instead, which
 * picks up the current PAID status on its own.
 */
export async function postOrderPaymentEntry(orderId: string, tx?: Db, date?: Date): Promise<PostResult | null> {
  const db = tx ?? prisma
  const order = await db.order.findUnique({ where: { id: orderId }, select: orderSelect })
  if (!order || order.status === "CANCELLED") return null

  const [ar, sale] = await Promise.all([
    db.account.findUnique({ where: { code: SYSTEM_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE }, select: { id: true } }),
    findByReference(db, "ORDER", "order", order.id),
  ])
  if (!ar) throw new AccountingError("Accounts Receivable account is missing", 500)

  if (!sale) {
    await postOrderEntry(order.id, db)
    return null
  }

  const receivable = sale.lines.some((l) => l.accountId === ar.id && l.debit > 0)
  if (!receivable) return null

  const total = round2(order.totalAmount)
  if (total <= 0) return null

  return postEntry(
    {
      date: date ?? new Date(),
      memo: `Order #${shortId(order.id)} — payment received`,
      source: "PAYMENT",
      referenceType: "order",
      referenceId: order.id,
      lines: [
        { accountCode: cashAccountFor(order.payment?.provider), debit: total },
        { accountCode: SYSTEM_ACCOUNT_CODES.ACCOUNTS_RECEIVABLE, credit: total },
      ],
    },
    db,
  )
}

/**
 * Refund entry for a REFUNDED return request, plus an inventory reversal when
 * the units were restocked. Money goes back out of the account it came in on.
 */
export async function postRefundEntry(returnRequestId: string, tx?: Db): Promise<PostResult[]> {
  const db = tx ?? prisma
  const ret = await db.returnRequest.findUnique({
    where: { id: returnRequestId },
    select: {
      id: true,
      status: true,
      refundAmount: true,
      refundMethod: true,
      refundedAt: true,
      restocked: true,
      order: { select: orderSelect },
    },
  })
  if (!ret || ret.status !== "REFUNDED") return []

  const results: PostResult[] = []
  const amount = round2(ret.refundAmount ?? 0)
  const date = ret.refundedAt ?? new Date()
  const label = `Order #${shortId(ret.order.id)}`

  if (amount > 0) {
    const cashAccount =
      ret.refundMethod === "stripe" ? SYSTEM_ACCOUNT_CODES.STRIPE_CLEARING : SYSTEM_ACCOUNT_CODES.CASH
    results.push(
      await postEntry(
        {
          date,
          memo: `${label} — refund`,
          source: "REFUND",
          referenceType: "return",
          referenceId: ret.id,
          lines: [
            { accountCode: SYSTEM_ACCOUNT_CODES.SALES_RETURNS, debit: amount, description: "Refund to customer" },
            { accountCode: cashAccount, credit: amount },
          ],
        },
        db,
      ),
    )
  }

  if (ret.restocked) {
    const cost = orderCost(ret.order, { skipCustom: true })
    if (cost > 0) {
      results.push(
        await postEntry(
          {
            date,
            memo: `${label} — returned stock`,
            source: "REFUND",
            referenceType: "refund-restock",
            referenceId: ret.id,
            lines: [
              { accountCode: SYSTEM_ACCOUNT_CODES.INVENTORY, debit: cost },
              { accountCode: SYSTEM_ACCOUNT_CODES.COGS, credit: cost },
            ],
          },
          db,
        ),
      )
    }
  }

  return results
}

/** Inventory received from a supplier: stock goes up, the supplier is owed. */
export async function postPurchaseEntry(purchaseOrderId: string, tx?: Db): Promise<PostResult | null> {
  const db = tx ?? prisma
  const po = await db.purchaseOrder.findUnique({
    where: { id: purchaseOrderId },
    select: {
      id: true,
      status: true,
      updatedAt: true,
      supplier: { select: { name: true } },
      items: { select: { quantity: true, unitCost: true } },
    },
  })
  if (!po || po.status !== "RECEIVED") return null

  const cost = round2(po.items.reduce((s, i) => s + i.quantity * i.unitCost, 0))
  if (cost <= 0) return null

  return postEntry(
    {
      date: po.updatedAt,
      memo: `PO #${shortId(po.id)} received from ${po.supplier.name}`,
      source: "PURCHASE",
      referenceType: "purchase-order",
      referenceId: po.id,
      lines: [
        { accountCode: SYSTEM_ACCOUNT_CODES.INVENTORY, debit: cost, description: "Stock received" },
        { accountCode: SYSTEM_ACCOUNT_CODES.ACCOUNTS_PAYABLE, credit: cost, description: po.supplier.name },
      ],
    },
    db,
  )
}

const expenseSelect = {
  id: true,
  date: true,
  amount: true,
  accountId: true,
  paidFromAccountId: true,
  vendor: true,
  reference: true,
  note: true,
  entryId: true,
  createdById: true,
  supplier: { select: { name: true } },
} satisfies Prisma.ExpenseSelect

type ExpenseForPosting = Prisma.ExpenseGetPayload<{ select: typeof expenseSelect }>

/** Date, memo and lines for an expense's journal entry. */
function expenseEntryData(expense: ExpenseForPosting) {
  const amount = round2(expense.amount)
  const payee = expense.supplier?.name || expense.vendor || null
  const memo = [
    expense.note?.split("\n")[0]?.trim(),
    payee ? `paid to ${payee}` : null,
    expense.reference ? `ref ${expense.reference}` : null,
  ]
    .filter(Boolean)
    .join(" — ")

  return {
    date: expense.date,
    memo: memo || "Expense",
    amount,
    lines: [
      { accountId: expense.accountId, debit: amount, credit: 0, description: payee },
      { accountId: expense.paidFromAccountId, debit: 0, credit: amount, description: null },
    ],
  }
}

/** Posts an expense row to its expense account, paid from the chosen asset account. */
export async function postExpenseEntry(expenseId: string, tx?: Db): Promise<PostResult | null> {
  const db = tx ?? prisma
  const expense = await db.expense.findUnique({ where: { id: expenseId }, select: expenseSelect })
  if (!expense) return null

  const data = expenseEntryData(expense)
  if (data.amount <= 0) return null

  const result = await postEntry(
    {
      date: data.date,
      memo: data.memo,
      source: "EXPENSE",
      referenceType: "expense",
      referenceId: expense.id,
      createdById: expense.createdById,
      lines: data.lines,
    },
    db,
  )

  if (expense.entryId !== result.entry.id) {
    await db.expense.update({ where: { id: expense.id }, data: { entryId: result.entry.id } })
  }
  return result
}

/**
 * Rebuilds an edited expense's entry in place — same entry number, fresh date,
 * memo and lines. Falls back to a normal post when the expense has no entry.
 */
export async function repostExpenseEntry(expenseId: string, tx?: Db): Promise<PostedEntry | null> {
  const db = tx ?? prisma
  const expense = await db.expense.findUnique({ where: { id: expenseId }, select: expenseSelect })
  if (!expense) return null

  if (!expense.entryId) return (await postExpenseEntry(expense.id, db))?.entry ?? null

  const data = expenseEntryData(expense)
  if (data.amount <= 0) throw new AccountingError("Expense amount must be greater than zero")

  return db.journalEntry.update({
    where: { id: expense.entryId },
    data: {
      date: data.date,
      memo: data.memo,
      lines: { deleteMany: {}, create: data.lines },
    },
    include: entryInclude,
  })
}

// ─── Shared by the admin API routes ──────────────────────────────────────────
// Next.js only allows handler exports from route files, so anything two routes
// share lives here.

/** Entry plus its debit/credit totals, the shape the admin UI renders. */
export function withTotals(entry: PostedEntry) {
  return {
    ...entry,
    totalDebit: round2(entry.lines.reduce((s, l) => s + l.debit, 0)),
    totalCredit: round2(entry.lines.reduce((s, l) => s + l.credit, 0)),
  }
}

export const expenseInclude = {
  account: { select: { id: true, code: true, name: true } },
  paidFromAccount: { select: { id: true, code: true, name: true } },
  supplier: { select: { id: true, name: true } },
  entry: { select: { id: true, entryNo: true } },
} satisfies Prisma.ExpenseInclude

export type ExpenseInput = {
  date: Date
  accountId: string
  paidFromAccountId: string
  amount: number
  vendor: string | null
  supplierId: string | null
  reference: string | null
  note: string | null
  receiptUrl: string | null
}

/**
 * Validates an expense request body. `partial` lets PATCH omit fields; whatever
 * is present is checked the same way. Returns a message on failure.
 */
export async function parseExpenseBody(
  body: Record<string, unknown>,
  partial = false,
): Promise<{ data: Partial<ExpenseInput> } | { error: string }> {
  const data: Partial<ExpenseInput> = {}
  const str = (v: unknown) => (typeof v === "string" ? v.trim() || null : null)

  if (!partial || "date" in body) {
    const date = typeof body.date === "string" && body.date ? new Date(body.date) : partial ? null : new Date()
    if (date && Number.isNaN(date.getTime())) return { error: "Invalid date" }
    if (date) data.date = date
  }

  if (!partial || "amount" in body) {
    const amount = round2(Number(body.amount))
    if (!Number.isFinite(amount) || amount <= 0) return { error: "Amount must be greater than zero" }
    data.amount = amount
  }

  if (!partial || "accountId" in body) {
    const accountId = str(body.accountId)
    if (!accountId) return { error: "Expense account is required" }
    const account = await prisma.account.findUnique({ where: { id: accountId }, select: { type: true, active: true } })
    if (!account) return { error: "Expense account not found" }
    if (account.type !== "EXPENSE") return { error: "The expense account must be an EXPENSE account" }
    if (!account.active) return { error: "The expense account is inactive" }
    data.accountId = accountId
  }

  if (!partial || "paidFromAccountId" in body) {
    const paidFromAccountId = str(body.paidFromAccountId)
    if (!paidFromAccountId) return { error: "Paid-from account is required" }
    const account = await prisma.account.findUnique({ where: { id: paidFromAccountId }, select: { type: true, active: true } })
    if (!account) return { error: "Paid-from account not found" }
    if (account.type !== "ASSET") return { error: "The paid-from account must be an ASSET account" }
    if (!account.active) return { error: "The paid-from account is inactive" }
    data.paidFromAccountId = paidFromAccountId
  }

  if ("supplierId" in body) {
    const supplierId = str(body.supplierId)
    if (supplierId) {
      const supplier = await prisma.supplier.findUnique({ where: { id: supplierId }, select: { id: true } })
      if (!supplier) return { error: "Supplier not found" }
    }
    data.supplierId = supplierId
  }

  if ("vendor" in body) data.vendor = str(body.vendor)
  if ("reference" in body) data.reference = str(body.reference)
  if ("note" in body) data.note = str(body.note)
  if ("receiptUrl" in body) data.receiptUrl = str(body.receiptUrl)

  return { data }
}

// ─── Backfill ────────────────────────────────────────────────────────────────

export type SyncCounts = {
  orders: number
  payments: number
  refunds: number
  purchases: number
  expenses: number
  entriesCreated: number
}

/**
 * Walks the business tables and posts anything that is missing from the
 * ledger. Every post function is idempotent, so re-running over an already
 * synced range creates nothing. Counts are of *new* entries.
 */
export async function syncAccounting(range: { from?: Date | null; to?: Date | null } = {}): Promise<SyncCounts> {
  await ensureDefaultAccounts()

  const window: Prisma.DateTimeFilter = {}
  if (range.from) window.gte = range.from
  if (range.to) window.lte = range.to
  const hasWindow = Boolean(range.from || range.to)

  const counts: SyncCounts = { orders: 0, payments: 0, refunds: 0, purchases: 0, expenses: 0, entriesCreated: 0 }
  const tally = (key: keyof Omit<SyncCounts, "entriesCreated">, results: (PostResult | null)[]) => {
    const created = results.filter((r): r is PostResult => Boolean(r?.created)).length
    counts[key] += created
    counts.entriesCreated += created
  }

  const orders = await prisma.order.findMany({
    where: { status: { not: "CANCELLED" }, ...(hasWindow ? { createdAt: window } : {}) },
    select: { id: true, paymentStatus: true, updatedAt: true },
    orderBy: { createdAt: "asc" },
  })
  for (const o of orders) {
    tally("orders", await postOrderEntry(o.id))
    if (o.paymentStatus === "PAID" || o.paymentStatus === "REFUNDED") {
      tally("payments", [await postOrderPaymentEntry(o.id, undefined, o.updatedAt)])
    }
  }

  const returns = await prisma.returnRequest.findMany({
    where: { status: "REFUNDED", ...(hasWindow ? { refundedAt: window } : {}) },
    select: { id: true },
    orderBy: { refundedAt: "asc" },
  })
  for (const r of returns) tally("refunds", await postRefundEntry(r.id))

  const purchases = await prisma.purchaseOrder.findMany({
    where: { status: "RECEIVED", ...(hasWindow ? { updatedAt: window } : {}) },
    select: { id: true },
    orderBy: { updatedAt: "asc" },
  })
  for (const p of purchases) tally("purchases", [await postPurchaseEntry(p.id)])

  const expenses = await prisma.expense.findMany({
    where: { entryId: null, ...(hasWindow ? { date: window } : {}) },
    select: { id: true },
    orderBy: { date: "asc" },
  })
  for (const e of expenses) tally("expenses", [await postExpenseEntry(e.id)])

  return counts
}

// ─── Reports ─────────────────────────────────────────────────────────────────

export type AccountBalance = {
  id: string
  code: string
  name: string
  type: AccountType
  description: string | null
  parentId: string | null
  isSystem: boolean
  active: boolean
  debit: number
  credit: number
  balance: number
}

type SumRow = { accountId: string; debit: number; credit: number }

/** Σ debit / Σ credit per account over entries dated inside the window. */
async function sumLines(range: { from?: Date | null; to?: Date | null }): Promise<Map<string, SumRow>> {
  const conditions: Prisma.Sql[] = []
  if (range.from) conditions.push(Prisma.sql`e."date" >= ${range.from}`)
  if (range.to) conditions.push(Prisma.sql`e."date" <= ${range.to}`)
  const where = conditions.length ? Prisma.sql`WHERE ${Prisma.join(conditions, " AND ")}` : Prisma.empty

  const rows = await prisma.$queryRaw<SumRow[]>`
    SELECT
      l."accountId",
      COALESCE(SUM(l."debit"), 0)::float8 AS debit,
      COALESCE(SUM(l."credit"), 0)::float8 AS credit
    FROM "JournalLine" l
    JOIN "JournalEntry" e ON e."id" = l."entryId"
    ${where}
    GROUP BY l."accountId"
  `
  return new Map(rows.map((r) => [r.accountId, r]))
}

/** Every account with its activity in the window and the resulting balance. */
export async function accountBalances(range: { from?: Date | null; to?: Date | null } = {}): Promise<AccountBalance[]> {
  const [accounts, sums] = await Promise.all([
    prisma.account.findMany({
      orderBy: { code: "asc" },
      select: { id: true, code: true, name: true, type: true, description: true, parentId: true, isSystem: true, active: true },
    }),
    sumLines(range),
  ])

  return accounts.map((a) => {
    const s = sums.get(a.id)
    const debit = round2(s?.debit ?? 0)
    const credit = round2(s?.credit ?? 0)
    return { ...a, debit, credit, balance: normalBalance(a.type, debit, credit) }
  })
}

export type StatementLine = { id: string; code: string; name: string; amount: number }

const toLine = (a: AccountBalance): StatementLine => ({ id: a.id, code: a.code, name: a.name, amount: a.balance })
const sumAmounts = (lines: StatementLine[]) => round2(lines.reduce((s, l) => s + l.amount, 0))
const active = (a: AccountBalance) => a.balance !== 0 || a.debit !== 0 || a.credit !== 0

export type ProfitAndLoss = {
  from: string
  to: string
  revenue: StatementLine[]
  costOfSales: StatementLine[]
  operatingExpenses: StatementLine[]
  totalRevenue: number
  totalCostOfSales: number
  grossProfit: number
  totalOperatingExpenses: number
  totalExpenses: number
  netProfit: number
}

/**
 * Income statement for the window. Cost of sales is the 5xxx block of the
 * chart; every other expense account is an operating expense.
 */
export async function profitAndLoss(from: Date, to: Date): Promise<ProfitAndLoss> {
  const balances = (await accountBalances({ from, to })).filter(active)
  const revenue = balances.filter((a) => a.type === "INCOME").map(toLine)
  const costOfSales = balances.filter((a) => a.type === "EXPENSE" && a.code.startsWith("5")).map(toLine)
  const operatingExpenses = balances.filter((a) => a.type === "EXPENSE" && !a.code.startsWith("5")).map(toLine)

  const totalRevenue = sumAmounts(revenue)
  const totalCostOfSales = sumAmounts(costOfSales)
  const totalOperatingExpenses = sumAmounts(operatingExpenses)
  const totalExpenses = round2(totalCostOfSales + totalOperatingExpenses)

  return {
    from: ymd(from),
    to: ymd(to),
    revenue,
    costOfSales,
    operatingExpenses,
    totalRevenue,
    totalCostOfSales,
    grossProfit: round2(totalRevenue - totalCostOfSales),
    totalOperatingExpenses,
    totalExpenses,
    netProfit: round2(totalRevenue - totalExpenses),
  }
}

export type BalanceSheet = {
  asOf: string
  assets: StatementLine[]
  liabilities: StatementLine[]
  equity: StatementLine[]
  totalAssets: number
  totalLiabilities: number
  totalEquity: number
  /** Income − expenses to date. Shown under equity so the statement balances. */
  netIncome: number
  totalLiabilitiesAndEquity: number
}

/** Cumulative position as of the end of `asOf`. */
export async function balanceSheet(asOf: Date): Promise<BalanceSheet> {
  const balances = (await accountBalances({ to: asOf })).filter(active)
  const pick = (type: AccountType) => balances.filter((a) => a.type === type).map(toLine)

  const assets = pick("ASSET")
  const liabilities = pick("LIABILITY")
  const equity = pick("EQUITY")
  const netIncome = round2(sumAmounts(pick("INCOME")) - sumAmounts(pick("EXPENSE")))

  const totalAssets = sumAmounts(assets)
  const totalLiabilities = sumAmounts(liabilities)
  const totalEquity = sumAmounts(equity)

  return {
    asOf: ymd(asOf),
    assets,
    liabilities,
    equity,
    totalAssets,
    totalLiabilities,
    totalEquity,
    netIncome,
    totalLiabilitiesAndEquity: round2(totalLiabilities + totalEquity + netIncome),
  }
}

export type TrialBalanceRow = { id: string; code: string; name: string; type: AccountType; debit: number; credit: number }
export type TrialBalance = { asOf: string; rows: TrialBalanceRow[]; totalDebit: number; totalCredit: number }

/** Each account's net balance shown on its debit or credit side, as of `asOf`. */
export async function trialBalance(asOf: Date): Promise<TrialBalance> {
  const balances = (await accountBalances({ to: asOf })).filter(active)
  const rows = balances.map((a) => {
    const net = round2(a.debit - a.credit)
    return {
      id: a.id,
      code: a.code,
      name: a.name,
      type: a.type,
      debit: net > 0 ? net : 0,
      credit: net < 0 ? -net : 0,
    }
  })
  return {
    asOf: ymd(asOf),
    rows,
    totalDebit: round2(rows.reduce((s, r) => s + r.debit, 0)),
    totalCredit: round2(rows.reduce((s, r) => s + r.credit, 0)),
  }
}

export type LedgerRow = {
  entryId: string
  entryNo: number
  date: Date
  memo: string | null
  source: JournalSource
  referenceType: string | null
  referenceId: string | null
  description: string | null
  debit: number
  credit: number
  balance: number
}

export type Ledger = {
  account: { id: string; code: string; name: string; type: AccountType }
  from: string
  to: string
  openingBalance: number
  rows: LedgerRow[]
  totalDebit: number
  totalCredit: number
  closingBalance: number
}

/** One account's activity in the window with a running balance. */
export async function ledger(accountId: string, from: Date, to: Date): Promise<Ledger | null> {
  const account = await prisma.account.findUnique({
    where: { id: accountId },
    select: { id: true, code: true, name: true, type: true },
  })
  if (!account) return null

  const [opening, lines] = await Promise.all([
    prisma.journalLine.aggregate({
      where: { accountId, entry: { date: { lt: from } } },
      _sum: { debit: true, credit: true },
    }),
    prisma.journalLine.findMany({
      where: { accountId, entry: { date: { gte: from, lte: to } } },
      select: {
        debit: true,
        credit: true,
        description: true,
        entry: {
          select: { id: true, entryNo: true, date: true, memo: true, source: true, referenceType: true, referenceId: true },
        },
      },
      orderBy: [{ entry: { date: "asc" } }, { entry: { entryNo: "asc" } }],
    }),
  ])

  const debitNormal = isDebitNormal(account.type)
  const openingBalance = normalBalance(account.type, opening._sum.debit ?? 0, opening._sum.credit ?? 0)

  let running = openingBalance
  let totalDebit = 0
  let totalCredit = 0
  const rows: LedgerRow[] = lines.map((l) => {
    totalDebit += l.debit
    totalCredit += l.credit
    running = round2(running + (debitNormal ? l.debit - l.credit : l.credit - l.debit))
    return {
      entryId: l.entry.id,
      entryNo: l.entry.entryNo,
      date: l.entry.date,
      memo: l.entry.memo,
      source: l.entry.source,
      referenceType: l.entry.referenceType,
      referenceId: l.entry.referenceId,
      description: l.description,
      debit: round2(l.debit),
      credit: round2(l.credit),
      balance: running,
    }
  })

  return {
    account,
    from: ymd(from),
    to: ymd(to),
    openingBalance,
    rows,
    totalDebit: round2(totalDebit),
    totalCredit: round2(totalCredit),
    closingBalance: running,
  }
}
