"use client"

import { useState, useEffect } from "react"
import {
  BarChart3,
  TrendingUp,
  Percent,
  Coins,
  Sparkles,
  ShoppingBag,
  RefreshCw,
  Zap,
  Loader2,
} from "lucide-react"
import { useCurrency } from "@/providers/CurrencyProvider"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"

export default function AnalyticsPage() {
  const { formatBasePrice } = useCurrency()
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [data, setData] = useState<any>(null)

  const fetchAnalytics = async (isSync = false) => {
    if (isSync) setSyncing(true)
    else setLoading(true)

    try {
      const res = await api.get("/admin/analytics")
      setData(res.data)
    } catch (err) {
      console.error("Failed to load analytics", err)
    } finally {
      setLoading(false)
      setSyncing(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-4" />
        <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Loading Analytics...</p>
      </div>
    )
  }

  const { metrics, funnelSteps, marketShare } = data || {
    metrics: { averageOrderValue: 0, customerLifetimeValue: 0, cartAbandonmentRate: 0, conversionIndex: 0 },
    funnelSteps: [],
    marketShare: []
  }

  // The data is now fully dynamic from the API

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-2">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg">
              <BarChart3 size={22} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Analytics Suite
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Evaluate brand metrics, average order values, marketing funnels, and dynamic product conversions.
          </p>
        </div>

        {/* REFRESH FEED */}
        <Button
          variant="outline"
          onClick={() => fetchAnalytics(true)}
          disabled={syncing}
          className="shrink-0"
        >
          <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Re-sync Live Feed'}
        </Button>
      </div>

      {/* METRICS ROW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Average Order Value */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Average Order Value</p>
              <h4 className="text-2xl font-semibold text-foreground mt-1 font-mono">{formatBasePrice(metrics.averageOrderValue)}</h4>
            </div>
          </CardContent>
        </Card>

        {/* Customer Lifetime Value */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Customer LTV</p>
              <h4 className="text-2xl font-semibold text-foreground mt-1 font-mono">{formatBasePrice(metrics.customerLifetimeValue)}</h4>
            </div>
          </CardContent>
        </Card>

        {/* Cart Abandonment Rate */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-rose-50 text-rose-600 rounded-lg">
              <Percent className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Cart Abandonment</p>
              <h4 className="text-2xl font-semibold text-foreground mt-1 font-mono">{metrics.cartAbandonmentRate.toFixed(1)}%</h4>
            </div>
          </CardContent>
        </Card>

        {/* Conversion Rate */}
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="p-3 bg-violet-50 text-violet-600 rounded-lg">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">Conversion Index</p>
              <h4 className="text-2xl font-semibold text-foreground mt-1 font-mono">{metrics.conversionIndex.toFixed(2)}%</h4>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* CHARTS CONTAINER GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* SALES FUNNEL */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Sparkles className="text-indigo-600 w-5 h-5" />
              Interactive Brand Funnel
            </CardTitle>
            <CardDescription>Measuring progression rate from dynamic luxury impressions down to orders.</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {funnelSteps.map((step: any, idx: number) => (
              <div key={idx} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded-md bg-muted flex items-center justify-center font-mono font-semibold text-xs text-muted-foreground">
                      {idx + 1}
                    </span>
                    <span className="font-medium text-foreground">{step.label}</span>
                  </div>
                  <div className="text-right font-mono text-muted-foreground text-xs">
                    <span className="font-semibold text-foreground">{step.count}</span>
                    <span className="ml-2 font-semibold text-indigo-600">({step.percent}%)</span>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-muted border border-border h-4.5 rounded-full overflow-hidden">
                  <div
                    style={{ width: `${step.percent}%` }}
                    className={`h-full ${step.color} rounded-full transition-all duration-1000 ease-out shadow-inner`}
                  />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* MARKET SHARE DISTRIBUTION */}
        <Card className="flex flex-col justify-between">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ShoppingBag className="text-rose-500 w-5 h-5" />
              Brand Market Share
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col justify-between flex-1">
            <div className="space-y-6">
              {marketShare.map((brand: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className={`w-3.5 h-3.5 rounded-full ${brand.color} shrink-0`} />
                    <div>
                      <h5 className="text-sm font-medium text-foreground group-hover:text-indigo-600 transition">
                        {brand.name}
                      </h5>
                      <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                        {brand.share}% of Total Gross
                      </span>
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-foreground font-mono">
                    {formatBasePrice(brand.sales)}
                  </span>
                </div>
              ))}
            </div>

            {/* DUMMY METRICS ANCHOR */}
            <div className="mt-8 pt-6 text-center">
              <Separator className="mb-6" />
              <Badge variant="secondary" className="uppercase tracking-widest">
                Live Data Synced
              </Badge>
              <p className="text-sm text-muted-foreground mt-3 leading-relaxed">
                These analytics are generated in real-time based on live active carts, completed orders, and registered customers.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
