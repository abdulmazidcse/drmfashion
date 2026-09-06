import { NextRequest, NextResponse } from "next/server"
import type { AccountType, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

type Params = { params: Promise<{ id: string }> }

const ACCOUNT_TYPES: AccountType[] = ["ASSET", "LIABILITY", "EQUITY", "INCOME", "EXPENSE"]

/** Walks up the parent chain to make sure `candidateParentId` is not inside `id`'s subtree. */
async function createsCycle(id: string, candidateParentId: string): Promise<boolean> {
  let cursor: string | null = candidateParentId
  const seen = new Set<string>()
  while (cursor) {
    if (cursor === id) return true
    if (seen.has(cursor)) return true
    seen.add(cursor)
    const row: { parentId: string | null } | null = await prisma.account.findUnique({
      where: { id: cursor },
      select: { parentId: true },
    })
    cursor = row?.parentId ?? null
  }
  return false
}

// PATCH — update an account
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()

    const account = await prisma.account.findUnique({ where: { id } })
    if (!account) return NextResponse.json({ message: "Account not found" }, { status: 404 })

    const data: Prisma.AccountUncheckedUpdateInput = {}

    if ("name" in body) {
      const name = typeof body.name === "string" ? body.name.trim() : ""
      if (!name) return NextResponse.json({ message: "Name is required" }, { status: 400 })
      data.name = name
    }

    if ("code" in body) {
      const code = typeof body.code === "string" ? body.code.trim() : ""
      if (!code) return NextResponse.json({ message: "Code is required" }, { status: 400 })
      if (code !== account.code) {
        // Auto-posting finds system accounts by code, so those codes are fixed.
        if (account.isSystem) {
          return NextResponse.json({ message: "System account codes cannot be changed" }, { status: 400 })
        }
        const clash = await prisma.account.findUnique({ where: { code }, select: { id: true } })
        if (clash) return NextResponse.json({ message: `Account code ${code} is already in use` }, { status: 409 })
        data.code = code
      }
    }

    if ("type" in body) {
      const type = body.type as AccountType
      if (!ACCOUNT_TYPES.includes(type)) return NextResponse.json({ message: "Invalid account type" }, { status: 400 })
      if (type !== account.type) {
        if (account.isSystem) {
          return NextResponse.json({ message: "System account types cannot be changed" }, { status: 400 })
        }
        const lines = await prisma.journalLine.count({ where: { accountId: id } })
        if (lines > 0) {
          return NextResponse.json({ message: "Cannot change the type of an account that has journal lines" }, { status: 409 })
        }
        data.type = type
      }
    }

    if ("parentId" in body) {
      const parentId = typeof body.parentId === "string" && body.parentId ? body.parentId : null
      if (parentId) {
        if (parentId === id) return NextResponse.json({ message: "An account cannot be its own parent" }, { status: 400 })
        const parent = await prisma.account.findUnique({ where: { id: parentId }, select: { type: true } })
        if (!parent) return NextResponse.json({ message: "Parent account not found" }, { status: 400 })
        const finalType = (data.type as AccountType | undefined) ?? account.type
        if (parent.type !== finalType) {
          return NextResponse.json({ message: "A sub-account must have the same type as its parent" }, { status: 400 })
        }
        if (await createsCycle(id, parentId)) {
          return NextResponse.json({ message: "That parent would create a loop" }, { status: 400 })
        }
      }
      data.parentId = parentId
    }

    if ("description" in body) {
      data.description = typeof body.description === "string" ? body.description.trim() || null : null
    }

    if ("active" in body) {
      const active = Boolean(body.active)
      if (!active && account.isSystem) {
        return NextResponse.json({ message: "System accounts cannot be deactivated" }, { status: 400 })
      }
      data.active = active
    }

    const updated = await prisma.account.update({ where: { id }, data })
    return NextResponse.json(updated)
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_ACCOUNTS_PATCH]", e)
    return NextResponse.json({ message: "Failed to update account" }, { status: 500 })
  }
}

// DELETE — remove an account that has never been used
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const account = await prisma.account.findUnique({
      where: { id },
      select: {
        isSystem: true,
        _count: { select: { lines: true, expenses: true, paidExpenses: true } },
      },
    })
    if (!account) return NextResponse.json({ message: "Account not found" }, { status: 404 })

    if (account.isSystem) {
      return NextResponse.json({ message: "System accounts cannot be deleted" }, { status: 409 })
    }
    if (account._count.lines > 0) {
      return NextResponse.json({ message: "This account has journal lines. Deactivate it instead." }, { status: 409 })
    }
    if (account._count.expenses > 0 || account._count.paidExpenses > 0) {
      return NextResponse.json({ message: "This account is used by expenses. Deactivate it instead." }, { status: 409 })
    }

    // Children are re-parented to the root by the SetNull relation.
    await prisma.account.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_ACCOUNTS_DELETE]", e)
    return NextResponse.json({ message: "Failed to delete account" }, { status: 500 })
  }
}
