"use client"

import { useEffect, useState } from "react"
import {
  TrendingUp,
  ShoppingBag,
  DollarSign,
  Users,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Calendar,
  ChevronRight,
  Loader2,
  Package,
  Eye,
  User,
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

export default function AdminDashboardPage() {
  const { baseCurrency, formatBasePrice } = useCurrency()
  const [timeframe, setTimeframe] = useState<"weekly" | "monthly">("weekly")
  const [stats, setStats] = useState<any>(null)
  const [showcaseProducts, setShowcaseProducts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchDashboardStats() {
      try {
        const [dashboardRes, productsRes] = await Promise.all([
          api.get("/admin/dashboard"),
          api.get("/admin/products?limit=3")
        ])
        setStats(dashboardRes.data)
        setShowcaseProducts(productsRes.data.data || productsRes.data)
      } catch (err) {
        console.error("Failed to load dashboard statistics:", err)
      } finally {
        setLoading(false)
      }
    }
    fetchDashboardStats()
  }, [])

  if (loading || !stats) {
    return (
      <div className="flex h-96 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const {
    totalRevenue,
    activeOrdersCount,
    totalClients,
    recentRevenue,
    previousRevenue,
    recentOrders,
    previousOrders,
    recentTransactions,
    chartOrders
  } = stats

  // Dynamic growth calculations
  const revGrowth = previousRevenue === 0 ? (recentRevenue > 0 ? 100 : 0) : ((recentRevenue - previousRevenue) / previousRevenue) * 100
  const ordersGrowth = previousOrders === 0 ? (recentOrders > 0 ? 100 : 0) : ((recentOrders - previousOrders) / previousOrders) * 100

  // We skip client growth and AOV growth for brevity, or set to a rough metric based on DB stats.
  const clientsGrowth = ordersGrowth // Approximation

  const currentAov = recentOrders > 0 ? recentRevenue / recentOrders : 0
  const previousAov = previousOrders > 0 ? previousRevenue / previousOrders : 0
  const aovGrowth = previousAov === 0 ? (currentAov > 0 ? 100 : 0) : ((currentAov - previousAov) / previousAov) * 100

  // Dynamic revenue + orders chart data (weekly: last 7 days, monthly: current year)
  const today = new Date()
  today.setHours(23, 59, 59, 999)

  const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
  const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

  const weeklyRevenue = Array(7).fill(0)
  const weeklyOrders = Array(7).fill(0)
  const weeklyLabels: string[] = []
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
    weeklyLabels.push(WEEKDAY_LABELS[d.getDay()])
  }
  chartOrders.forEach((o: any) => {
    const orderDate = new Date(o.createdAt)
    const diffDays = Math.floor((today.getTime() - orderDate.getTime()) / (1000 * 60 * 60 * 24))
    if (diffDays >= 0 && diffDays < 7) {
      const index = 6 - diffDays
      weeklyRevenue[index] += o.totalAmount
      weeklyOrders[index] += 1
    }
  })

  const monthlyRevenue = Array(12).fill(0)
  const monthlyOrders = Array(12).fill(0)
  const currentYear = today.getFullYear()
  chartOrders.forEach((o: any) => {
    const orderDate = new Date(o.createdAt)
    if (orderDate.getFullYear() === currentYear) {
      monthlyRevenue[orderDate.getMonth()] += o.totalAmount
      monthlyOrders[orderDate.getMonth()] += 1
    }
  })

  const chartData = timeframe === "weekly"
    ? weeklyLabels.map((label, i) => ({ label, revenue: weeklyRevenue[i], orders: weeklyOrders[i] }))
    : MONTH_LABELS.map((label, i) => ({ label, revenue: monthlyRevenue[i], orders: monthlyOrders[i] }))

  const chartRevenueTotal = chartData.reduce((sum, d) => sum + d.revenue, 0)
  const chartOrdersTotal = chartData.reduce((sum, d) => sum + d.orders, 0)

  // Mock category-mix data for the sales distribution pie chart
  const categoryMix = [
    { name: "Apparel", value: 4200, color: "#6366f1" },
    { name: "Footwear", value: 2600, color: "#10b981" },
    { name: "Accessories", value: 1800, color: "#0ea5e9" },
    { name: "Bags", value: 1200, color: "#f59e0b" },
  ]
  const categoryMixTotal = categoryMix.reduce((sum, d) => sum + d.value, 0)

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-2">
      {/* LUXURY GREETING HEADER */}
      <div className="hidden">
      <Card className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-muted/40 rounded-full blur-3xl -mr-12 -mt-12 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-muted/40 rounded-full blur-3xl -ml-12 -mb-12 pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="text-[10px] uppercase tracking-wider gap-1.5">
              <Sparkles className="w-3 h-3 text-muted-foreground animate-spin" style={{ animationDuration: '4s' }} />
              Live Workspace Status
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight leading-none">
            Greetings, Creative Curator
          </h1>
          <p className="text-sm text-muted-foreground max-w-md leading-relaxed">
            Your high-end luxury e-commerce suite is humming. Performance metrics are trending upward.
          </p>
        </div>

        <div className="flex items-center gap-4 relative z-10 shrink-0">
          <div className="flex items-center gap-3 bg-muted/50 border border-border rounded-xl p-3.5 text-foreground">
            <Calendar className="w-5 h-5 text-muted-foreground" />
            <div className="text-left">
              <p className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">Server Time</p>
              <p className="text-xs font-semibold font-mono tracking-wide text-foreground">
                {new Date().toLocaleDateString("en-US", { dateStyle: "medium" })}
              </p>
            </div>
          </div>
        </div>
      </Card>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* REVENUE CARD */}
        <Card className="p-6 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Gross Revenue</p>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
              ) : (
                <h3 className="text-2xl font-semibold text-foreground tracking-tight mt-3">
                  {formatBasePrice(totalRevenue)}
                </h3>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 mt-1.5",
                  revGrowth >= 0
                    ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                    : "text-rose-600 bg-rose-50 border-rose-100"
                )}
              >
                {revGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {revGrowth >= 0 ? "+" : ""}{revGrowth.toFixed(1)}%
              </Badge>
            </div>
            <div className="p-3.5 rounded-full bg-muted text-foreground shrink-0">
              <DollarSign className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* ORDERS CARD */}
        <Card className="p-6 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Active Pipeline</p>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
              ) : (
                <h3 className="text-2xl font-semibold text-foreground tracking-tight mt-3">
                  {activeOrdersCount} {activeOrdersCount === 1 ? "Order" : "Orders"}
                </h3>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 mt-1.5",
                  ordersGrowth >= 0
                    ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                    : "text-rose-600 bg-rose-50 border-rose-100"
                )}
              >
                {ordersGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {ordersGrowth >= 0 ? "+" : ""}{ordersGrowth.toFixed(1)}%
              </Badge>
            </div>
            <div className="p-3.5 rounded-full bg-muted text-foreground shrink-0">
              <ShoppingBag className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* CUSTOMERS CARD */}
        <Card className="p-6 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Curated Clientele</p>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
              ) : (
                <h3 className="text-2xl font-semibold text-foreground tracking-tight mt-3">
                  {totalClients} {totalClients === 1 ? "Client" : "Clients"}
                </h3>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 mt-1.5",
                  clientsGrowth >= 0
                    ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                    : "text-rose-600 bg-rose-50 border-rose-100"
                )}
              >
                {clientsGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {clientsGrowth >= 0 ? "+" : ""}{clientsGrowth.toFixed(1)}%
              </Badge>
            </div>
            <div className="p-3.5 rounded-full bg-muted text-foreground shrink-0">
              <Users className="w-6 h-6" />
            </div>
          </div>
        </Card>

        {/* CONVERSION CARD */}
        <Card className="p-6 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm text-muted-foreground">Avg Order Value</p>
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground mt-1" />
              ) : (
                <h3 className="text-2xl font-semibold text-foreground tracking-tight mt-3">
                  {formatBasePrice(currentAov)}
                </h3>
              )}
              <Badge
                variant="outline"
                className={cn(
                  "gap-1 mt-1.5",
                  aovGrowth >= 0
                    ? "text-emerald-600 bg-emerald-50 border-emerald-100"
                    : "text-rose-600 bg-rose-50 border-rose-100"
                )}
              >
                {aovGrowth >= 0 ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {aovGrowth >= 0 ? "+" : ""}{aovGrowth.toFixed(1)}%
              </Badge>
            </div>
            <div className="p-3.5 rounded-full bg-muted text-foreground shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
          </div>
        </Card>
      </div>

      {/* GRAPH CHART CONTAINER */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 p-6 relative">
        <div className="relative z-10 -mx-6 px-6 pb-5 mb-6 border-b border-border flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h3 className="text-xl font-semibold text-foreground tracking-tight">
              Revenue Trend Tracker
            </h3>
            <p className="text-sm text-muted-foreground mt-0.5">Live vector feed tracking retail checkouts and pipeline volumes.</p>
          </div>

          <div className="flex items-center gap-6 shrink-0">
            {/* Callout Totals */}
            <div className="flex items-center gap-5">
              <div>
                <p className="text-xl font-semibold text-emerald-600 tracking-tight leading-none">
                  {formatBasePrice(chartRevenueTotal)}
                </p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">Revenue</p>
              </div>
              <div>
                <p className="text-xl font-semibold text-indigo-600 tracking-tight leading-none">
                  {chartOrdersTotal.toLocaleString()}
                </p>
                <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mt-1">Orders</p>
              </div>
            </div>

            {/* Timeframe Selector Button Group */}
            <div className="flex bg-muted p-1 rounded-lg border border-border shrink-0">
              <Button
                type="button"
                variant={timeframe === "weekly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeframe("weekly")}
                className="text-[10px]"
              >
                Weekly Analytics
              </Button>
              <Button
                type="button"
                variant={timeframe === "monthly" ? "default" : "ghost"}
                size="sm"
                onClick={() => setTimeframe("monthly")}
                className="text-[10px]"
              >
                Monthly Forecast
              </Button>
            </div>
          </div>
        </div>

        {/* REVENUE / ORDERS CHART */}
        <div className="relative w-full z-10">
          <RevenueChart data={chartData} currencySymbol={baseCurrency.symbol} />
        </div>
      </Card>

      {/* SALES DISTRIBUTION PIE CHART */}
      <Card className="p-6 relative flex flex-col">
        <div className="relative z-10 -mx-6 px-6 pb-5 mb-6 border-b border-border">
          <h3 className="text-xl font-semibold text-foreground tracking-tight">
            Sales by Category
          </h3>
          <p className="text-sm text-muted-foreground mt-0.5">Revenue split across product lines.</p>
        </div>

        <div className="relative z-10 flex-1 flex flex-col items-center justify-center">
          <CategoryPie data={categoryMix} formatValue={formatBasePrice} />

          <div className="w-full grid grid-cols-2 gap-x-4 gap-y-3 mt-4">
            {categoryMix.map((entry) => (
              <div key={entry.name} className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-semibold text-muted-foreground truncate">{entry.name}</span>
                <span className="ml-auto text-[10px] font-semibold text-muted-foreground">
                  {((entry.value / categoryMixTotal) * 100).toFixed(0)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </Card>
      </div>

      {/* LOWER SPLIT DETAILS PANEL */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* INVENTORY FOCUS CARD */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="relative -mx-6 px-6 pb-4 mb-5 border-b border-border">
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Luxury Performance Showcase
              </h3>
            </div>

            <div className="divide-y divide-border">
              {loading ? (
                <div className="py-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
              ) : showcaseProducts.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-xs font-semibold">No products found</div>
              ) : (
                showcaseProducts.map(product => (
                  <div key={product.id} className="py-4.5 flex items-center justify-between group cursor-pointer">
                    <div className="flex items-center gap-4.5">
                      <div className="w-14 h-14 rounded-2xl bg-muted/50 border overflow-hidden shrink-0 flex items-center justify-center group-hover:border-border transition duration-300">
                        {product.thumbnail ? (
                          <img
                            src={product.thumbnail}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            alt={product.title}
                          />
                        ) : (
                          <Package className="w-6 h-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <h4 className="font-semibold text-foreground text-sm truncate w-32 md:w-48">{product.title}</h4>
                        <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mt-0.5">Category: {product.category?.name || "Uncategorized"}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-sm font-semibold text-foreground font-mono">{formatBasePrice(product.basePrice || 0)}</span>
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest mt-0.5">
                        {product.variants?.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) || 0} in stock
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <Button asChild className="w-full mt-4 text-[9px] tracking-widest uppercase gap-1.5">
            <Link href="/admin/products">
              Manage Complete Inventory
              <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </Button>
        </Card>

        {/* RECENT TRANSACTIONS */}
        <Card className="p-6 flex flex-col justify-between">
          <div>
            <div className="relative -mx-6 px-6 pb-4 mb-5 border-b border-border">
              <h3 className="text-base font-semibold text-foreground tracking-tight">
                Sleek Transaction Feed
              </h3>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground mb-2" />
                <span className="text-[10px] text-muted-foreground font-semibold">Loading feed...</span>
              </div>
            ) : recentTransactions.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center">
                <Package className="text-muted-foreground w-8 h-8 mb-2" />
                <p className="text-muted-foreground text-xs font-semibold">No recent transactions recorded</p>
              </div>
            ) : (
              <div className="overflow-x-auto -mx-2">
                <Table className="table-fixed">
                  <colgroup>
                    <col className="w-[38%]" />
                    <col className="w-[18%]" />
                    <col className="w-[17%]" />
                    <col className="w-[19%]" />
                    <col className="w-[8%]" />
                  </colgroup>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Customer</TableHead>
                      <TableHead className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Date</TableHead>
                      <TableHead className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Amount</TableHead>
                      <TableHead className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest">Status</TableHead>
                      <TableHead className="text-[9px] font-semibold text-muted-foreground uppercase tracking-widest text-right">View</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentTransactions.map((tx: any) => {
                      const customerName = tx.user?.name || "Guest Customer"
                      const orderDate = new Date(tx.createdAt).toLocaleDateString("en-US", {
                        day: "2-digit", month: "short",
                      })

                      const paymentStyles: Record<string, string> = {
                        PAID: "text-emerald-600 bg-emerald-50 border-emerald-100",
                        PENDING: "text-amber-600 bg-amber-50 border-amber-100",
                        FAILED: "text-rose-600 bg-rose-50 border-rose-100",
                        REFUNDED: "text-zinc-500 bg-zinc-100 border-zinc-200",
                      }

                      const statusDot: Record<string, string> = {
                        DELIVERED: "bg-emerald-500",
                        SHIPPED: "bg-emerald-500",
                        PROCESSING: "bg-amber-500",
                        PENDING: "bg-amber-500",
                        CANCELLED: "bg-rose-500",
                      }
                      const statusText: Record<string, string> = {
                        DELIVERED: "text-emerald-600",
                        SHIPPED: "text-emerald-600",
                        PROCESSING: "text-amber-600",
                        PENDING: "text-amber-600",
                        CANCELLED: "text-rose-600",
                      }

                      return (
                        <TableRow key={tx.id} className="group">
                          <TableCell>
                            <div className="flex items-center gap-2.5 min-w-0">
                              <div className="w-8 h-8 rounded-full bg-muted border border-border text-muted-foreground flex items-center justify-center shrink-0">
                                <User className="w-4 h-4" />
                              </div>
                              <span className="text-sm font-semibold text-foreground truncate">
                                {customerName}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground whitespace-nowrap">{orderDate}</TableCell>
                          <TableCell className="text-xs font-semibold text-emerald-600 font-mono whitespace-nowrap">
                            +{formatBasePrice(tx.totalAmount)}
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 items-start">
                              <span className={cn("inline-flex items-center gap-1.5 text-xs font-semibold whitespace-nowrap", statusText[tx.status] || "text-muted-foreground")}>
                                <span className={cn("w-1.5 h-1.5 rounded-full shrink-0", statusDot[tx.status] || "bg-zinc-400")} />
                                {tx.status}
                              </span>
                              <Badge variant="outline" className={cn("text-[8px] uppercase tracking-wide", paymentStyles[tx.paymentStatus] || paymentStyles.REFUNDED)}>
                                {tx.paymentStatus}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              asChild
                              variant="outline"
                              size="icon"
                              className="w-7 h-7 ml-auto border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                            >
                              <Link href="/admin/orders" title="View order" aria-label="View order">
                                <Eye className="w-3.5 h-3.5" />
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>

          <Button asChild className="w-full mt-6 text-[9px] tracking-widest uppercase gap-1.5">
            <Link href="/admin/orders">
              View All Orders
              <ArrowUpRight className="w-4 h-4" />
            </Link>
          </Button>
        </Card>
      </div>
    </div>
  )
}
