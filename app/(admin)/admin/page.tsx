"use client"

import { useEffect, useState } from "react"
import {
  ShoppingBag,
  Wallet,
  Truck,
  Users,
  Receipt,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  ChevronRight,
  Loader2,
  Package,
  Clock,
  PackageCheck,
  RotateCcw,
  AlertTriangle,
  PackageX,
} from "lucide-react"
import Link from "next/link"
import api from "@/lib/axios"
import { useCurrency } from "@/providers/CurrencyProvider"
import dynamic from "next/dynamic"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

// recharts is ~300 KB and sits below the stat cards, so it is fetched after the
// page paints rather than being bundled into the dashboard entry. `ssr: false`
// because the charts measure their container and render nothing useful on the
// server anyway.
const ChartSkeleton = ({ height }: { height: number }) => (
  <div className="w-full animate-pulse rounded-xl bg-muted/60" style={{ height }} />
)

const RevenueChart = dynamic(() => import("@/components/admin/dashboard/RevenueChart"), {
  ssr: false,
  loading: () => <ChartSkeleton height={280} />,
})

const CategoryPie = dynamic(() => import("@/components/admin/dashboard/CategoryPie"), {
  ssr: false,
  loading: () => <ChartSkeleton height={220} />,
})

type Range = "today" | "7d" | "30d" | "month" | "year"

const RANGE_OPTIONS: { value: Range; label: string; compare: string }[] = [
  { value: "today", label: "Today", compare: "vs yesterday" },
  { value: "7d", label: "7 days", compare: "vs previous 7 days" },
  { value: "30d", label: "30 days", compare: "vs previous 30 days" },
  { value: "month", label: "This month", compare: "vs same days before" },
  { value: "year", label: "12 months", compare: "vs previous 12 months" },
]

type Metrics = {
  sales: number
  orders: number
  aov: number
  deliveredSales: number
  deliveredOrders: number
  cancelledOrders: number
  cancelRate: number
  customers: number
  newCustomers: number
}

type DashboardData = {
  range: Range
  current: Metrics
  previous: Metrics
  chart: { monthly: boolean; points: { label: string; sales: number; delivered: number; orders: number }[] }
  categorySales: { name: string; value: number }[]
  topProducts: { id: string; title: string; thumbnail: string; slug: string; qty: number; sales: number }[]
  todo: {
    pending: number
    processing: number
    shipped: number
    pendingReturns: number
    lowStock: number
    outOfStock: number
    lowStockThreshold: number
  }
  recentOrders: {
    id: string
    createdAt: string
    totalAmount: number
    status: string
    paymentStatus: string
    source: string | null
    shippingPhone: string
    user: { name: string | null; phone: string | null } | null
    _count: { items: number }
  }[]
}

const PIE_COLORS = ["#6366f1", "#10b981", "#0ea5e9", "#f59e0b", "#ec4899", "#8b5cf6", "#a1a1aa"]

/** % change, or null when there is nothing to compare against. */
function change(current: number, previous: number): number | null {
  if (previous === 0) return current === 0 ? 0 : null
  return ((current - previous) / previous) * 100
}

function ChangeBadge({ value, invert = false, compare }: { value: number | null; invert?: boolean; compare: string }) {
  if (value === null) {
    return <p className="text-[11px] text-muted-foreground mt-2">New — nothing {compare.replace("vs ", "in ")}</p>
  }
  // For cancellations a rise is bad, so the colours flip.
  const good = invert ? value <= 0 : value >= 0
  return (
    <div className="flex items-center gap-1.5 mt-2">
      <Badge
        variant="outline"
        className={cn(
          "gap-0.5 px-1.5",
          value === 0
            ? "text-muted-foreground"
            : good
              ? "text-emerald-600 bg-emerald-50 border-emerald-100"
              : "text-rose-600 bg-rose-50 border-rose-100"
        )}
      >
        {value > 0 ? <ArrowUpRight className="w-3 h-3" /> : value < 0 ? <ArrowDownRight className="w-3 h-3" /> : null}
        {value > 0 ? "+" : ""}
        {value.toFixed(1)}%
      </Badge>
      <span className="text-[11px] text-muted-foreground">{compare}</span>
    </div>
  )
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  changeValue,
  invert,
  compare,
}: {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  changeValue: number | null
  invert?: boolean
  compare: string
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{title}</p>
          <h3 className="text-2xl font-semibold text-foreground tracking-tight mt-2 truncate">{value}</h3>
          {sub && <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>}
        </div>
        <div className="p-2.5 rounded-full bg-muted text-foreground shrink-0">
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <ChangeBadge value={changeValue} invert={invert} compare={compare} />
    </Card>
  )
}

const STATUS_STYLE: Record<string, string> = {
  PENDING: "text-amber-700 bg-amber-50 border-amber-100",
  PROCESSING: "text-sky-700 bg-sky-50 border-sky-100",
  SHIPPED: "text-indigo-700 bg-indigo-50 border-indigo-100",
  DELIVERED: "text-emerald-700 bg-emerald-50 border-emerald-100",
  CANCELLED: "text-rose-700 bg-rose-50 border-rose-100",
}

export default function AdminDashboardPage() {
  const { formatBasePrice } = useCurrency()
  const [range, setRange] = useState<Range>("30d")
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setError(false)
    api
      .get(`/admin/dashboard?range=${range}`)
      .then((res) => {
        if (!cancelled) setData(res.data)
      })
      .catch((err) => {
        console.error("Failed to load dashboard statistics:", err)
        if (!cancelled) setError(true)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [range])

  const option = RANGE_OPTIONS.find((o) => o.value === range)!

  if (!data) {
    return (
      <div className="flex h-96 items-center justify-center">
        {error ? (
          <p className="text-sm text-muted-foreground">Could not load the dashboard. Refresh to try again.</p>
        ) : (
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        )}
      </div>
    )
  }

  const { current: cur, previous: prev, todo } = data
  const categoryTotal = data.categorySales.reduce((s, c) => s + c.value, 0)
  // Up to six slices; the tail is folded into "Other" so the pie stays legible.
  const pieData = (
    data.categorySales.length > 6
      ? [
          ...data.categorySales.slice(0, 5),
          { name: "Other", value: data.categorySales.slice(5).reduce((s, c) => s + c.value, 0) },
        ]
      : data.categorySales
  ).map((c, i) => ({ ...c, color: PIE_COLORS[i % PIE_COLORS.length] }))

  const todoTiles = [
    { label: "New orders to confirm", value: todo.pending, href: "/admin/orders?status=PENDING", icon: Clock, tone: "text-amber-600" },
    { label: "Confirmed, to send to courier", value: todo.processing, href: "/admin/orders?status=PROCESSING", icon: Package, tone: "text-sky-600" },
    { label: "With the courier", value: todo.shipped, href: "/admin/orders?status=SHIPPED", icon: Truck, tone: "text-indigo-600" },
    { label: "Return requests", value: todo.pendingReturns, href: "/admin/returns", icon: RotateCcw, tone: "text-rose-600" },
    { label: `Products with a size low (≤ ${todo.lowStockThreshold})`, value: todo.lowStock, href: "/admin/reports/low-stock", icon: AlertTriangle, tone: "text-amber-600" },
    { label: "Products with a size sold out", value: todo.outOfStock, href: "/admin/reports/low-stock", icon: PackageX, tone: "text-rose-600" },
  ]

  return (
    <div className="space-y-6 w-full p-2">
      {/* HEADER + PERIOD PICKER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Store performance for the selected period, Bangladesh time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          <div className="flex flex-wrap bg-muted p-1 rounded-lg border border-border">
            {RANGE_OPTIONS.map((o) => (
              <Button
                key={o.value}
                type="button"
                size="sm"
                variant={range === o.value ? "default" : "ghost"}
                onClick={() => setRange(o.value)}
                className="text-xs h-8"
              >
                {o.label}
              </Button>
            ))}
          </div>
        </div>
      </div>

      {/* TO DO — live counts, not tied to the period */}
      <Card className="p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold tracking-tight">Needs attention</h3>
          <span className="text-xs text-muted-foreground">Right now</span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
          {todoTiles.map((t) => (
            <Link
              key={t.label}
              href={t.href}
              className="group rounded-xl border border-border p-3.5 hover:border-foreground/20 hover:bg-muted/40 transition-colors"
            >
              <div className="flex items-center justify-between">
                <t.icon className={cn("w-4 h-4", t.value > 0 ? t.tone : "text-muted-foreground")} />
                <ChevronRight className="w-3.5 h-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className={cn("text-2xl font-semibold mt-2", t.value === 0 && "text-muted-foreground")}>{t.value}</p>
              <p className="text-xs text-muted-foreground mt-0.5 leading-snug">{t.label}</p>
            </Link>
          ))}
        </div>
      </Card>

      {/* KPI CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        <StatCard
          title="Sales (orders placed)"
          value={formatBasePrice(cur.sales)}
          sub="Cancelled orders not counted"
          icon={ShoppingBag}
          changeValue={change(cur.sales, prev.sales)}
          compare={option.compare}
        />
        <StatCard
          title="Delivered sales"
          value={formatBasePrice(cur.deliveredSales)}
          sub={`${cur.deliveredOrders} orders delivered in this period`}
          icon={Wallet}
          changeValue={change(cur.deliveredSales, prev.deliveredSales)}
          compare={option.compare}
        />
        <StatCard
          title="Orders"
          value={cur.orders.toLocaleString()}
          sub={`${cur.cancelledOrders} cancelled`}
          icon={Receipt}
          changeValue={change(cur.orders, prev.orders)}
          compare={option.compare}
        />
        <StatCard
          title="Average order value"
          value={formatBasePrice(cur.aov)}
          icon={PackageCheck}
          changeValue={change(cur.aov, prev.aov)}
          compare={option.compare}
        />
        <StatCard
          title="Customers"
          value={cur.customers.toLocaleString()}
          sub={`${cur.newCustomers} new · ${cur.customers - cur.newCustomers} returning`}
          icon={Users}
          changeValue={change(cur.customers, prev.customers)}
          compare={option.compare}
        />
        <StatCard
          title="Cancellation rate"
          value={`${cur.cancelRate.toFixed(1)}%`}
          sub="Of all orders placed"
          icon={XCircle}
          changeValue={change(cur.cancelRate, prev.cancelRate)}
          invert
          compare={option.compare}
        />
      </div>

      {/* CHART + CATEGORY SPLIT */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="p-6 lg:col-span-2">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2 mb-4">
            <div>
              <h3 className="text-base font-semibold tracking-tight">Sales trend</h3>
              <p className="text-sm text-muted-foreground mt-0.5">
                {data.chart.monthly ? "By month" : range === "today" ? "Last 7 days, by day" : "By day"} — sales ordered vs.
                delivered
              </p>
            </div>
          </div>
          <RevenueChart data={data.chart.points} formatMoney={formatBasePrice} />
        </Card>

        <Card className="p-6 flex flex-col">
          <h3 className="text-base font-semibold tracking-tight">Sales by category</h3>
          <p className="text-sm text-muted-foreground mt-0.5">Orders placed in this period</p>
          {pieData.length === 0 ? (
            <div className="flex-1 flex items-center justify-center py-12 text-sm text-muted-foreground">
              No sales in this period
            </div>
          ) : (
            <>
              <CategoryPie data={pieData} formatValue={formatBasePrice} />
              <div className="space-y-2 mt-2">
                {pieData.map((c) => (
                  <div key={c.name} className="flex items-center gap-2 text-sm">
                    <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                    <span className="truncate">{c.name}</span>
                    <span className="ml-auto text-muted-foreground tabular-nums">{formatBasePrice(c.value)}</span>
                    <span className="w-10 text-right text-xs text-muted-foreground tabular-nums">
                      {categoryTotal > 0 ? ((c.value / categoryTotal) * 100).toFixed(0) : 0}%
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      {/* TOP PRODUCTS + RECENT ORDERS */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        <Card className="p-6 lg:col-span-2">
          <h3 className="text-base font-semibold tracking-tight">Best sellers</h3>
          <p className="text-sm text-muted-foreground mt-0.5 mb-3">By units sold in this period</p>
          {data.topProducts.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No sales in this period</p>
          ) : (
            <div className="divide-y divide-border">
              {data.topProducts.map((p, i) => (
                <Link
                  key={p.id}
                  href={`/admin/products/${p.id}/edit`}
                  className="flex items-center gap-3 py-3 hover:bg-muted/40 -mx-2 px-2 rounded-lg"
                >
                  <span className="w-4 text-xs font-semibold text-muted-foreground">{i + 1}</span>
                  <div className="w-10 h-10 rounded-lg bg-muted border overflow-hidden shrink-0 flex items-center justify-center">
                    {p.thumbnail ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={p.thumbnail} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-4 h-4 text-muted-foreground" />
                    )}
                  </div>
                  <p className="text-sm font-medium truncate flex-1 min-w-0">{p.title}</p>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{p.qty} sold</p>
                    <p className="text-xs text-muted-foreground tabular-nums">{formatBasePrice(p.sales)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-6 lg:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-base font-semibold tracking-tight">Latest orders</h3>
            <Button asChild variant="ghost" size="sm" className="text-xs gap-1">
              <Link href="/admin/orders">
                All orders <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </Button>
          </div>
          {data.recentOrders.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No orders yet</p>
          ) : (
            <div className="overflow-x-auto -mx-2">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50">
                    <TableHead className="text-xs">Customer</TableHead>
                    <TableHead className="text-xs">Date</TableHead>
                    <TableHead className="text-xs text-right">Amount</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.recentOrders.map((o) => (
                    <TableRow key={o.id} className="cursor-pointer">
                      <TableCell className="py-2.5">
                        <Link href={`/admin/orders/${o.id}`} className="block min-w-0">
                          <span className="text-sm font-medium truncate block">{o.user?.name || "Guest"}</span>
                          <span className="text-xs text-muted-foreground">
                            {o.shippingPhone || o.user?.phone || ""}
                            {o.source ? ` · ${o.source}` : ""}
                          </span>
                        </Link>
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground whitespace-nowrap">
                        {new Date(o.createdAt).toLocaleString("en-GB", {
                          day: "2-digit",
                          month: "short",
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Dhaka",
                        })}
                      </TableCell>
                      <TableCell className="text-sm font-medium text-right tabular-nums whitespace-nowrap">
                        {formatBasePrice(o.totalAmount)}
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn("text-[10px]", STATUS_STYLE[o.status])}>
                          {o.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
