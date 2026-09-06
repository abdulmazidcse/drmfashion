import { NextResponse } from "next/server"

/**
 * Minimal CSV writer for admin report exports.
 *
 * Every cell is stringified and quoted when it contains a comma, quote or line
 * break (RFC 4180). Dates are written as ISO strings, null/undefined as empty
 * cells. When `columns` is omitted the header is the union of keys across all
 * rows, in first-seen order.
 */
export function toCsv(rows: Record<string, unknown>[], columns?: string[]): string {
  const cols =
    columns ??
    Array.from(
      rows.reduce((set, row) => {
        for (const key of Object.keys(row)) set.add(key)
        return set
      }, new Set<string>()),
    )

  const escape = (value: unknown): string => {
    if (value === null || value === undefined) return ""
    const s = value instanceof Date ? value.toISOString() : String(value)
    return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
  }

  const lines = [cols.map(escape).join(",")]
  for (const row of rows) lines.push(cols.map((c) => escape(row[c])).join(","))
  return lines.join("\r\n") + "\r\n"
}

/**
 * Wraps a CSV body as a file download. The BOM makes Excel open UTF-8 content
 * (currency symbols, accented product names) without mangling it.
 */
export function csvResponse(csv: string, filename: string): NextResponse {
  const safeName = filename.replace(/[^\w.-]+/g, "-")
  return new NextResponse("\uFEFF" + csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}"`,
      "Cache-Control": "no-store",
    },
  })
}
