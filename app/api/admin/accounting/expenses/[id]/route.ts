import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { AccountingError, expenseInclude, parseExpenseBody, repostExpenseEntry } from "@/lib/accounting"

type Params = { params: Promise<{ id: string }> }

// PATCH — edit an expense and rebuild its journal entry in the same transaction
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const existing = await prisma.expense.findUnique({ where: { id }, select: { id: true } })
    if (!existing) return NextResponse.json({ message: "Expense not found" }, { status: 404 })

    const body = await req.json()
    const parsed = await parseExpenseBody(body, true)
    if ("error" in parsed) return NextResponse.json({ message: parsed.error }, { status: 400 })

    const expense = await prisma.$transaction(async (tx) => {
      await tx.expense.update({ where: { id }, data: parsed.data })
      await repostExpenseEntry(id, tx)
      return tx.expense.findUniqueOrThrow({ where: { id }, include: expenseInclude })
    })

    return NextResponse.json(expense)
  } catch (e) {
    if (e instanceof AccountingError) {
      return NextResponse.json({ message: e.message }, { status: e.status })
    }
    console.error("[ADMIN_ACCOUNTING_EXPENSES_PATCH]", e)
    return NextResponse.json({ message: "Failed to update expense" }, { status: 500 })
  }
}

// DELETE — remove the expense and its journal entry
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const existing = await prisma.expense.findUnique({ where: { id }, select: { entryId: true } })
    if (!existing) return NextResponse.json({ message: "Expense not found" }, { status: 404 })

    await prisma.$transaction(async (tx) => {
      await tx.expense.delete({ where: { id } })
      if (existing.entryId) {
        // Lines cascade with the entry.
        await tx.journalEntry.deleteMany({ where: { id: existing.entryId } })
      }
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_EXPENSES_DELETE]", e)
    return NextResponse.json({ message: "Failed to delete expense" }, { status: 500 })
  }
}
