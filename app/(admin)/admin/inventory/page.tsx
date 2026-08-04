"use client"

import { useState, useEffect } from "react"
import {
  Boxes,
  AlertTriangle,
  Check,
  Edit2,
  Search,
  RefreshCw,
  Plus,
  Minus,
  Loader2,
  TrendingDown,
  DollarSign,
  PackageCheck
} from "lucide-react"
import { isCancel } from "axios"
import api from "@/lib/axios"
import { useCurrency } from "@/providers/CurrencyProvider"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import { cn } from "@/lib/utils"

type VariantItem = {
  id: string
  productId: string
  productName: string
  productImage: string
  productCategory: string
  sku: string
  color: string
  size: string
  length: string | null
  stock: number
  price: number
}

export default function InventoryPage() {
  const { formatBasePrice } = useCurrency()
  const [search, setSearch] = useState("")
  const [stockFilter, setStockFilter] = useState("all") // 'all', 'low', 'out', 'in'
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  const [editingId, setEditingId] = useState<string | null>(null)
  const [tempStock, setTempStock] = useState<number>(0)

  const [loading, setLoading] = useState(true)
  const [variants, setVariants] = useState<VariantItem[]>([])
  const [totalVariants, setTotalVariants] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [stats, setStats] = useState({ totalUnits: 0, lowStockCount: 0, totalValue: 0 })
  const [saving, setSaving] = useState(false)

  // Typing shouldn't fire a request per keystroke.
  const [debouncedSearch, setDebouncedSearch] = useState("")
  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300)
    return () => clearTimeout(id)
  }, [search])

  // One page of variants at a time. Filtering, pagination and the summary
  // totals all happen in the database — the browser used to hold the entire
  // catalogue in memory just to slice ten rows out of it.
  async function fetchInventory(signal?: AbortSignal) {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
        stock: stockFilter,
      })
      if (debouncedSearch) params.set("search", debouncedSearch)

      const res = await api.get(`/admin/inventory?${params.toString()}`, { signal })

      setVariants(res.data.data || [])
      setTotalVariants(res.data.meta?.total || 0)
      setTotalPages(res.data.meta?.totalPages || 1)
      if (res.data.stats) setStats(res.data.stats)
    } catch (error) {
      // An in-flight page is aborted whenever the filters change; that is the
      // expected path, not a failure worth logging.
      if (isCancel(error)) return
      console.error("Failed to load inventory:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const controller = new AbortController()
    fetchInventory(controller.signal)
    return () => controller.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedSearch, stockFilter])

  const paginatedInventory = variants

  // Start inline editing
  function startEditing(item: VariantItem) {
    setEditingId(item.id)
    setTempStock(item.stock)
  }

  // Save stock change
  async function saveStockChange(id: string) {
    try {
      setSaving(true)
      await api.patch(`/admin/variants/${id}`, { stock: tempStock })

      const edited = variants.find((v) => v.id === id)
      setVariants((prev) =>
        prev.map((item) =>
          item.id === id ? { ...item, stock: tempStock } : item
        )
      )

      // The summary cards come from the server, so nudge them by the exact
      // delta instead of refetching — a refetch would reorder the table
      // (stock-ascending) and yank the row the user just edited off screen.
      if (edited) {
        const delta = tempStock - edited.stock
        setStats((prev) => ({
          totalUnits: prev.totalUnits + delta,
          totalValue: prev.totalValue + delta * edited.price,
          lowStockCount:
            prev.lowStockCount + (tempStock <= 5 ? 1 : 0) - (edited.stock <= 5 ? 1 : 0),
        }))
      }

      setEditingId(null)
    } catch (error) {
      console.error("Failed to update stock", error)
      Swal.fire({ text: "Failed to update stock in database.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setSaving(false)
    }
  }

  // Statistics — aggregated server-side over the whole inventory, so they stay
  // correct regardless of which page or filter is on screen.
  const { totalUnits: totalItems, lowStockCount, totalValue } = stats

  return (
    <div className="space-y-8 max-w-[1600px] mx-auto pb-10">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2.5 bg-primary text-primary-foreground rounded-lg">
              <Boxes size={22} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Inventory Matrix
            </h1>
          </div>
          <p className="text-sm text-muted-foreground max-w-md">
            Live database view of all product variants, SKU tracking, and real-time stock valuation.
          </p>
        </div>

        <Button
          variant="outline"
          onClick={() => fetchInventory()}
          className="shrink-0"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Sync Database
        </Button>
      </div>

      {/* INTELLIGENT SUMMARY CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-emerald-500/5">
            <PackageCheck size={120} />
          </div>
          <CardContent className="flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <Boxes size={18} />
              </div>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total Stock Units</h3>
            </div>
            <p className="text-3xl font-semibold text-foreground relative z-10">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : totalItems.toLocaleString()}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-rose-500/5">
            <TrendingDown size={120} />
          </div>
          <CardContent className="flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-lg bg-rose-100 text-rose-600 flex items-center justify-center">
                <AlertTriangle size={18} />
              </div>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Critical Low Stock (≤ 5)</h3>
            </div>
            <p className="text-3xl font-semibold text-rose-600 relative z-10">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : lowStockCount}
            </p>
          </CardContent>
        </Card>

        <Card className="relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-blue-500/5">
            <DollarSign size={120} />
          </div>
          <CardContent className="flex flex-col justify-between gap-4">
            <div className="flex items-center gap-3 relative z-10">
              <div className="w-10 h-10 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
                <DollarSign size={18} />
              </div>
              <h3 className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Total Inventory Value</h3>
            </div>
            <p className="text-3xl font-semibold text-foreground relative z-10">
              {loading ? <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" /> : formatBasePrice(totalValue)}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* LOW STOCK ALARM ALERT */}
      {!loading && lowStockCount > 0 && (
        <div className="bg-rose-500 text-white rounded-lg p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -mr-16 -mt-16 pointer-events-none" />
          <div className="flex items-center gap-3 relative z-10">
            <div className="p-2 bg-white/20 rounded-lg animate-pulse">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-semibold text-sm uppercase tracking-wider">Critical Inventory Alert</h4>
              <p className="text-white/80 text-[10px] mt-0.5 font-medium uppercase tracking-widest">
                {lowStockCount} SKU variants require immediate restock
              </p>
            </div>
          </div>
        </div>
      )}

      {/* SEARCH AND GRID */}
      <Card className="overflow-hidden py-0 gap-0">
        <div className="p-4 border-b border-border bg-muted/50 flex flex-col sm:flex-row items-center gap-4">
          <div className="relative w-full max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4 z-10" />
            <Input
              type="text"
              placeholder="Search variants by title, SKU, or color..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setCurrentPage(1)
              }}
              className="pl-9 bg-card"
            />
          </div>

          <select
            value={stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value)
              setCurrentPage(1)
            }}
            className="h-9 w-full sm:w-auto rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none text-muted-foreground cursor-pointer"
          >
            <option value="all">All Stock Levels</option>
            <option value="in">In Stock (&gt;5)</option>
            <option value="low">Low Stock (1-5)</option>
            <option value="out">Out of Stock (0)</option>
          </select>
        </div>

        {/* INVENTORY TABLE */}
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table className="min-w-[1000px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Product &amp; Image</TableHead>
                  <TableHead className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">SKU Code</TableHead>
                  <TableHead className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Attributes</TableHead>
                  <TableHead className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Value / Unit</TableHead>
                  <TableHead className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground">Live Stock</TableHead>
                  <TableHead className="text-[9px] font-semibold uppercase tracking-widest text-muted-foreground text-center">Modify</TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">Syncing Matrix...</p>
                    </TableCell>
                  </TableRow>
                ) : paginatedInventory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center">
                      <Boxes className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
                      <p className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">No variants found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedInventory.map((item) => {
                    const isLow = item.stock <= 5
                    const isEditing = editingId === item.id

                    return (
                      <TableRow
                        key={item.id}
                        className={cn("group", isLow && "bg-rose-50/40 hover:bg-rose-50/80")}
                      >
                        {/* TITLE & IMAGE */}
                        <TableCell className="py-4">
                          <div className="flex items-center gap-4">
                            <div className="w-10 h-12 rounded-md bg-muted border border-border overflow-hidden shrink-0">
                              {item.productImage ? (
                                <img src={item.productImage} alt={item.productName} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-card"><Boxes size={16} /></div>
                              )}
                            </div>
                            <div>
                              <h5 className="font-medium text-foreground text-sm line-clamp-1 max-w-[200px]">
                                {item.productName}
                              </h5>
                              <span className="text-[9px] text-muted-foreground font-semibold uppercase tracking-widest">
                                {item.productCategory}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* SKU */}
                        <TableCell className="py-4">
                          <span className="font-mono text-xs text-muted-foreground font-medium bg-muted px-2 py-1 rounded-md border border-border">
                            {item.sku}
                          </span>
                        </TableCell>

                        {/* ATTRIBUTES */}
                        <TableCell className="py-4">
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                              <span className="w-3 h-3 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: item.color === 'Black' || item.color === 'Obsidian Black' ? '#18181b' : item.color === 'White' || item.color === 'Ivory' ? '#f4f4f5' : item.color }} />
                              {item.color}
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge className="rounded text-[9px] font-semibold tracking-widest">{item.size}</Badge>
                              {item.length && (
                                <Badge variant="secondary" className="rounded text-[9px] font-semibold tracking-widest">{item.length}</Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* PRICE */}
                        <TableCell className="py-4 font-mono text-sm font-semibold text-foreground">
                          {formatBasePrice(item.price)}
                        </TableCell>

                        {/* STOCK LEVEL */}
                        <TableCell className="py-4">
                          {isEditing ? (
                            <div className="flex items-center gap-1 bg-card p-1 rounded-md border border-input shadow-xs w-fit">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setTempStock((p) => Math.max(0, p - 1))}
                                className="w-7 h-7"
                              >
                                <Minus size={12} />
                              </Button>
                              <input
                                type="number"
                                value={tempStock}
                                onChange={(e) => setTempStock(Math.max(0, Number(e.target.value)))}
                                className="w-12 text-center font-semibold text-sm bg-transparent focus:outline-none"
                              />
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                onClick={() => setTempStock((p) => p + 1)}
                                className="w-7 h-7"
                              >
                                <Plus size={12} />
                              </Button>
                            </div>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn(
                                "rounded-md text-xs font-semibold",
                                isLow
                                  ? "bg-rose-100 text-rose-700 border-rose-200"
                                  : "bg-emerald-50 text-emerald-700 border-emerald-200"
                              )}
                            >
                              {item.stock} Units
                            </Badge>
                          )}
                        </TableCell>

                        {/* ACTION CONTROL */}
                        <TableCell className="py-4 text-center">
                          {isEditing ? (
                            <Button
                              size="icon"
                              onClick={() => saveStockChange(item.id)}
                              disabled={saving}
                              className="mx-auto"
                              title="Save Inventory Count"
                            >
                              {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={16} strokeWidth={3} />}
                            </Button>
                          ) : (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => startEditing(item)}
                              className="mx-auto text-muted-foreground"
                              title="Adjust Stock Level"
                            >
                              <Edit2 size={14} />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>

        {/* PAGINATION CONTROLS */}
        {!loading && totalPages > 1 && (
          <div className="flex flex-col sm:flex-row items-center justify-between border-t border-border p-4 gap-4 bg-muted/30">
            <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
              Showing {(currentPage - 1) * itemsPerPage + 1} to {Math.min(currentPage * itemsPerPage, totalVariants)} of {totalVariants} variants
            </p>
            <div className="flex gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
              >
                Prev
              </Button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                  // Basic pagination logic to avoid rendering too many buttons
                  if (
                    page === 1 ||
                    page === totalPages ||
                    (page >= currentPage - 1 && page <= currentPage + 1)
                  ) {
                    return (
                      <Button
                        key={page}
                        variant={currentPage === page ? "default" : "outline"}
                        size="icon"
                        onClick={() => setCurrentPage(page)}
                        className="w-8 h-8"
                      >
                        {page}
                      </Button>
                    )
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="w-8 h-8 flex items-center justify-center text-muted-foreground text-xs">...</span>
                  }
                  return null;
                })}
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
