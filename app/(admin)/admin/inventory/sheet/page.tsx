"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { Check, Download, Loader2, RefreshCw, Search, Sheet, TableProperties } from "lucide-react"
import api from "@/lib/axios"
import { useCurrency } from "@/providers/CurrencyProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"

/**
 * Admin → Inventory → Stock Sheet: the store's Google Sheet ("DRM Fashion
 * Blazer Stock Update"), served from the live catalogue. One block per
 * product number — photo, code, colour, prices — beside a size grid of
 * Blazer / Waistcoat / Pant quantities. Every quantity is editable in place
 * and saves straight to the variant's stock. Grouping rules live in
 * app/api/admin/inventory/sheet/route.ts.
 */

type Kind = "blazer" | "waistcoat" | "pant" | "fullSet" | "other"

interface Cell {
  variantId: string
  size: string
  label: string
  stock: number
  color: string
}

interface Member {
  productId: string
  code: string | null
  title: string
  price: number
  cells: Cell[]
}

interface Group {
  key: string
  number: string | null
  image: string
  colour: string
  members: Partial<Record<Kind, Member[]>>
}

type Totals = Record<"blazer" | "waistcoat" | "pant" | "fullSet", number>

const PRICE_ROWS: { kind: Kind; label: string }[] = [
  { kind: "blazer", label: "Blazer Price" },
  { kind: "waistcoat", label: "Waistcoat Price" },
  { kind: "pant", label: "Pant Price" },
  { kind: "fullSet", label: "Full Set Price" },
]

function cellsOf(group: Group, kind: Kind): Cell[] {
  // Two products of one kind in a group (rare) are listed one after the other.
  return (group.members[kind] ?? []).flatMap((m) => m.cells)
}

/** One editable quantity. Saves on blur / Enter; shows a tick when saved. */
function StockInput({
  cell,
  onSaved,
}: {
  cell: Cell
  onSaved: (variantId: string, stock: number) => void
}) {
  const [value, setValue] = useState(String(cell.stock))
  const [state, setState] = useState<"idle" | "saving" | "saved" | "error">("idle")
  // `cell.stock` is the last saved value: the parent updates it after a save
  // and on Refresh. When it changes from outside, show the new number.
  const [seen, setSeen] = useState(cell.stock)
  if (seen !== cell.stock) {
    setSeen(cell.stock)
    setValue(String(cell.stock))
  }

  // Sizes whose lengths were merged into one count cannot be set as one value.
  if (!cell.variantId) {
    return (
      <span className="font-semibold tabular-nums" title="Several lengths — edit them on the product">
        {cell.stock}
      </span>
    )
  }

  async function save() {
    const next = Number(value)
    if (value === "" || !Number.isInteger(next) || next < 0) {
      setValue(String(cell.stock))
      return
    }
    if (next === cell.stock) return
    setState("saving")
    try {
      await api.patch("/admin/inventory/sheet", { variantId: cell.variantId, stock: next })
      onSaved(cell.variantId, next)
      setState("saved")
      setTimeout(() => setState("idle"), 1200)
    } catch {
      setValue(String(cell.stock))
      setState("error")
      setTimeout(() => setState("idle"), 2000)
    }
  }

  return (
    <span className="relative inline-flex items-center">
      <input
        inputMode="numeric"
        value={value}
        onChange={(e) => setValue(e.target.value.replace(/[^\d]/g, ""))}
        onBlur={save}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur()
          if (e.key === "Escape") {
            setValue(String(cell.stock))
            ;(e.target as HTMLInputElement).blur()
          }
        }}
        className={`h-8 w-14 rounded-md border bg-background text-center text-sm font-semibold tabular-nums outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 ${
          state === "error" ? "border-destructive" : Number(value) === 0 ? "text-muted-foreground" : "border-input"
        }`}
        aria-label={`Stock for size ${cell.size}`}
      />
      <span className="absolute -right-5 w-4">
        {state === "saving" && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}
        {state === "saved" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
      </span>
    </span>
  )
}

export default function StockSheetPage() {
  const { formatPrice } = useCurrency()
  const [groups, setGroups] = useState<Group[]>([])
  const [totals, setTotals] = useState<Totals>({ blazer: 0, waistcoat: 0, pant: 0, fullSet: 0 })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [query, setQuery] = useState("")

  async function load() {
    setLoading(true)
    setError("")
    try {
      const res = await api.get("/admin/inventory/sheet")
      setGroups(res.data.groups ?? [])
      setTotals(res.data.totals ?? { blazer: 0, waistcoat: 0, pant: 0, fullSet: 0 })
    } catch {
      setError("Could not load the stock sheet.")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- initial fetch
    load()
  }, [])

  /** Applies a saved cell locally and keeps the header totals in step. */
  function applySaved(variantId: string, stock: number) {
    // Find the cell in the current state first, so the totals delta does not
    // depend on when React happens to run the updaters below.
    let found: { kind: Kind; previous: number } | null = null
    for (const g of groups) {
      for (const [kind, list] of Object.entries(g.members) as [Kind, Member[]][]) {
        for (const m of list) {
          const c = m.cells.find((cell) => cell.variantId === variantId)
          if (c) found = { kind, previous: c.stock }
        }
      }
    }
    if (!found) return
    const { kind, previous } = found

    setGroups((prev) =>
      prev.map((g) => {
        if (!Object.values(g.members).some((list) => list?.some((m) => m.cells.some((c) => c.variantId === variantId)))) {
          return g
        }
        const members: Group["members"] = {}
        for (const [k, list] of Object.entries(g.members) as [Kind, Member[]][]) {
          members[k] = list.map((m) => ({
            ...m,
            cells: m.cells.map((c) => (c.variantId === variantId ? { ...c, stock } : c)),
          }))
        }
        return { ...g, members }
      })
    )
    if (kind !== "other") {
      setTotals((t) => ({ ...t, [kind]: t[kind] + (stock - previous) }))
    }
  }

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return groups
    return groups.filter((g) =>
      [g.number, g.colour, ...Object.values(g.members).flat().flatMap((m) => [m?.title, m?.code])]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    )
  }, [groups, query])

  function exportCsv() {
    const rows: string[][] = [
      ["Product Code", "Colour", "Size", "Blazer", "Waistcoat", "Pant Size", "Pant Available", "Full Set"],
    ]
    for (const g of visible) {
      const blazer = cellsOf(g, "blazer")
      const waistcoat = cellsOf(g, "waistcoat")
      const pant = cellsOf(g, "pant")
      const full = cellsOf(g, "fullSet")
      const sizes = [...new Set([...blazer, ...waistcoat, ...full].map((c) => c.size))]
      const height = Math.max(sizes.length, pant.length, 1)
      for (let i = 0; i < height; i++) {
        const size = sizes[i]
        const label = [...blazer, ...waistcoat, ...full].find((c) => c.size === size)?.label ?? ""
        rows.push([
          g.number ?? "",
          g.colour,
          label,
          String(blazer.find((c) => c.size === size)?.stock ?? ""),
          String(waistcoat.find((c) => c.size === size)?.stock ?? ""),
          pant[i]?.size ?? "",
          pant[i] ? String(pant[i].stock) : "",
          String(full.find((c) => c.size === size)?.stock ?? ""),
        ])
      }
    }
    const csv = rows.map((r) => r.map((v) => `"${v.replace(/"/g, '""')}"`).join(",")).join("\r\n")
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }))
    const a = document.createElement("a")
    a.href = url
    a.download = `stock-sheet-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sheet className="h-5 w-5 text-primary" />
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Stock Sheet</h1>
          </div>
          <p className="max-w-xl text-sm text-muted-foreground">
            Blazer, waistcoat and pant stock side by side for each product number, like the stock-update sheet. Edit a
            number and press Enter — it saves straight away.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" asChild>
            <Link href="/admin/inventory">
              <TableProperties className="h-4 w-4" /> Variant list
            </Link>
          </Button>
          <Button variant="outline" onClick={exportCsv} disabled={loading || visible.length === 0}>
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} /> Refresh
          </Button>
        </div>
      </div>

      {/* Column totals — the sheet's SUM row. */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {(
          [
            ["Blazer", totals.blazer],
            ["Waistcoat", totals.waistcoat],
            ["Pant", totals.pant],
            ["Full Set", totals.fullSet],
          ] as const
        ).map(([label, value]) => (
          <Card key={label}>
            <CardContent className="p-5">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{label} in stock</p>
              <p className="mt-1 text-2xl font-bold tabular-nums">{value.toLocaleString()}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search code, colour or title"
          className="pl-9"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : error ? (
        <div className="flex h-40 flex-col items-center justify-center gap-3 text-sm text-destructive">
          {error}
          <Button variant="outline" size="sm" onClick={load}>
            Retry
          </Button>
        </div>
      ) : visible.length === 0 ? (
        <p className="py-16 text-center text-sm text-muted-foreground">No products match.</p>
      ) : (
        <div className="space-y-4">
          {visible.map((g) => {
            const blazer = cellsOf(g, "blazer")
            const waistcoat = cellsOf(g, "waistcoat")
            const pant = cellsOf(g, "pant")
            const full = cellsOf(g, "fullSet")
            const other = cellsOf(g, "other")
            // Top-wear sizes share rows; pants run down their own column, as
            // in the sheet (their waist sizes do not line up with chest sizes).
            const topSizes = [...new Set([...blazer, ...waistcoat, ...full, ...other].map((c) => c.size))].sort(
              (a, b) => {
                const all = [...blazer, ...waistcoat, ...full, ...other]
                return all.findIndex((c) => c.size === a) - all.findIndex((c) => c.size === b)
              }
            )
            const height = Math.max(topSizes.length, pant.length, 1)
            const hasWaistcoat = waistcoat.length > 0
            const hasFull = full.length > 0
            const hasOther = other.length > 0
            const titles = Object.entries(g.members).flatMap(([, list]) => (list ?? []).map((m) => m))

            return (
              <Card key={g.key} className="overflow-hidden">
                <div className="grid grid-cols-1 lg:grid-cols-[180px_260px_1fr]">
                  {/* Photo */}
                  <div className="relative aspect-[4/5] bg-muted lg:aspect-auto">
                    {g.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={g.image} alt={g.colour || "Product"} className="absolute inset-0 h-full w-full object-cover" />
                    ) : null}
                  </div>

                  {/* Code, colour, prices */}
                  <div className="space-y-3 border-b p-5 lg:border-b-0 lg:border-r">
                    <div>
                      <p className="text-lg font-bold">Product Code: {g.number ?? "—"}</p>
                      {g.colour && <p className="text-sm text-muted-foreground">Colour: {g.colour}</p>}
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {titles.map((m) => (
                        <Link key={m.productId} href={`/admin/products/${m.productId}/edit`}>
                          <Badge variant="secondary" className="font-mono text-[10px] hover:bg-muted">
                            {m.code || m.title.slice(0, 18)}
                          </Badge>
                        </Link>
                      ))}
                    </div>
                    <dl className="space-y-1 text-sm">
                      {PRICE_ROWS.filter((r) => g.members[r.kind]?.length).map((r) => (
                        <div key={r.kind} className="flex justify-between gap-3">
                          <dt className="text-muted-foreground">{r.label}</dt>
                          <dd className="font-semibold">{formatPrice(g.members[r.kind]![0].price)}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>

                  {/* Size grid */}
                  <div className="overflow-x-auto p-3">
                    <table className="w-full min-w-[420px] text-sm">
                      <thead>
                        <tr className="text-left text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                          <th className="px-3 py-2">Size Available</th>
                          <th className="px-3 py-2 text-center">Blazer</th>
                          {hasWaistcoat && <th className="px-3 py-2 text-center">Waistcoat</th>}
                          {hasFull && <th className="px-3 py-2 text-center">Full Set</th>}
                          {hasOther && <th className="px-3 py-2 text-center">Stock</th>}
                          <th className="border-l px-3 py-2">Pant Size</th>
                          <th className="px-3 py-2 text-center">Available</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: height }, (_, i) => {
                          const size = topSizes[i]
                          const pick = (cells: Cell[]) => (size ? cells.find((c) => c.size === size) : undefined)
                          const b = pick(blazer)
                          const w = pick(waistcoat)
                          const f = pick(full)
                          const o = pick(other)
                          const label = (b ?? w ?? f ?? o)?.label
                          const p = pant[i]
                          const cell = (c: Cell | undefined) =>
                            c ? <StockInput cell={c} onSaved={applySaved} /> : <span className="text-muted-foreground/50">—</span>
                          return (
                            <tr key={i} className="border-t">
                              <td className="px-3 py-1.5 font-medium">{label ?? ""}</td>
                              <td className="px-3 py-1.5 text-center">{size ? cell(b) : null}</td>
                              {hasWaistcoat && <td className="px-3 py-1.5 text-center">{size ? cell(w) : null}</td>}
                              {hasFull && <td className="px-3 py-1.5 text-center">{size ? cell(f) : null}</td>}
                              {hasOther && <td className="px-3 py-1.5 text-center">{size ? cell(o) : null}</td>}
                              <td className="border-l px-3 py-1.5 font-medium">{p?.size ?? ""}</td>
                              <td className="px-3 py-1.5 text-center">{p ? cell(p) : null}</td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
