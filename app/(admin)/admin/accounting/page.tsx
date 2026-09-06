"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import dynamic from "next/dynamic"
import {
  ArrowRight,
  BookOpen,
  Calculator,
  FileText,
  HandCoins,
  Landmark,
  ListTree,
  Loader2,
  Receipt,
  RefreshCw,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react"
import Swal from "sweetalert2"
import api from "@/lib/axios"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/providers/CurrencyProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import AccountingNav from "@/components/admin/accounting/AccountingNav"
import SourceBadge from "@/components/admin/accounting/SourceBadge"
import { apiMessage, isCancel } from "@/components/admin/accounting/apiError"
import type { MonthPoint } from "@/components/admin/accounting/RevenueExpenseChart"

const RevenueExpenseChart = dynamic(() => import("@/components/admin/accounting/RevenueExpenseChart"), {
  ssr: false,
  loading: () => <div className="w-full animate-pulse rounded-xl bg-muted/60" style={{ height: 300 }} />,
})

type RecentEntry = {
  id: string
  entryNo: number
  date: string
  memo: string | null
  source: string
  totalDebit: number
  lines: { id: string; debit: number; credit: number; account: { code: string; name: string } }[]
}

type Summary = {
  month: { from: string; to: string }
  kpis: {
    revenue: number
    expenses: number
    netProfit: number
    cash: number
    cashOnHand: number
    stripeClearing: number
    receivable: number
    payable: number
    inventory: number
  }
  series: MonthPoint[]
  recent: RecentEntry[]
  entryCount: number
}

type SyncCounts = { orders: number; payments: number; refunds: number; purchases: number; expenses: number; entriesCreated: number }

const QUICK_LINKS = [
  { href: "/admin/accounting/accounts", label: "Chart of Accounts", hint: "Manage ledger accounts", icon: ListTree },
  { href: "/admin/accounting/journal", label: "Journal", hint: "Every posted entry", icon: BookOpen },
  { href: "/admin/accounting/expenses", label: "Expenses", hint: "Record bills and costs", icon: Receipt },
  { href: "/admin/accounting/reports", label: "Reports", hint: "P&L, balance sheet, ledger", icon: FileText },
]

export default function AccountingOverviewPage() {
  const { formatBasePrice, baseCurrency } = useCurrency()
  const [data, setData] = useState<Summary | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [tick, setTick] = useState(0)

  // The fetch effect never sets state synchronously: "loading" is simply
  // "nothing has arrived yet", and a refresh bumps `tick` to re-run it.
  useEffect(() => {
    const controller = new AbortController()
    api
      .get<Summary>("/admin/accounting/summary", { signal: controller.signal })
      .then((res) => {
        setData(res.data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (isCancel(err)) return
        console.error("Failed to load accounting summary", err)
        setError(apiMessage(err, "Failed to load accounting summary"))
      })
      .then(() => {
        if (!controller.signal.aborted) setRefreshing(false)
      })
    return () => controller.abort()
  }, [tick])

  const loading = data === null && error === null

  function refresh() {
    setRefreshing(true)
    setTick((t) => t + 1)
  }

  async function sync() {
    try {
      setSyncing(true)
      const res = await api.post<SyncCounts>("/admin/accounting/sync", {})
      const c = res.data
      await Swal.fire({
        icon: "success",
        title: c.entriesCreated === 0 ? "Ledger already up to date" : `${c.entriesCreated} entries posted`,
        html: `
          <div style="font-size:13px;text-align:left;display:inline-block">
            <div>Orders: <b>${c.orders}</b></div>
            <div>Payments: <b>${c.payments}</b></div>
            <div>Refunds: <b>${c.refunds}</b></div>
            <div>Purchases: <b>${c.purchases}</b></div>
            <div>Expenses: <b>${c.expenses}</b></div>
          </div>`,
        confirmButtonColor: "#18181b",
      })
      refresh()
    } catch (err: unknown) {
      Swal.fire({ text: apiMessage(err, "Sync failed."), icon: "error", confirmButtonColor: "#18181b" })
    } finally {
      setSyncing(false)
    }
  }

  const k = data?.kpis
  const monthKpis = k
    ? [
        { label: "Revenue (this month)", value: formatBasePrice(k.revenue), icon: TrendingUp, tone: "bg-emerald-50 text-emerald-600", hint: "Sales net of returns" },
        { label: "Expenses (this month)", value: formatBasePrice(k.expenses), icon: TrendingDown, tone: "bg-rose-50 text-rose-600", hint: "Cost of goods and operating costs" },
        {
          label: "Net Profit (this month)",
          value: formatBasePrice(k.netProfit),
          icon: Calculator,
          tone: k.netProfit >= 0 ? "bg-teal-50 text-teal-600" : "bg-orange-50 text-orange-600",
          hint: `${data?.month.from} to ${data?.month.to}`,
        },
      ]
    : []
  const positionKpis = k
    ? [
        { label: "Cash & Bank", value: formatBasePrice(k.cash), icon: Wallet, tone: "bg-sky-50 text-sky-600", hint: `Incl. Stripe clearing ${formatBasePrice(k.stripeClearing)}` },
        { label: "Receivable", value: formatBasePrice(k.receivable), icon: HandCoins, tone: "bg-indigo-50 text-indigo-600", hint: "Unpaid customer orders" },
        { label: "Payable", value: formatBasePrice(k.payable), icon: Landmark, tone: "bg-amber-50 text-amber-600", hint: "Owed to suppliers" },
      ]
    : []

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary text-primary-foreground rounded-lg"><Scale size={20} /></div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Accounting</h1>
            <p className="text-sm text-muted-foreground mt-0.5">Double-entry ledger built from orders, refunds, purchases and expenses</p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={refresh} disabled={refreshing || loading}>
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={sync} disabled={syncing}>
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? "Syncing..." : "Sync from orders"}
          </Button>
        </div>
      </div>

      <AccountingNav />

      {loading ? (
        <Card className="flex flex-col items-center justify-center py-16">
          <Loader2 className="w-7 h-7 animate-spin text-muted-foreground mb-3" />
          <span className="text-muted-foreground text-sm">Loading ledger...</span>
        </Card>
      ) : error || !data ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-rose-600 font-medium">{error || "No data"}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI ROWS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {monthKpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {positionKpis.map((kpi) => <KpiCard key={kpi.label} {...kpi} />)}
          </div>

          {/* CHART */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Revenue vs Expenses</CardTitle>
              <CardDescription>Last six months, by entry date. Revenue is net of returns; expenses include cost of goods sold.</CardDescription>
            </CardHeader>
            <CardContent>
              {data.entryCount === 0 ? (
                <div className="py-16 text-center">
                  <BookOpen className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                  <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">No entries yet</p>
                  <p className="text-xs text-muted-foreground mt-2">Use “Sync from orders” to build the ledger from existing orders.</p>
                </div>
              ) : (
                <RevenueExpenseChart data={data.series} formatMoney={formatBasePrice} currencySymbol={baseCurrency.symbol} />
              )}
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* RECENT ENTRIES */}
            <Card className="lg:col-span-2">
              <CardHeader className="flex flex-row items-start justify-between gap-4">
                <div>
                  <CardTitle className="text-lg">Recent Entries</CardTitle>
                  <CardDescription>{data.entryCount.toLocaleString()} entries in the journal</CardDescription>
                </div>
                <Button asChild variant="outline" size="sm" className="text-xs shrink-0">
                  <Link href="/admin/accounting/journal">View all <ArrowRight className="w-3.5 h-3.5" /></Link>
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {data.recent.length === 0 ? (
                  <p className="py-12 text-center text-xs text-muted-foreground uppercase tracking-widest font-semibold">Nothing posted yet</p>
                ) : (
                  <ul className="divide-y divide-border">
                    {data.recent.map((e) => (
                      <li key={e.id} className="flex items-center gap-4 px-6 py-3">
                        <span className="text-xs font-mono text-muted-foreground w-12 shrink-0">#{e.entryNo}</span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-foreground truncate">{e.memo || "—"}</p>
                          <p className="text-[11px] text-muted-foreground truncate">
                            {e.date.slice(0, 10)} · {e.lines.map((l) => l.account.name).join(" / ")}
                          </p>
                        </div>
                        <SourceBadge source={e.source} className="shrink-0" />
                        <span className="text-sm font-mono font-semibold shrink-0">{formatBasePrice(e.totalDebit)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {/* QUICK LINKS */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Go to</CardTitle>
                <CardDescription>Inventory on the books: {formatBasePrice(k?.inventory ?? 0)}</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {QUICK_LINKS.map((q) => (
                  <Link
                    key={q.href}
                    href={q.href}
                    className="flex items-center gap-3 rounded-lg border border-border p-3 hover:bg-muted transition-colors"
                  >
                    <div className="p-2 rounded-md bg-muted text-foreground"><q.icon className="w-4 h-4" /></div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">{q.label}</p>
                      <p className="text-[11px] text-muted-foreground">{q.hint}</p>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground" />
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string
  value: string
  icon: React.ComponentType<{ className?: string }>
  tone: string
  hint?: string
}) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={cn("p-3 rounded-lg shrink-0", tone)}>
          <Icon className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{label}</p>
          <h4 className="text-2xl font-semibold text-foreground mt-1 font-mono truncate">{value}</h4>
          {hint && <p className="text-[11px] text-muted-foreground mt-0.5">{hint}</p>}
        </div>
      </CardContent>
    </Card>
  )
}
