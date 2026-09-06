"use client"

import { useEffect, useMemo, useState } from "react"
import { ChevronLeft, ChevronRight, Download, ExternalLink, Loader2, Paperclip, Pencil, Plus, Receipt, Search, Trash2 } from "lucide-react"
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
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import AccountingNav from "@/components/admin/accounting/AccountingNav"
import { apiMessage, isCancel } from "@/components/admin/accounting/apiError"
import DateRangePicker, { presetRange, rangeValid, ymd, type DateRange } from "@/components/admin/accounting/DateRangePicker"

type Account = { id: string; code: string; name: string; type: string; active: boolean }
type Supplier = { id: string; name: string }

type Expense = {
  id: string
  date: string
  amount: number
  vendor: string | null
  supplierId: string | null
  reference: string | null
  note: string | null
  receiptUrl: string | null
  account: { id: string; code: string; name: string }
  paidFromAccount: { id: string; code: string; name: string }
  supplier: { id: string; name: string } | null
  entry: { id: string; entryNo: number } | null
}

type ExpensesResponse = { expenses: Expense[]; total: number; totalAmount: number; page: number; limit: number; pages: number }

type FormState = {
  date: string
  accountId: string
  paidFromAccountId: string
  amount: string
  payeeMode: "vendor" | "supplier"
  vendor: string
  supplierId: string
  reference: string
  note: string
  receiptUrl: string
}

const ALL = "all"
const MAX_FILE_SIZE = 5 * 1024 * 1024

const emptyForm = (): FormState => ({
  date: ymd(new Date()),
  accountId: "",
  paidFromAccountId: "",
  amount: "",
  payeeMode: "vendor",
  vendor: "",
  supplierId: "",
  reference: "",
  note: "",
  receiptUrl: "",
})

export default function ExpensesPage() {
  const { formatBasePrice } = useCurrency()
  const [range, setRange] = useState<DateRange>(() => presetRange("thisMonth"))
  const [accountId, setAccountId] = useState(ALL)
  const [searchInput, setSearchInput] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [data, setData] = useState<ExpensesResponse | null>(null)
  // See the journal page: "loading" is derived from whether `data` answers the
  // selected filters, so the fetch effect never sets state synchronously.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [tick, setTick] = useState(0)
  const [accounts, setAccounts] = useState<Account[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Expense | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [uploading, setUploading] = useState(false)

  const valid = rangeValid(range)

  useEffect(() => {
    api.get<Account[]>("/admin/accounting/accounts").then((res) => setAccounts(res.data)).catch(console.error)
    api.get<Supplier[]>("/admin/suppliers").then((res) => setSuppliers(res.data)).catch(console.error)
  }, [])

  const expenseAccounts = useMemo(() => accounts.filter((a) => a.type === "EXPENSE" && a.active), [accounts])
  const assetAccounts = useMemo(() => accounts.filter((a) => a.type === "ASSET" && a.active), [accounts])

  const queryKey = valid ? JSON.stringify([range.from, range.to, accountId, search, page, tick]) : null
  const loading = queryKey !== null && loadedKey !== queryKey
  const reload = () => setTick((t) => t + 1)

  useEffect(() => {
    if (!queryKey) return
    const controller = new AbortController()
    api
      .get<ExpensesResponse>("/admin/accounting/expenses", {
        params: {
          from: range.from,
          to: range.to,
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
  }, [queryKey, range.from, range.to, accountId, search, page])

  function changeRange(r: DateRange) { setRange(r); setPage(1) }
  function changeAccount(v: string) { setAccountId(v); setPage(1) }
  function applySearch(e: React.FormEvent) { e.preventDefault(); setSearch(searchInput.trim()); setPage(1) }

  function exportCsv() {
    const params = new URLSearchParams({ from: range.from, to: range.to, format: "csv" })
    if (accountId !== ALL) params.set("accountId", accountId)
    if (search) params.set("search", search)
    window.open(`/api/admin/accounting/expenses?${params.toString()}`, "_blank")
  }

  function openAdd() {
    setEditing(null)
    setForm({
      ...emptyForm(),
      accountId: expenseAccounts[0]?.id ?? "",
      paidFromAccountId: assetAccounts.find((a) => a.code === "1000")?.id ?? assetAccounts[0]?.id ?? "",
    })
    setOpen(true)
  }

  function openEdit(x: Expense) {
    setEditing(x)
    setForm({
      date: x.date.slice(0, 10),
      accountId: x.account.id,
      paidFromAccountId: x.paidFromAccount.id,
      amount: String(x.amount),
      payeeMode: x.supplierId ? "supplier" : "vendor",
      vendor: x.vendor ?? "",
      supplierId: x.supplierId ?? "",
      reference: x.reference ?? "",
      note: x.note ?? "",
      receiptUrl: x.receiptUrl ?? "",
    })
    setOpen(true)
  }

  async function handleReceipt(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > MAX_FILE_SIZE) {
      Swal.fire({ text: "Receipt must be smaller than 5MB", icon: "warning", confirmButtonColor: "#18181b" })
      e.target.value = ""
      return
    }
    try {
      setUploading(true)
      const formData = new FormData()
      formData.append("file", file)
      const res = await api.post("/upload", formData, { headers: { "Content-Type": "multipart/form-data" } })
      setForm((f) => ({ ...f, receiptUrl: res.data.url }))
    } catch (err: unknown) {
      Swal.fire({ text: apiMessage(err, "Upload failed."), icon: "error", confirmButtonColor: "#18181b" })
    } finally {
      setUploading(false)
      e.target.value = ""
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      date: form.date,
      accountId: form.accountId,
      paidFromAccountId: form.paidFromAccountId,
      amount: Number(form.amount),
      vendor: form.payeeMode === "vendor" ? form.vendor : "",
      supplierId: form.payeeMode === "supplier" ? form.supplierId : "",
      reference: form.reference,
      note: form.note,
      receiptUrl: form.receiptUrl,
    }
    try {
      setSubmitting(true)
      if (editing) await api.patch(`/admin/accounting/expenses/${editing.id}`, payload)
      else await api.post("/admin/accounting/expenses", payload)
      setOpen(false)
      reload()
    } catch (err: unknown) {
      Swal.fire({ text: apiMessage(err, "Failed to save expense."), icon: "error", confirmButtonColor: "#18181b" })
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(x: Expense) {
    if (!(await confirmDelete(`Delete this ${formatBasePrice(x.amount)} expense and its journal entry?`))) return
    try {
      setDeletingId(x.id)
      await api.delete(`/admin/accounting/expenses/${x.id}`)
      reload()
    } catch (err: unknown) {
      Swal.fire({ text: apiMessage(err, "Failed to delete expense."), icon: "error", confirmButtonColor: "#18181b" })
    } finally {
      setDeletingId(null)
    }
  }

  const expenses = data?.expenses ?? []

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false) }}>
        <DialogContent className="sm:max-w-2xl">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Expense" : "Record Expense"}</DialogTitle>
              <DialogDescription>Posts a debit to the expense account and a credit to the account it was paid from.</DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-1.5">
                <Label>Date</Label>
                <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
              </div>
              <div className="space-y-1.5">
                <Label>Amount</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  className="font-mono"
                  placeholder="0.00"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Expense account</Label>
                <Select value={form.accountId} onValueChange={(v) => setForm((f) => ({ ...f, accountId: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {expenseAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Paid from</Label>
                <Select value={form.paidFromAccountId} onValueChange={(v) => setForm((f) => ({ ...f, paidFromAccountId: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {assetAccounts.map((a) => <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5 sm:col-span-2">
                <div className="flex items-center justify-between">
                  <Label>Payee</Label>
                  <div className="flex items-center gap-1 rounded-md border border-border p-0.5">
                    {(["vendor", "supplier"] as const).map((mode) => (
                      <Button
                        key={mode}
                        type="button"
                        size="sm"
                        variant={form.payeeMode === mode ? "default" : "ghost"}
                        className="h-6 text-[10px] capitalize"
                        onClick={() => setForm((f) => ({ ...f, payeeMode: mode }))}
                      >
                        {mode}
                      </Button>
                    ))}
                  </div>
                </div>
                {form.payeeMode === "vendor" ? (
                  <Input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} placeholder="Who was paid" />
                ) : (
                  <Select value={form.supplierId} onValueChange={(v) => setForm((f) => ({ ...f, supplierId: v }))}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select supplier" /></SelectTrigger>
                    <SelectContent>
                      {suppliers.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>

              <div className="space-y-1.5">
                <Label>Reference</Label>
                <Input value={form.reference} onChange={(e) => setForm((f) => ({ ...f, reference: e.target.value }))} placeholder="Invoice or receipt no." />
              </div>
              <div className="space-y-1.5">
                <Label>Receipt</Label>
                <div className="flex items-center gap-2">
                  <Input type="file" accept="image/*" onChange={handleReceipt} disabled={uploading} className="flex-1" />
                  {uploading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
                </div>
                {form.receiptUrl && (
                  <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
                    <a href={form.receiptUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline">
                      <Paperclip className="w-3 h-3" /> View receipt
                    </a>
                    <button type="button" className="underline" onClick={() => setForm((f) => ({ ...f, receiptUrl: "" }))}>Remove</button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Note</Label>
                <Textarea value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} rows={2} placeholder="First line becomes the journal memo" />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting || uploading || !form.accountId || !form.paidFromAccountId}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Save changes" : "Record expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 max-w-7xl mx-auto p-2">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><Receipt size={20} /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Expenses</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Bills, fees and running costs, each posted to the ledger</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" onClick={exportCsv} disabled={!valid}>
              <Download className="w-4 h-4" /> Export CSV
            </Button>
            <Button onClick={openAdd}>
              <Plus className="w-4 h-4" /> Record Expense
            </Button>
          </div>
        </div>

        <AccountingNav />

        {/* FILTERS */}
        <Card>
          <CardContent className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
            <DateRangePicker value={range} onChange={changeRange} />
            <div className="flex flex-wrap items-end gap-2">
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Account</Label>
                <Select value={accountId} onValueChange={changeAccount}>
                  <SelectTrigger className="w-52"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>All expense accounts</SelectItem>
                    {accounts.filter((a) => a.type === "EXPENSE").map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <form onSubmit={applySearch} className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Search</Label>
                <div className="flex items-center gap-1">
                  <Input value={searchInput} onChange={(e) => setSearchInput(e.target.value)} placeholder="Payee, reference, note" className="w-52" />
                  <Button type="submit" variant="outline" size="icon" aria-label="Search"><Search className="w-4 h-4" /></Button>
                </div>
              </form>
            </div>
          </CardContent>
        </Card>

        {/* TOTALS */}
        {data && (
          <div className="grid grid-cols-2 gap-4 max-w-md">
            <Card>
              <CardContent>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Expenses</p>
                <h4 className="text-2xl font-semibold mt-1 font-mono">{data.total.toLocaleString()}</h4>
              </CardContent>
            </Card>
            <Card>
              <CardContent>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Total</p>
                <h4 className="text-2xl font-semibold mt-1 font-mono truncate">{formatBasePrice(data.totalAmount)}</h4>
              </CardContent>
            </Card>
          </div>
        )}

        {/* TABLE */}
        <Card>
          <CardContent className="p-0">
            {loading && !data ? (
              <div className="flex flex-col items-center justify-center py-16">
                <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
                <span className="text-muted-foreground text-sm">Loading expenses...</span>
              </div>
            ) : expenses.length === 0 ? (
              <div className="py-16 text-center">
                <Receipt className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">No expenses in this period</p>
              </div>
            ) : (
              <div className={cn("overflow-x-auto", loading && "opacity-60")}>
                <Table className="min-w-[900px]">
                  <TableHeader>
                    <TableRow>
                      <Th className="w-28">Date</Th>
                      <Th>Account</Th>
                      <Th>Payee</Th>
                      <Th>Reference</Th>
                      <Th>Paid from</Th>
                      <Th className="text-right w-32">Amount</Th>
                      <Th className="w-16">Entry</Th>
                      <Th className="w-24 text-right">Actions</Th>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {expenses.map((x) => (
                      <TableRow key={x.id}>
                        <TableCell className="font-mono text-xs">{x.date.slice(0, 10)}</TableCell>
                        <TableCell>
                          <p className="text-sm font-medium">{x.account.name}</p>
                          {x.note && <p className="text-[11px] text-muted-foreground truncate max-w-[240px]">{x.note}</p>}
                        </TableCell>
                        <TableCell className="text-sm">{x.supplier?.name || x.vendor || <span className="text-muted-foreground">—</span>}</TableCell>
                        <TableCell className="text-xs font-mono">
                          <div className="flex items-center gap-2">
                            <span>{x.reference || "—"}</span>
                            {x.receiptUrl && (
                              <a href={x.receiptUrl} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground" aria-label="Receipt">
                                <Paperclip className="w-3.5 h-3.5" />
                              </a>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">{x.paidFromAccount.name}</TableCell>
                        <TableCell className="text-right font-mono text-sm font-semibold">{formatBasePrice(x.amount)}</TableCell>
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {x.entry ? (
                            <a href={`/admin/accounting/journal?search=${x.entry.entryNo}`} className="inline-flex items-center gap-1 hover:text-foreground">
                              #{x.entry.entryNo} <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(x)} aria-label="Edit">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-rose-600 hover:text-rose-700"
                              onClick={() => remove(x)}
                              disabled={deletingId === x.id}
                              aria-label="Delete"
                            >
                              {deletingId === x.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
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
              Page {data.page} of {data.pages} · {data.total.toLocaleString()} expenses
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

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <TableHead className={cn("text-[9px] font-semibold uppercase tracking-widest text-muted-foreground", className)}>
      {children}
    </TableHead>
  )
}
