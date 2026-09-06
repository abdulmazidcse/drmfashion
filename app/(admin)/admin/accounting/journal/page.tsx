"use client"

import { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { BookOpen, ChevronDown, ChevronLeft, ChevronRight, Download, Loader2, Plus, Search, Trash2, X } from "lucide-react"
import Swal from "sweetalert2"
import api from "@/lib/axios"
import { cn } from "@/lib/utils"
import { confirmDelete } from "@/lib/confirmDelete"
import { useCurrency } from "@/providers/CurrencyProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import AccountingNav from "@/components/admin/accounting/AccountingNav"
import SourceBadge, { SOURCES } from "@/components/admin/accounting/SourceBadge"
import { apiMessage, isCancel } from "@/components/admin/accounting/apiError"
import DateRangePicker, { presetRange, rangeValid, ymd, type DateRange, type Preset } from "@/components/admin/accounting/DateRangePicker"

type Account = { id: string; code: string; name: string; type: string; active: boolean }

type Line = {
  id: string
  debit: number
  credit: number
  description: string | null
  account: { id: string; code: string; name: string; type: string }
}

type Entry = {
  id: string
  entryNo: number
  date: string
  memo: string | null
  source: string
  referenceType: string | null
  referenceId: string | null
  lines: Line[]
  totalDebit: number
  totalCredit: number
}

type JournalResponse = { entries: Entry[]; total: number; page: number; limit: number; pages: number }

type FormLine = { key: number; accountId: string; debit: string; credit: string; description: string }

const ALL = "all"
const DELETABLE = ["MANUAL", "ADJUSTMENT"]
let lineKey = 0
const newLine = (): FormLine => ({ key: ++lineKey, accountId: "", debit: "", credit: "", description: "" })

// useSearchParams needs a Suspense boundary so the rest of the admin shell can
// still be prerendered (see the Next docs for use-search-params).
export default function JournalPage() {
  return (
    <Suspense fallback={<div className="max-w-7xl mx-auto p-2"><div className="h-40 animate-pulse rounded-xl bg-muted/60" /></div>}>
      <JournalPageInner />
    </Suspense>
  )
}

function JournalPageInner() {
  const { formatBasePrice } = useCurrency()
  // Deep link from the expenses page: /admin/accounting/journal?search=<entryNo>.
  // Seeded into the initial state so no effect has to patch it in afterwards.
  const linked = useSearchParams().get("search")?.trim() || ""
  const [range, setRange] = useState<DateRange>(() => (linked ? { from: "2000-01-01", to: ymd(new Date()) } : presetRange("thisMonth")))
  const [source, setSource] = useState(ALL)
  const [accountId, setAccountId] = useState(ALL)
  const [searchInput, setSearchInput] = useState(linked)
  const [search, setSearch] = useState(linked)
  const [page, setPage] = useState(1)
  const [data, setData] = useState<JournalResponse | null>(null)
  // The query the current `data` answers; "loading" is derived from whether it
  // matches the selected filters, so the fetch effect never sets state
  // synchronously. `tick` forces a refetch of the same query after a write.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [formDate, setFormDate] = useState(() => ymd(new Date()))
  const [formMemo, setFormMemo] = useState("")
  const [formLines, setFormLines] = useState<FormLine[]>(() => [newLine(), newLine()])
  const [submitting, setSubmitting] = useState(false)

  // A deep link opens the picker on "Custom" so the widened range is visible.
  const pickerPreset: Preset = linked ? "custom" : "thisMonth"

  const valid = rangeValid(range)

  useEffect(() => {
    api.get<Account[]>("/admin/accounting/accounts").then((res) => setAccounts(res.data)).catch(console.error)
  }, [])

  const queryKey = valid ? JSON.stringify([range.from, range.to, source, accountId, search, page, tick]) : null
  const loading = queryKey !== null && loadedKey !== queryKey
  const reload = () => setTick((t) => t + 1)

  useEffect(() => {
    if (!queryKey) return
    const controller = new AbortController()
    api
      .get<JournalResponse>("/admin/accounting/journal", {
        params: {
          from: range.from,
          to: range.to,
          source: source === ALL ? undefined : source,
          accountId: accountId === ALL ? undefined : accountId,
          search: search || undefined,
          page,
          limit: 25,
        },
        signal: controller.signal,
      })
      .then((res) => setData(res.data))
      .catch((err: unknown) => {
        if (!isCancel(err)) console.error(err)
      })
      .then(() => {
        if (!controller.signal.aborted) setLoadedKey(queryKey)
      })
    return () => controller.abort()
  }, [queryKey, range.from, range.to, source, accountId, search, page])

  // Any filter change goes back to the first page.
  function changeRange(r: DateRange) { setRange(r); setPage(1) }
  function changeSource(v: string) { setSource(v); setPage(1) }
  function changeAccount(v: string) { setAccountId(v); setPage(1) }
  function applySearch(e: React.FormEvent) { e.preventDefault(); setSearch(searchInput.trim()); setPage(1) }

  function toggle(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function exportCsv() {
    const params = new URLSearchParams({ from: range.from, to: range.to, format: "csv" })
    if (source !== ALL) params.set("source", source)
    if (accountId !== ALL) params.set("accountId", accountId)
    if (search) params.set("search", search)
    window.open(`/api/admin/accounting/journal?${params.toString()}`, "_blank")
  }

  async function remove(entry: Entry) {
    if (!(await confirmDelete(`Delete journal entry #${entry.entryNo}?`))) return
    try {
      setDeletingId(entry.id)
      await api.delete(`/admin/accounting/journal/${entry.id}`)
      reload()
    } catch (err: unknown) {
      Swal.fire({ text: apiMessage(err, "Failed to delete entry."), icon: "error", confirmButtonColor: "#18181b" })
    } finally {
      setDeletingId(null)
    }
  }

  // ─── New entry form ──────────────────────────────────────────────────────
  const activeAccounts = useMemo(() => accounts.filter((a) => a.active), [accounts])
  const totals = useMemo(() => {
    const debit = formLines.reduce((s, l) => s + (Number(l.debit) || 0), 0)
    const credit = formLines.reduce((s, l) => s + (Number(l.credit) || 0), 0)
    const filled = formLines.filter((l) => l.accountId && ((Number(l.debit) || 0) > 0 || (Number(l.credit) || 0) > 0))
    return { debit, credit, filled: filled.length, balanced: Math.abs(debit - credit) < 0.005 && debit > 0 }
  }, [formLines])
  const canSave = totals.balanced && totals.filled >= 2 && !submitting

  function openNew() {
    setFormDate(ymd(new Date()))
    setFormMemo("")
    setFormLines([newLine(), newLine()])
    setOpen(true)
  }

  function updateLine(key: number, patch: Partial<FormLine>) {
    setFormLines((lines) => lines.map((l) => (l.key === key ? { ...l, ...patch } : l)))
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!canSave) return
    try {
      setSubmitting(true)
      await api.post("/admin/accounting/journal", {
        date: formDate,
        memo: formMemo,
        lines: formLines
          .filter((l) => l.accountId)
          .map((l) => ({ accountId: l.accountId, debit: Number(l.debit) || 0, credit: Number(l.credit) || 0, description: l.description })),
      })
      setOpen(false)
      reload()
    } catch (err: unknown) {
      Swal.fire({ text: apiMessage(err, "Failed to save entry."), icon: "error", confirmButtonColor: "#18181b" })
    } finally {
      setSubmitting(false)
    }
  }

  const entries = data?.entries ?? []

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false) }}>
        <DialogContent className="sm:max-w-3xl">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>New Journal Entry</DialogTitle>
              <DialogDescription>Debits must equal credits before the entry can be saved.</DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} required />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label>Memo</Label>
                  <Input value={formMemo} onChange={(e) => setFormMemo(e.target.value)} placeholder="Owner capital injection" />
                </div>
              </div>

              <div className="rounded-lg border border-border overflow-x-auto">
                <Table className="min-w-[640px]">
                  <TableHeader>
                    <TableRow>
                      <Th>Account</Th>
                      <Th className="w-32 text-right">Debit</Th>
                      <Th className="w-32 text-right">Credit</Th>
                      <Th>Description</Th>
                      <Th className="w-10" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {formLines.map((l) => (
                      <TableRow key={l.key}>
                        <TableCell>
                          <Select value={l.accountId} onValueChange={(v) => updateLine(l.key, { accountId: v })}>
                            <SelectTrigger className="w-full min-w-[200px]"><SelectValue placeholder="Select account" /></SelectTrigger>
                            <SelectContent>
                              {activeAccounts.map((a) => (
                                <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.debit}
                            onChange={(e) => updateLine(l.key, { debit: e.target.value, credit: e.target.value ? "" : l.credit })}
                            className="text-right font-mono"
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            value={l.credit}
                            onChange={(e) => updateLine(l.key, { credit: e.target.value, debit: e.target.value ? "" : l.debit })}
                            className="text-right font-mono"
                            placeholder="0.00"
                          />
                        </TableCell>
                        <TableCell>
                          <Input value={l.description} onChange={(e) => updateLine(l.key, { description: e.target.value })} placeholder="Optional" />
                        </TableCell>
                        <TableCell>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => setFormLines((lines) => lines.filter((x) => x.key !== l.key))}
                            disabled={formLines.length <= 2}
                            aria-label="Remove line"
                          >
                            <X className="w-3.5 h-3.5" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    <TableRow className="bg-muted/40">
                      <TableCell className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Totals</TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold">{formatBasePrice(totals.debit)}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-bold">{formatBasePrice(totals.credit)}</TableCell>
                      <TableCell colSpan={2}>
                        {totals.debit === 0 && totals.credit === 0 ? null : totals.balanced ? (
                          <span className="text-xs font-semibold text-emerald-600">Balanced</span>
                        ) : (
                          <span className="text-xs font-semibold text-rose-600">Out of balance by {formatBasePrice(Math.abs(totals.debit - totals.credit))}</span>
                        )}
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>

              <Button type="button" variant="outline" size="sm" className="text-xs" onClick={() => setFormLines((lines) => [...lines, newLine()])}>
                <Plus className="w-3.5 h-3.5" /> Add line
              </Button>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={!canSave}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                Post entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 max-w-7xl mx-auto p-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><BookOpen size={20} /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Journal</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Every entry in the ledger, automatic and manual</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={exportCsv} disabled={!valid}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4" /> New Entry
            </Button>
          </div>
        </div>

        <AccountingNav />

        {/* FILTERS */}
        <Card>
          <CardContent className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <DateRangePicker key={pickerPreset} initialPreset={pickerPreset} value={range} onChange={changeRange} />
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Source</Label>
                <Select value={source} onValueChange={changeSource}>
                  <SelectTrigger className="w-36"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All sources</SelectItem>
                    {SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Account</Label>
                <Select value={accountId} onValueChange={changeAccount}>
                  <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All accounts</SelectItem>
                    {accounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <form onSubmit={applySearch} className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Search</Label>
                <div className="flex items-center gap-1">
                  <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Memo, reference, entry no." className="w-52" />
                  <Button type="submit" variant="outline" size="icon" aria-label="Search"><Search className="w-4 h-4" /></Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* TABLE */}
        <Card>
          <CardContent className="p-0">
            {loading && !data ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
                <span className="text-muted-foreground text-sm">Loading journal...</span>
              </div>
            ) : entries.length === 0 ? (
              <div className="py-16 text-center">
                <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">No entries match</p>
              </div>
            ) : (
              <div className={cn("overflow-x-auto", loading && "opacity-60")}>
                <Table className="min-w-[860px]">
                  <TableHeader>
                    <TableRow>
                      <Th className="w-8" />
                      <Th className="w-16">No.</Th>
                      <Th className="w-28">Date</Th>
                      <Th>Memo</Th>
                      <Th className="w-28">Source</Th>
                      <Th className="w-44">Reference</Th>
                      <Th className="text-right w-32">Debit</Th>
                      <Th className="text-right w-32">Credit</Th>
                      <Th className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {entries.map((e) => {
                      const isOpen = expanded.has(e.id)
                      return (
                        <EntryRows
                          key={e.id}
                          entry={e}
                          open={isOpen}
                          onToggle={() => toggle(e.id)}
                          onDelete={() => remove(e)}
                          deleting={deletingId === e.id}
                          formatMoney={formatBasePrice}
                        />
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* PAGINATION */}
        {data && data.pages > 1 && (
          <div className="flex items-center justify-between">
            <p className="text-xs text-muted-foreground">
              Page {data.page} of {data.pages} · {data.total.toLocaleString()} entries
            </p>
            <div className="flex items-center gap-1">
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>
                <ChevronLeft className="w-4 h-4" /> Prev
              </Button>
              <Button variant="outline" size="sm" onClick={() => setPage((p) => Math.min(data.pages, p + 1))} disabled={page >= data.pages || loading}>
                Next <ChevronRight className="w-4 h-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

function EntryRows({
  entry,
  open,
  onToggle,
  onDelete,
  deleting,
  formatMoney,
}: {
  entry: Entry
  open: boolean
  onToggle: () => void
  onDelete: () => void
  deleting: boolean
  formatMoney: (n: number) => string
}) {
  const deletable = DELETABLE.includes(entry.source)
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell>
          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform", open && "rotate-180")} />
        </TableCell>
        <TableCell className="font-mono text-xs text-muted-foreground">#{entry.entryNo}</TableCell>
        <TableCell className="font-mono text-xs">{entry.date.slice(0, 10)}</TableCell>
        <TableCell className="text-sm font-medium max-w-[320px] truncate">{entry.memo || "—"}</TableCell>
        <TableCell><SourceBadge source={entry.source} /></TableCell>
        <TableCell className="font-mono text-[11px] text-muted-foreground truncate max-w-[176px]">
          {entry.referenceType ? `${entry.referenceType}:${entry.referenceId?.slice(-8).toUpperCase()}` : "—"}
        </TableCell>
        <TableCell className="text-right font-mono text-sm font-semibold">{formatMoney(entry.totalDebit)}</TableCell>
        <TableCell className="text-right font-mono text-sm font-semibold">{formatMoney(entry.totalCredit)}</TableCell>
        <TableCell onClick={(e) => e.stopPropagation()}>
          {deletable && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-rose-600 hover:text-rose-700"
              onClick={onDelete}
              disabled={deleting}
              aria-label="Delete entry"
            >
              {deleting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
            </Button>
          )}
        </TableCell>
      </TableRow>
      {open && (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell />
          <TableCell colSpan={8} className="py-2">
            <table className="w-full text-sm">
              <tbody>
                {entry.lines.map((l) => (
                  <tr key={l.id}>
                    <td className="py-1 pr-4 font-mono text-xs text-muted-foreground w-16">{l.account.code}</td>
                    <td className={cn("py-1 pr-4", l.credit > 0 && "pl-6")}>
                      <span className="font-medium">{l.account.name}</span>
                      {l.description && <span className="text-muted-foreground"> — {l.description}</span>}
                    </td>
                    <td className="py-1 pr-4 text-right font-mono w-32">{l.debit > 0 ? formatMoney(l.debit) : ""}</td>
                    <td className="py-1 pr-4 text-right font-mono w-32">{l.credit > 0 ? formatMoney(l.credit) : ""}</td>
                    <td className="w-12" />
                  </tr>
                ))}
              </tbody>
            </table>
          </TableCell>
        </TableRow>
      )}
    </>
  )
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <TableHead className={cn("text-[9px] font-semibold uppercase tracking-widest text-muted-foreground", className)}>
      {children}
    </TableHead>
  )
}
