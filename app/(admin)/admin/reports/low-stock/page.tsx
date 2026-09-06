"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Boxes,
  Check,
  Download,
  ExternalLink,
  Loader2,
  PackageX,
  RefreshCw,
  Search,
  ShoppingCart,
  Truck,
  DollarSign,
} from "lucide-react"
import Swal from "sweetalert2"
import { isAxiosError, isCancel } from "axios"
import api from "@/lib/axios"
import { cn } from "@/lib/utils"
import { useCurrency } from "@/providers/CurrencyProvider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"

type Row = {
  variantId: string
  productId: string
  title: string
  slug: string
  thumbnail: string
  sku: string
  color: string
  size: string
  length: string | null
  stock: number
  category: string
  brand: string
  basePrice: number
  onOrder: number
  sold30d: number
  daysOfCover: number | null
}

type Report = {
  threshold: number
  rows: Row[]
  stats: { total: number; outOfStock: number; valueAtRisk: number }
}

type CategoryNode = { id: string; name: string; children?: CategoryNode[] }
type CategoryOption = { id: string; name: string; depth: number }

function flattenCategories(nodes: CategoryNode[], depth = 0): CategoryOption[] {
  return nodes.flatMap((n) => [{ id: n.id, name: n.name, depth }, ...flattenCategories(n.children || [], depth + 1)])
}

export default function LowStockReportPage() {
  const { formatBasePrice } = useCurrency()
  const [data, setData] = useState<Report | null>(null)
  const [error, setError] = useState<string | null>(null)
  // The filter set the current `data` answers; "loading" is derived from it so
  // the fetch effect only sets state once a response arrives.
  const [loadedKey, setLoadedKey] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState(false)
  const [refreshTick, setRefreshTick] = useState(0)

  const [thresholdInput, setThresholdInput] = useState("")
  const [savingThreshold, setSavingThreshold] = useState(false)

  const [search, setSearch] = useState("")
  const [debouncedSearch, setDebouncedSearch] = useState("")
  const [includeOutOfStock, setIncludeOutOfStock] = useState(true)
  const [categoryId, setCategoryId] = useState("")
  const [categories, setCategories] = useState<CategoryOption[]>([])

  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300)
    return () => clearTimeout(t)
  }, [search])

  useEffect(() => {
    api
      .get<CategoryNode[]>("/admin/categories")
      .then((res) => setCategories(flattenCategories(Array.isArray(res.data) ? res.data : [])))
      .catch((err) => console.error("Failed to load categories", err))
  }, [])

  const queryParams = {
    includeOutOfStock: String(includeOutOfStock),
    ...(debouncedSearch ? { search: debouncedSearch } : {}),
    ...(categoryId ? { categoryId } : {}),
  }
  const queryKey = `${includeOutOfStock}|${debouncedSearch}|${categoryId}`
  const loading = loadedKey !== queryKey

  useEffect(() => {
    const key = `${includeOutOfStock}|${debouncedSearch}|${categoryId}`
    const controller = new AbortController()
    api
      .get<Report>("/admin/reports/low-stock", {
        params: {
          includeOutOfStock: String(includeOutOfStock),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          ...(categoryId ? { categoryId } : {}),
        },
        signal: controller.signal,
      })
      .then((res) => {
        setData(res.data)
        setError(null)
        setThresholdInput((current) => (current === "" ? String(res.data.threshold) : current))
      })
      .catch((err: unknown) => {
        if (isCancel(err)) return
        console.error("Failed to load low stock report", err)
        setError((isAxiosError(err) && err.response?.data?.message) || "Failed to load low stock report")
      })
      .then(() => {
        if (controller.signal.aborted) return
        setLoadedKey(key)
        setRefreshing(false)
      })
    return () => controller.abort()
  }, [includeOutOfStock, debouncedSearch, categoryId, refreshTick])

  function refresh() {
    setRefreshing(true)
    setRefreshTick((t) => t + 1)
  }

  async function saveThreshold() {
    const n = Number.parseInt(thresholdInput, 10)
    if (!Number.isFinite(n) || n < 0) {
      Swal.fire({ text: "Threshold must be a whole number of 0 or more.", icon: "warning", confirmButtonColor: "#18181b" })
      return
    }
    try {
      setSavingThreshold(true)
      await api.post("/admin/settings", { low_stock_threshold: n })
      setThresholdInput(String(n))
      refresh()
    } catch (e: unknown) {
      const message = isAxiosError(e) ? e.response?.data?.message : undefined
      Swal.fire({ text: message || "Failed to save threshold.", icon: "error", confirmButtonColor: "#18181b" })
    } finally {
      setSavingThreshold(false)
    }
  }

  function exportCsv() {
    const params = new URLSearchParams({ ...queryParams, format: "csv" })
    window.open(`/api/admin/reports/low-stock?${params.toString()}`, "_blank")
  }

  const threshold = data?.threshold ?? 5
  const thresholdDirty = thresholdInput !== "" && thresholdInput !== String(threshold)

  const stats = data
    ? [
        { label: "Low Stock Variants", value: data.stats.total.toLocaleString(), icon: AlertTriangle, tone: "bg-amber-50 text-amber-600", hint: `At or below ${threshold} units` },
        { label: "Out of Stock", value: data.stats.outOfStock.toLocaleString(), icon: PackageX, tone: "bg-rose-50 text-rose-600", hint: "Zero units on hand" },
        { label: "Value At Risk", value: formatBasePrice(data.stats.valueAtRisk), icon: DollarSign, tone: "bg-emerald-50 text-emerald-600", hint: "Last 30 days' sales × base price" },
      ]
    : []

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-2">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg">
              <AlertTriangle size={22} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">Low Stock Report</h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Variants that need reordering, with units already on purchase orders and how many days the current stock will last at the last 30 days&apos; sales rate.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <Button variant="outline" onClick={refresh} disabled={refreshing}>
            <RefreshCw className={cn("w-4 h-4", refreshing && "animate-spin")} />
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
          <Button onClick={exportCsv}>
            <Download className="w-4 h-4" />
            Export CSV
          </Button>
        </div>
      </div>

      {/* THRESHOLD + FILTERS */}
      <Card>
        <CardContent className="flex flex-col lg:flex-row lg:items-end gap-4">
          <div className="space-y-2">
            <Label htmlFor="low-stock-threshold" className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Low stock threshold
            </Label>
            <div className="flex items-center gap-2">
              <Input
                id="low-stock-threshold"
                type="number"
                min={0}
                step={1}
                value={thresholdInput}
                onChange={(e) => setThresholdInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") saveThreshold()
                }}
                className="w-24 bg-card font-mono"
              />
              <Button type="button" size="sm" onClick={saveThreshold} disabled={savingThreshold || !thresholdDirty}>
                {savingThreshold ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                Save
              </Button>
            </div>
            <p className="text-[11px] text-muted-foreground">Also drives the inventory page&apos;s low-stock filter and count.</p>
          </div>

          <div className="flex-1 space-y-2">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Search</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search by title, SKU, or color..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 bg-card"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Category</Label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="h-9 w-full lg:w-56 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none text-muted-foreground cursor-pointer"
            >
              <option value="">All categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {`${"  ".repeat(c.depth)}${c.depth > 0 ? "↳ " : ""}${c.name}`}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2 h-9">
            <Switch id="include-oos" checked={includeOutOfStock} onCheckedChange={setIncludeOutOfStock} />
            <Label htmlFor="include-oos" className="text-sm cursor-pointer">Include out of stock</Label>
          </div>
        </CardContent>
      </Card>

      {/* STATS */}
      {data && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {stats.map((s) => (
            <Card key={s.label}>
              <CardContent className="flex items-center gap-4">
                <div className={cn("p-3 rounded-lg shrink-0", s.tone)}>
                  <s.icon className="w-6 h-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-widest">{s.label}</p>
                  <h4 className="text-2xl font-semibold text-foreground mt-1 font-mono truncate">{s.value}</h4>
                  <p className="text-[11px] text-muted-foreground mt-0.5">{s.hint}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* TABLE */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Variants at or below {threshold} units</CardTitle>
          <CardDescription>
            Sorted by stock, lowest first. Days of cover is stock divided by the average daily sales over the last 30 days.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1100px]">
              <TableHeader>
                <TableRow>
                  <Th>Product</Th>
                  <Th>Variant</Th>
                  <Th>Category</Th>
                  <Th className="text-right">Stock</Th>
                  <Th className="text-right">On Order</Th>
                  <Th className="text-right">Sold 30d</Th>
                  <Th className="text-right">Days of Cover</Th>
                  <Th className="text-right">Actions</Th>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Loading Report...</p>
                    </TableCell>
                  </TableRow>
                ) : error ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-20 text-center">
                      <p className="text-sm text-rose-600 font-medium">{error}</p>
                    </TableCell>
                  </TableRow>
                ) : !data || data.rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="py-20 text-center">
                      <Boxes className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">No variants at or below {threshold} units</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  data.rows.map((row) => {
                    const out = row.stock === 0
                    return (
                      <TableRow key={row.variantId} className={cn(out && "bg-rose-50/40 hover:bg-rose-50/80")}>
                        <TableCell className="py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-12 rounded-md bg-muted border border-border overflow-hidden shrink-0">
                              {row.thumbnail ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={row.thumbnail} alt={row.title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-card"><Boxes size={16} /></div>
                              )}
                            </div>
                            <div className="min-w-0">
                              <h5 className="font-medium text-foreground text-sm line-clamp-1 max-w-[260px]">{row.title}</h5>
                              <p className="text-[11px] font-mono text-muted-foreground">{row.sku}</p>
                              <p className="text-[10px] text-muted-foreground uppercase tracking-widest">{row.brand}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            <Badge variant="outline" className="text-[10px]">{row.color}</Badge>
                            <Badge variant="outline" className="text-[10px]">{row.size}</Badge>
                            {row.length && <Badge variant="outline" className="text-[10px]">{row.length}</Badge>}
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">{row.category}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={cn("font-mono text-xs", out ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-700")}>
                            {out ? "Out of stock" : `${row.stock} left`}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.onOrder > 0 ? (
                            <span className="inline-flex items-center gap-1 text-indigo-600"><Truck size={12} />{row.onOrder}</span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-mono text-sm">{row.sold30d}</TableCell>
                        <TableCell className="text-right font-mono text-sm">
                          {row.daysOfCover === null ? (
                            <span className="text-muted-foreground" title="No sales in the last 30 days">—</span>
                          ) : (
                            <span className={cn(row.daysOfCover < 7 ? "text-rose-600 font-semibold" : row.daysOfCover < 14 ? "text-amber-600" : "")}>
                              {row.daysOfCover}d
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button asChild variant="ghost" size="sm" className="text-xs">
                              <Link href={`/admin/products/${row.productId}/edit`}>
                                <ExternalLink className="w-3.5 h-3.5" />
                                Edit
                              </Link>
                            </Button>
                            <Button asChild variant="outline" size="sm" className="text-xs">
                              <Link href="/admin/purchases/create">
                                <ShoppingCart className="w-3.5 h-3.5" />
                                Create PO
                              </Link>
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function Th({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <TableHead className={cn("text-[9px] font-semibold uppercase tracking-widest text-muted-foreground", className)}>
      {children}
    </TableHead>
  )
}
