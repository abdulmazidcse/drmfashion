import { NextRequest, NextResponse } from "next/server"
import type { AccountType } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { accountBalances, endOfDay, ensureDefaultAccounts, type AccountBalance } from "@/lib/accounting"

export const dynamic = "force-dynamic"

const ACCOUNT_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]

type AccountRow = AccountBalance & { depth: number; hasActivity: boolean }

/** Parents first, children indented beneath them, everything sorted by code. */
function flattenTree(accounts: AccountBalance[]): AccountRow[] {
  const ids = new Set(accounts.map((a) => a.id))
  const children = new Map<string | null, AccountBalance[]>()
  for (const a of accounts) {
    // An orphaned parentId (deleted parent) renders at the root.
    const key = a.parentId && ids.has(a.parentId) ? a.parentId : null
    const list = children.get(key) ?? []
    list.push(a)
    children.set(key, list)
  }

  const out: AccountRow[] = []
  const visit = (parentId: string | null, depth: number, seen: Set<string>) => {
    const list = (children.get(parentId) ?? []).sort((a, b) => a.code.localeCompare(b.code))
    for (const a of list) {
      if (seen.has(a.id)) continue
      seen.add(a.id)
      out.push({ ...a, depth, hasActivity: a.debit !== 0 || a.credit !== 0 })
      visit(a.id, depth + 1, seen)
    }
  }
  visit(null, 0, new Set())
  return out
}

// GET — chart of accounts with balances as of today
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    await ensureDefaultAccounts()
    const balances = await accountBalances({ to: endOfDay(new Date()) })
    return NextResponse.json(flattenTree(balances))
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_ACCOUNTS_GET]", e)
    return NextResponse.json({ message: "Failed to load accounts" }, { status: 500 })
  }
}

// POST — create an account
export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const code = typeof body.code === "string" ? body.code.trim() : ""
    const name = typeof body.name === "string" ? body.name.trim() : ""
    const type = body.type as AccountType
    const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null
    const description = typeof body.description === "string" ? body.description.trim() || null : null
    const active = body.active === undefined ? true : Boolean(body.active)

    if (!code || !name) {
      return NextResponse.json({ message: "Code and name are required" }, { status: 400 })
    }
    if (!ACCOUNT_TYPES.includes(type)) {
      return NextResponse.json({ message: "Invalid account type" }, { status: 400 })
    }

    const existing = await prisma.account.findUnique({ where: { code }, select: { id: true } })
    if (existing) {
      return NextResponse.json({ message: `Account code ${code} is already in use` }, { status: 409 })
    }

    if (parentId) {
      const parent = await prisma.account.findUnique({ where: { id: parentId }, select: { type: true } })
      if (!parent) return NextResponse.json({ message: "Parent account not found" }, { status: 400 })
      if (parent.type !== type) {
        return NextResponse.json({ message: "A sub-account must have the same type as its parent" }, { status: 400 })
      }
    }

    const account = await prisma.account.create({
      data: { code, name, type, parentId, description, active, isSystem: false },
    })
    return NextResponse.json(account, { status: 201 })
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_ACCOUNTS_POST]", e)
    return NextResponse.json({ message: "Failed to create account" }, { status: 500 })
  }
}
