"use client"

import { useEffect, useMemo, useState } from "react"
import { ListTree, Loader2, Lock, Pencil, Plus, Trash2 } from "lucide-react"
import Swal from "sweetalert2"
import api from "@/lib/axios"
import { cn } from "@/lib/utils"
import { confirmDelete } from "@/lib/confirmDelete"
import { useCurrency } from "@/providers/CurrencyProvider"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import AccountingNav from "@/components/admin/accounting/AccountingNav"
import { apiMessage, isCancel } from "@/components/admin/accounting/apiError"

type AccountType = "ASSET" | "LIABILITY" | "EQUITY" | "INCOME" | "EXPENSE"

type Account = {
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
  depth: number
  hasActivity: boolean
}

type FormState = {
  code: string
  name: string
  type: AccountType
  parentId: string
  description: string
  active: boolean
}

const TYPES: { value: AccountType; label: string; hint: string }[] = [
  { value: "ASSET", label: "Assets", hint: "What the business owns — cash, receivables, stock" },
  { value: "LIABILITY", label: "Liabilities", hint: "What the business owes — suppliers, tax collected" },
  { value: "EQUITY", label: "Equity", hint: "Owner's stake and retained earnings" },
  { value: "INCOME", label: "Income", hint: "Sales, shipping charged; returns show as negative" },
  { value: "EXPENSE", label: "Expenses", hint: "Cost of goods and running costs" },
]

const TYPE_STYLES: Record<AccountType, string> = {
  ASSET: "bg-sky-100 text-sky-700",
  LIABILITY: "bg-amber-100 text-amber-700",
  EQUITY: "bg-violet-100 text-violet-700",
  INCOME: "bg-emerald-100 text-emerald-700",
  EXPENSE: "bg-rose-100 text-rose-700",
}

const NONE = "__none__"
const emptyForm = (): FormState => ({ code: "", name: "", type: "EXPENSE", parentId: NONE, description: "", active: true })

export default function AccountsPage() {
  const { formatBasePrice } = useCurrency()
  const [accounts, setAccounts] = useState<Account[] | null>(null)
  const [tick, setTick] = useState(0)
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Account | null>(null)
  const [form, setForm] = useState<FormState>(emptyForm())
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  // No synchronous setState in the effect: "loading" is "nothing arrived yet"
  // and a reload bumps `tick` to fetch again.
  useEffect(() => {
    const controller = new AbortController()
    api
      .get<Account[]>("/admin/accounting/accounts", { signal: controller.signal })
      .then((res) => setAccounts(res.data))
      .catch((err: unknown) => {
        if (!isCancel(err)) console.error(err)
      })
    return () => controller.abort()
  }, [tick])

  const loading = accounts === null
  const reload = () => setTick((t) => t + 1)

  const grouped = useMemo(
    () => TYPES.map((t) => ({ ...t, rows: (accounts ?? []).filter((a) => a.type === t.value) })),
    [accounts],
  )

  const parentOptions = useMemo(
    () => (accounts ?? []).filter((a) => a.type === form.type && a.id !== editing?.id && a.parentId !== editing?.id),
    [accounts, form.type, editing],
  )

  function openAdd(type?: AccountType) {
    setEditing(null)
    setForm({ ...emptyForm(), type: type ?? "EXPENSE" })
    setOpen(true)
  }

  function openEdit(a: Account) {
    setEditing(a)
    setForm({
      code: a.code,
      name: a.name,
      type: a.type,
      parentId: a.parentId ?? NONE,
      description: a.description ?? "",
      active: a.active,
    })
    setOpen(true)
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const payload = {
      code: form.code.trim(),
      name: form.name.trim(),
      type: form.type,
      parentId: form.parentId === NONE ? null : form.parentId,
      description: form.description,
      active: form.active,
    }
    try {
      setSubmitting(true)
      if (editing) await api.patch(`/admin/accounting/accounts/${editing.id}`, payload)
      else await api.post("/admin/accounting/accounts", payload)
      setOpen(false)
      reload()
    } catch (err: unknown) {
      Swal.fire({ text: apiMessage(err, "Failed to save account."), icon: "error", confirmButtonColor: "#18181b" })
    } finally {
      setSubmitting(false)
    }
  }

  async function remove(a: Account) {
    if (!(await confirmDelete(`Delete account ${a.code} ${a.name}?`))) return
    try {
      setDeletingId(a.id)
      await api.delete(`/admin/accounting/accounts/${a.id}`)
      reload()
    } catch (err: unknown) {
      Swal.fire({ text: apiMessage(err, "Failed to delete account."), icon: "error", confirmButtonColor: "#18181b" })
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => { if (!o) setOpen(false) }}>
        <DialogContent className="sm:max-w-lg">
          <form onSubmit={submit}>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit Account" : "New Account"}</DialogTitle>
              <DialogDescription>
                {editing?.isSystem
                  ? "System accounts are used by automatic posting; their code and type are fixed."
                  : "Accounts group journal lines into the statements."}
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 py-4">
              <div className="space-y-1.5">
                <Label>Code</Label>
                <Input
                  value={form.code}
                  onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="6150"
                  disabled={editing?.isSystem}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm((f) => ({ ...f, type: v as AccountType, parentId: NONE }))}
                  disabled={editing?.isSystem}
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Software subscriptions" required />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Parent account</Label>
                <Select value={form.parentId} onValueChange={(v) => setForm((f) => ({ ...f, parentId: v }))}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="None" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE}>None (top level)</SelectItem>
                    {parentOptions.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.code} · {a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                  placeholder="What gets posted here"
                />
              </div>
              <div className="flex items-center justify-between sm:col-span-2 rounded-lg border border-border px-3 py-2">
                <div>
                  <p className="text-sm font-medium">Active</p>
                  <p className="text-[11px] text-muted-foreground">Inactive accounts are hidden from expense and journal forms.</p>
                </div>
                <Switch
                  checked={form.active}
                  onCheckedChange={(v) => setForm((f) => ({ ...f, active: v }))}
                  disabled={editing?.isSystem}
                />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={submitting}>
                {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
                {editing ? "Save changes" : "Create account"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <div className="space-y-6 max-w-7xl mx-auto p-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><ListTree size={20} /></div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Chart of Accounts</h1>
              <p className="text-sm text-muted-foreground mt-0.5">Balances as of today. System accounts are posted to automatically.</p>
            </div>
          </div>
          <Button onClick={() => openAdd()}>
            <Plus className="w-4 h-4" /> Add Account
          </Button>
        </div>

        <AccountingNav />

        {loading ? (
          <Card className="flex flex-col items-center justify-center py-16">
            <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
            <span className="text-muted-foreground text-sm">Loading accounts...</span>
          </Card>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {grouped.map((group) => {
              // Balances are per account (a parent does not roll up its children), so the group total is a plain sum.
              const subtotal = Math.round(group.rows.reduce((s, a) => s + a.balance, 0) * 100) / 100
              return (
                <Card key={group.value} className={cn(group.value === "EXPENSE" && "xl:col-span-2")}>
                  <CardHeader className="flex flex-row items-start justify-between gap-4">
                    <div>
                      <CardTitle className="text-lg flex items-center gap-2">
                        {group.label}
                        <Badge className={cn("text-[10px] font-semibold tracking-wider", TYPE_STYLES[group.value])}>{group.rows.length}</Badge>
                      </CardTitle>
                      <CardDescription>{group.hint}</CardDescription>
                    </div>
                    <Button type="button" variant="outline" size="sm" className="text-xs shrink-0" onClick={() => openAdd(group.value)}>
                      <Plus className="w-3.5 h-3.5" /> Add
                    </Button>
                  </CardHeader>
                  <CardContent className="p-0">
                    {group.rows.length === 0 ? (
                      <p className="py-10 text-center text-xs text-muted-foreground uppercase tracking-widest font-semibold">No accounts</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <Th className="w-20">Code</Th>
                              <Th>Account</Th>
                              <Th className="text-right">Balance</Th>
                              <Th className="w-24 text-right">Actions</Th>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {group.rows.map((a) => (
                              <TableRow key={a.id} className={cn(!a.active && "opacity-50")}>
                                <TableCell className="font-mono text-xs text-muted-foreground">{a.code}</TableCell>
                                <TableCell>
                                  <div className="flex items-center gap-2" style={{ paddingLeft: a.depth * 16 }}>
                                    <span className="text-sm font-medium text-foreground">{a.name}</span>
                                    {a.isSystem && <Lock className="w-3 h-3 text-muted-foreground" aria-label="System account" />}
                                    {!a.active && <Badge variant="outline" className="text-[9px]">Inactive</Badge>}
                                  </div>
                                  {a.description && <p className="text-[11px] text-muted-foreground mt-0.5" style={{ paddingLeft: a.depth * 16 }}>{a.description}</p>}
                                </TableCell>
                                <TableCell className={cn("text-right font-mono text-sm font-semibold", a.balance < 0 && "text-rose-600")}>
                                  {formatBasePrice(a.balance)}
                                </TableCell>
                                <TableCell className="text-right">
                                  <div className="flex items-center justify-end gap-1">
                                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(a)} aria-label="Edit">
                                      <Pencil className="w-3.5 h-3.5" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon"
                                      className="h-7 w-7 text-rose-600 hover:text-rose-700"
                                      onClick={() => remove(a)}
                                      disabled={a.isSystem || a.hasActivity || deletingId === a.id}
                                      aria-label="Delete"
                                      title={a.isSystem ? "System account" : a.hasActivity ? "Has journal lines" : "Delete"}
                                    >
                                      {deletingId === a.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                            <TableRow className="bg-muted/40">
                              <TableCell />
                              <TableCell className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">Total {group.label.toLowerCase()}</TableCell>
                              <TableCell className={cn("text-right font-mono text-sm font-bold", subtotal < 0 && "text-rose-600")}>
                                {formatBasePrice(subtotal)}
                              </TableCell>
                              <TableCell />
                            </TableRow>
                          </TableBody>
                        </Table>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TableHead className={cn("text-[9px] font-semibold uppercase tracking-widest text-muted-foreground", className)}>
      {children}
    </TableHead>
  )
}
