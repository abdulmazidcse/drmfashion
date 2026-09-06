import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { entryInclude, round2 } from "@/lib/accounting"

type Params = { params: Promise<{ id: string }> }

const DELETABLE_SOURCES = ["MANUAL", "ADJUSTMENT"]

// GET — one entry with its lines
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const entry = await prisma.journalEntry.findUnique({
      where: { id },
      include: { ...entryInclude, expense: { select: { id: true } } },
    })
    if (!entry) return NextResponse.json({ message: "Entry not found" }, { status: 404 })

    return NextResponse.json({
      ...entry,
      totalDebit: round2(entry.lines.reduce((s, l) => s + l.debit, 0)),
      totalCredit: round2(entry.lines.reduce((s, l) => s + l.credit, 0)),
    })
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_JOURNAL_ID_GET]", e)
    return NextResponse.json({ message: "Failed to load entry" }, { status: 500 })
  }
}

// DELETE — only hand-written entries; auto-posted ones are reversed by their source
export async function DELETE(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const entry = await prisma.journalEntry.findUnique({ where: { id }, select: { source: true } })
    if (!entry) return NextResponse.json({ message: "Entry not found" }, { status: 404 })

    if (!DELETABLE_SOURCES.includes(entry.source)) {
      return NextResponse.json(
        { message: `${entry.source} entries are posted automatically and cannot be deleted here` },
        { status: 409 },
      )
    }

    // Lines cascade with the entry.
    await prisma.journalEntry.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("[ADMIN_ACCOUNTING_JOURNAL_ID_DELETE]", e)
    return NextResponse.json({ message: "Failed to delete entry" }, { status: 500 })
  }
}
