"use client"

import { useEffect, useState } from "react"
import dynamic from "next/dynamic"
import {
  BarChart3,
  Coins,
  Download,
  Loader2,
  Package,
  RefreshCw,
  RotateCcw,
  ShoppingCart,
  TrendingUp,
  Wallet,
  DollarSign,
} from "lucide-react"
import { isAxiosError, isCancel } from "axios"
import { useCurrency } from "@/providers/CurrencyProvider"
import api from "@/lib/axios"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import type { TimelinePoint } from "@/components/admin/reports/SalesTimelineChart"

const SalesTimelineChart = dynamic(() => import("@/components/admin/reports/SalesTimelineChart"), {
  ssr: false,
  loading: () => <div className="w-full animate-pulse rounded-xl bg-muted/60" style={{ height: 320 }} />,
})

type GroupBy = "day" | "week" | "month"
type Preset = "today" | "7d" | "30d" | "thisMonth" | "lastMonth" | "custom"
type Section = "summary" | "timeline" | "products" | "categories" | "brands" | "payments" | "status"

type Report = {
  range: { from: string; to: string; groupBy: GroupBy }
  summary: {
    orders: number
    revenue: number
    itemsSold: number
    averageOrderValue: number
    tax: number
    shipping: number
    refunds: number
    netRevenue: number
    grossProfit: number
    costCoverage: number
  }
  timeline: TimelinePoint[]
  topProducts: { productId: string; title: string; thumbnail: string; skuCount: number; orders: number; qty: number; revenue: number }[]
  byCategory: { category: string; orders: number; qty: number; revenue: number }[]
  byBrand: { brand: string; orders: number; qty: number; revenue: number }[]
  byPaymentMethod: { method: string; orders: number; revenue: number }[]
  byStatus: { status: string; orders: number; revenue: number }[]
}

const PRESETS: { value: Preset; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "7d", label: "Last 7 days" },
  { value: "30d", label: "Last 30 days" },
  { value: "thisMonth", label: "This month" },
  { value: "lastMonth", label: "Last month" },
  { value: "custom", label: "Custom" },
]

const GROUP_BY: { value: GroupBy; label: string }[] = [
  { value: "day", label: "Daily" },
  { value: "week", label: "Weekly" },
  { value: "month", label: "Monthly" },
]

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-100 text-amber-700",
  PROCESSING: "bg-sky-100 text-sky-700",
  SHIPPED: "bg-indigo-100 text-indigo-700",
  DELIVERED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
}

// Local calendar dates: the admin picks "today" on their own clock.
function ymd(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0")
  const day = String(d.getDate()).padStart(2, "0")
  return `${d.getFullYear()}-${m}-${day}`
}

function presetRange(preset: Preset): { from: string; to: string } {
  const today = new Date()
  const start = new Date(today)
  switch (preset) {
    case "today":
      return { from: ymd(today), to: ymd(today) }
    case "7d":
      start.setDate(today.getDate() - 6)
      return { from: ymd(start), to: ymd(today) }
    case "thisMonth":
      return { from: ymd(new Date(today.getFullYear(), today.getMonth(), 1)), to: ymd(today) }
    case "lastMonth":
      return {
        from: ymd(new Date(today.getFullYear(), today.getMonth() - 1, 1)),
        to: ymd(new Date(today.getFullYear(), today.getMonth(), 0)),
      }
    default:
      start.setDate(today.getDate() - 29)
      return { from: ymd(start), to: ymd(today) }
  }
}

const isYmd = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)

export default function SalesReportPage() {
  const { formatBasePrice, baseCurrency } = useCurrency()
  const [preset, setPreset] = useState<Preset>("30d")
  const [range, setRange] = useState(() => presetRange("30d"))
  const [groupBy, setGroupBy] = useState<GroupBy>("day")
  const [data, setData] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The query the current `data` answers. "Loading" is derived from whether it
  // matches the selected range, so the fetch effect never sets state
  // synchronously — it only fills these in once the response lands.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  const rangeValid = isYmd(range.from) && isYmd(range.to) && range.from <= range.to
  const queryKey = rangeValid ? `${range.from}|${range.to}|${groupBy}` : null
  const loading = queryKey !== null && loadedKey !== queryKey

  useEffect(() => {
    if (!rangeValid) return
    const key = `${range.from}|${range.to}|${groupBy}`
    const controller = new AbortController()
    api
      .get<Report>("/admin/reports/sales", {
        params: { from: range.from, to: range.to, groupBy },
        signal: controller.signal,
      })
      .then((res) => {
        setData(res.data)
        setError(null)
      })
      .catch((err: unknown) => {
        if (isCancel(err)) return
        console.error("Failed to load sales report", err)
        setError((isAxiosError(err) && err.response?.data?.message) || "Failed to load sales report")
      })
      .then(() => {
        if (controller.signal.aborted) return
        setLoadedKey(key)
        setRefreshing(false)
      })
    return () => controller.abort()
  }, [range.from, range.to, groupBy, rangeValid, refreshTick])

  function refresh() {
    setRefreshing(true)
    setRefreshTick((t) => t + 1)
  }

  function choosePreset(next: Preset) {
    setPreset(next)
    if (next !== "custom") setRange(presetRange(next))
  }

  function exportCsv(section: Section) {
    const params = new URLSearchParams({ from: range.from, to: range.to, groupBy, format: "csv", section })
    window.open(`/api/admin/reports/sales?${params.toString()}`, "_blank")
  }

  const summary = data?.summary
  const kpis = summary
    ? [
        { label: "Revenue", value: formatBasePrice(summary.revenue), icon: DollarSign, tone: "bg-emerald-50 text-emerald-600" },
        { label: "Net Revenue", value: formatBasePrice(summary.netRevenue), icon: Wallet, tone: "bg-teal-50 text-teal-600", hint: "Revenue minus refunds" },
        { label: "Orders", value: summary.orders.toLocaleString(), icon: ShoppingCart, tone: "bg-indigo-50 text-indigo-600" },
        { label: "Items Sold", value: summary.itemsSold.toLocaleString(), icon: Package, tone: "bg-sky-50 text-sky-600" },
        { label: "Average Order Value", value: formatBasePrice(summary.averageOrderValue), icon: Coins, tone: "bg-violet-50 text-violet-600" },
        { label: "Refunds", value: formatBasePrice(summary.refunds), icon: RotateCcw, tone: "bg-rose-50 text-rose-600", hint: "Refunded in this period" },
        {
          label: "Gross Profit",
          value: formatBasePrice(summary.grossProfit),
          icon: TrendingUp,
          tone: "bg-amber-50 text-amber-600",
          hint: `Cost price known for ${Math.round(summary.costCoverage * 100)}% of units`,
        },
      ]
    : []

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-2">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg">
              <BarChart3 size={22} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Sales Report</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Revenue, orders and margins for any period, broken down by product, category, brand, payment method and status. Cancelled orders are excluded.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={refresh} disabled={refreshing || !rangeValid}>
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={() => exportCsv("summary")} disabled={!rangeValid}>
            <Download className="w-4 h-4" />
            Export summary
          </Button>
        </div>
      </div>

      {/* RANGE CONTROLS */}
      <Card>
        <CardContent className="flex flex-col lg:flex-row lg:items-end justify-between gap-4">
          <div className="space-y-3">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Period</Label>
            <div className="flex flex-wrap gap-1.5">
              {PRESETS.map((p) => (
                <Button
                  key={p.value}
                  type="button"
                  size="sm"
                  variant={preset === p.value ? "default" : "outline"}
                  onClick={() => choosePreset(p.value)}
                  className="text-xs"
                >
                  {p.label}
                </Button>
              ))}
            </div>
            {preset === "custom" && (
              <div className="flex flex-wrap items-center gap-2">
                <Input
                  type="date"
                  value={range.from}
                  max={range.to}
                  onChange={(e) => setRange((r) => ({ ...r, from: e.target.value }))}
                  className="w-auto bg-card"
                />
                <span className="text-xs text-muted-foreground">to</span>
                <Input
                  type="date"
                  value={range.to}
                  min={range.from}
                  onChange={(e) => setRange((r) => ({ ...r, to: e.target.value }))}
                  className="w-auto bg-card"
                />
                {!rangeValid && <span className="text-xs text-rose-600">Pick a valid start and end date.</span>}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Group timeline by</Label>
            <div className="flex items-center gap-1 rounded-lg border border-border p-1 w-fit">
              {GROUP_BY.map((g) => (
                <Button
                  key={g.value}
                  type="button"
                  size="sm"
                  variant={groupBy === g.value ? "default" : "ghost"}
                  onClick={() => setGroupBy(g.value)}
                  className="text-[10px]"
                >
                  {g.label}
                </Button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex flex-col items-center justify-center min-h-[40vh]">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
          <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Building Report...</p>
        </div>
      ) : error || !data ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-sm text-rose-600 font-medium">{error || "No data"}</p>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* KPI ROW */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {kpis.map((kpi) => (
              <Card key={kpi.label}>
                <CardContent className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-lg shrink-0", kpi.tone)}>
                    <kpi.icon className="w-6 h-6" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{kpi.label}</p>
                    <h4 className="text-2xl font-semibold text-foreground mt-1 font-mono truncate">{kpi.value}</h4>
                    {kpi.hint && <p className="text-[11px] text-muted-foreground mt-0.5">{kpi.hint}</p>}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* TIMELINE */}
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-4">
              <div>
                <CardTitle className="text-lg">Revenue &amp; Orders</CardTitle>
                <CardDescription>
                  {data.range.from} to {data.range.to}, grouped by {groupBy}. Empty periods are shown as zero.
                </CardDescription>
              </div>
              <ExportButton onClick={() => exportCsv("timeline")} />
            </CardHeader>
            <CardContent>
              {data.summary.orders === 0 ? (
                <EmptyState label="No orders in this period" />
              ) : (
                <SalesTimelineChart data={data.timeline} formatMoney={formatBasePrice} currencySymbol={baseCurrency.symbol} />
              )}
            </CardContent>
          </Card>

          {/* TOP PRODUCTS */}
          <ReportSection
            title="Top Products"
            description="Top 20 products by revenue in the period."
            onExport={() => exportCsv("products")}
            empty={data.topProducts.length === 0}
          >
            <Table className="min-w-[720px]">
              <TableHeader>
                <TableRow>
                  <Th>#</Th>
                  <Th>Product</Th>
                  <Th className="text-right">Variants</Th>
                  <Th className="text-right">Orders</Th>
                  <Th className="text-right">Qty</Th>
                  <Th className="text-right">Revenue</Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.topProducts.map((p, idx) => (
                  <TableRow key={p.productId}>
                    <TableCell className="text-xs text-muted-foreground font-mono">{idx + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-12 rounded-md bg-muted border border-border overflow-hidden shrink-0">
                          {p.thumbnail ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={p.thumbnail} alt={p.title} className="w-full h-full object-cover" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-muted-foreground"><Package size={16} /></div>
                          )}
                        </div>
                        <span className="text-sm font-medium text-foreground line-clamp-1 max-w-[320px]">{p.title}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm">{p.skuCount}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{p.orders}</TableCell>
                    <TableCell className="text-right font-mono text-sm">{p.qty}</TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold">{formatBasePrice(p.revenue)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ReportSection>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* CATEGORIES */}
            <ReportSection
              title="By Category"
              description="Line revenue attributed to each product's category."
              onExport={() => exportCsv("categories")}
              empty={data.byCategory.length === 0}
            >
              <BreakdownTable
                rows={data.byCategory.map((r) => ({ name: r.category, orders: r.orders, qty: r.qty, revenue: r.revenue }))}
                nameLabel="Category"
                total={data.summary.revenue}
                formatMoney={formatBasePrice}
              />
            </ReportSection>

            {/* BRANDS */}
            <ReportSection
              title="By Brand"
              description="Products without a brand are grouped under “No brand”."
              onExport={() => exportCsv("brands")}
              empty={data.byBrand.length === 0}
            >
              <BreakdownTable
                rows={data.byBrand.map((r) => ({ name: r.brand, orders: r.orders, qty: r.qty, revenue: r.revenue }))}
                nameLabel="Brand"
                total={data.summary.revenue}
                formatMoney={formatBasePrice}
              />
            </ReportSection>

            {/* PAYMENT METHODS */}
            <ReportSection
              title="By Payment Method"
              description="Orders without a payment record are cash on delivery."
              onExport={() => exportCsv("payments")}
              empty={data.byPaymentMethod.length === 0}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Method</Th>
                    <Th className="text-right">Orders</Th>
                    <Th className="text-right">Revenue</Th>
                    <Th className="text-right">Share</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byPaymentMethod.map((r) => (
                    <TableRow key={r.method}>
                      <TableCell className="text-sm font-medium capitalize">{r.method === "cod" ? "Cash on delivery" : r.method}</TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.orders}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{formatBasePrice(r.revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{share(r.revenue, data.summary.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ReportSection>

            {/* STATUS */}
            <ReportSection
              title="By Order Status"
              description="Where the period's orders currently stand."
              onExport={() => exportCsv("status")}
              empty={data.byStatus.length === 0}
            >
              <Table>
                <TableHeader>
                  <TableRow>
                    <Th>Status</Th>
                    <Th className="text-right">Orders</Th>
                    <Th className="text-right">Revenue</Th>
                    <Th className="text-right">Share</Th>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byStatus.map((r) => (
                    <TableRow key={r.status}>
                      <TableCell>
                        <Badge className={cn("text-[10px] font-semibold tracking-wider", STATUS_STYLES[r.status] || "bg-zinc-100 text-zinc-700")}>
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right font-mono text-sm">{r.orders}</TableCell>
                      <TableCell className="text-right font-mono text-sm font-semibold">{formatBasePrice(r.revenue)}</TableCell>
                      <TableCell className="text-right font-mono text-xs text-muted-foreground">{share(r.revenue, data.summary.revenue)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </ReportSection>
          </div>
        </>
      )}
    </div>
  )
}

function share(part: number, total: number) {
  return total > 0 ? `${((part / total) * 100).toFixed(1)}%` : "—"
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TableHead className={cn("text-[9px] font-semibold uppercase tracking-widest text-muted-foreground", className)}>
      {children}
    </TableHead>
  )
}

function ExportButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" variant="outline" size="sm" onClick={onClick} className="shrink-0 text-xs">
      <Download className="w-3.5 h-3.5" />
      Export CSV
    </Button>
  )
}

function EmptyState({ label }: { label: string }) {
  return (
    <div className="py-16 text-center">
      <BarChart3 className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">{label}</p>
    </div>
  )
}

function ReportSection({
  title,
  description,
  onExport,
  empty,
  children,
}: {
  title: string
  description: string
  onExport: () => void
  empty: boolean
  children: React.ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle className="text-lg">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        <ExportButton onClick={onExport} />
      </CardHeader>
      <CardContent className="p-0">
        {empty ? <EmptyState label="Nothing sold in this period" /> : <div className="overflow-x-auto">{children}</div>}
      </CardContent>
    </Card>
  )
}

function BreakdownTable({
  rows,
  nameLabel,
  total,
  formatMoney,
}: {
  rows: { name: string; orders: number; qty: number; revenue: number }[]
  nameLabel: string
  total: number
  formatMoney: (n: number) => string
}) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <Th>{nameLabel}</Th>
          <Th className="text-right">Orders</Th>
          <Th className="text-right">Qty</Th>
          <Th className="text-right">Revenue</Th>
          <Th className="text-right">Share</Th>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.name}>
            <TableCell className="text-sm font-medium">{r.name}</TableCell>
            <TableCell className="text-right font-mono text-sm">{r.orders}</TableCell>
            <TableCell className="text-right font-mono text-sm">{r.qty}</TableCell>
            <TableCell className="text-right font-mono text-sm font-semibold">{formatMoney(r.revenue)}</TableCell>
            <TableCell className="text-right font-mono text-xs text-muted-foreground">{share(r.revenue, total)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
