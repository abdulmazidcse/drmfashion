"use client"

import { useEffect, useState } from "react"
import { Barcode, Loader2, Trash2, CheckCircle, Archive } from "lucide-react"
import api from "@/lib/axios"
import Swal from "sweetalert2"
import { confirmDelete } from "@/lib/confirmDelete"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table"

type SkuRow = {
  id: string
  sku: string
  size: string
  color: string
  length?: string | null
  stock: number
  deletedAt: string | null
  product: { id: string; title: string; productCode?: string | null; thumbnail?: string | null } | null
  _count: {
    orderItems: number
    purchaseItems: number
    cartItems: number
    wishlistItems: number
    inventoryLogs: number
    stockAlerts: number
  }
}

export default function SkuListPage() {
  const [rows, setRows] = useState<SkuRow[]>([])
  const [loading, setLoading] = useState(true)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")

  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)
  const itemsPerPage = 20

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery, statusFilter])

  async function fetchRows() {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(itemsPerPage),
        search: searchQuery,
        status: statusFilter,
      })
      const res = await api.get(`/admin/skus?${params.toString()}`)
      setRows(res.data.data)
      setTotalPages(res.data.meta.totalPages)
      setTotalRecords(res.data.meta.total)
    } catch (error) {
      console.log("Error fetching SKUs:", error)
    } finally {
      setLoading(false)
    }
  }

  // Debounced fetch, matching the products table.
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchRows()
    }, 500)
    return () => clearTimeout(handler)
  }, [currentPage, searchQuery, statusFilter])

  async function handleDelete(row: SkuRow) {
    const ok = await confirmDelete(
      `Permanently delete SKU "${row.sku}"? This cannot be undone.`
    )
    if (!ok) return
    try {
      setDeletingId(row.id)
      const res = await api.delete(`/admin/skus/${row.id}`)
      if (res.data?.message) {
        Swal.fire({ text: res.data.message, confirmButtonColor: "#18181b", icon: "success" })
      }
      fetchRows()
    } catch (error: any) {
      // A 409 names exactly where the SKU is still used.
      Swal.fire({
        text: error.response?.data?.message || "Failed to delete SKU.",
        confirmButtonColor: "#18181b",
        icon: "error",
      })
    } finally {
      setDeletingId(null)
    }
  }

  /** "3 orders · 1 purchase" — why the delete button will refuse. */
  function usageSummary(row: SkuRow) {
    const parts: string[] = []
    if (row._count.orderItems > 0) parts.push(`${row._count.orderItems} order${row._count.orderItems > 1 ? "s" : ""}`)
    if (row._count.purchaseItems > 0) parts.push(`${row._count.purchaseItems} purchase${row._count.purchaseItems > 1 ? "s" : ""}`)
    if (row._count.cartItems > 0) parts.push(`${row._count.cartItems} cart${row._count.cartItems > 1 ? "s" : ""}`)
    if (row._count.wishlistItems > 0) parts.push(`${row._count.wishlistItems} wishlist${row._count.wishlistItems > 1 ? "s" : ""}`)
    return parts.join(" · ")
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
            <Barcode className="w-6 h-6" />
            SKU List
          </h1>
          <p className="text-sm text-muted-foreground">
            Every variant SKU in the catalogue, soft-deleted ones included.
          </p>
        </div>
      </div>

      <Card>
        <CardContent className="p-6 space-y-4">
          {/* FILTER & SEARCH BAR */}
          <div className="flex flex-wrap items-center gap-3 pb-2">
            <div className="relative w-full max-w-[280px]">
              <Input
                type="text"
                placeholder="Search SKU, product, code, color..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none text-muted-foreground cursor-pointer min-w-[140px]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active</option>
              <option value="deleted">Soft deleted</option>
            </select>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-10 h-10 animate-spin text-foreground mb-4" />
              <span className="text-muted-foreground font-medium text-sm">Loading SKUs...</span>
            </div>
          ) : rows.length === 0 ? (
            <div className="text-center py-16 flex flex-col items-center">
              <Barcode className="text-muted-foreground/40 w-16 h-16 mb-4" />
              <h3 className="text-xl font-semibold text-foreground">No SKUs found</h3>
              <p className="text-muted-foreground mt-1 max-w-sm text-sm">
                No SKUs match your search or filter. Try adjusting or clearing them.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="text-muted-foreground text-xs uppercase tracking-widest">
                    <TableHead className="pl-4 font-semibold">SKU</TableHead>
                    <TableHead className="font-semibold">Product Code</TableHead>
                    <TableHead className="font-semibold">Product</TableHead>
                    <TableHead className="font-semibold">Variant</TableHead>
                    <TableHead className="font-semibold">Stock</TableHead>
                    <TableHead className="font-semibold">Status</TableHead>
                    <TableHead className="font-semibold hidden md:table-cell">Used In</TableHead>
                    <TableHead className="font-semibold text-right pr-4">Action</TableHead>
                  </TableRow>
                </TableHeader>

                <TableBody>
                  {rows.map((row) => (
                    <TableRow key={row.id} className="group">
                      <TableCell className="py-3 pl-4 font-mono text-xs font-bold text-foreground whitespace-nowrap">
                        {row.sku}
                      </TableCell>

                      <TableCell className="py-3 font-mono text-xs text-foreground whitespace-nowrap">
                        {row.product?.productCode || <span className="text-muted-foreground">—</span>}
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex items-center gap-3">
                          {row.product?.thumbnail && (
                            <div className="w-9 h-9 rounded-md bg-muted border border-border overflow-hidden shrink-0">
                              <img src={row.product.thumbnail} alt="" className="w-full h-full object-cover" />
                            </div>
                          )}
                          <p className="text-xs font-semibold text-foreground truncate max-w-[220px]">
                            {row.product?.title || "—"}
                          </p>
                        </div>
                      </TableCell>

                      <TableCell className="py-3">
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-[9px] uppercase">{row.size}</Badge>
                          <Badge variant="outline" className="text-[9px] uppercase">{row.color}</Badge>
                          {row.length && (
                            <Badge variant="outline" className="text-[9px] uppercase">{row.length}</Badge>
                          )}
                        </div>
                      </TableCell>

                      <TableCell className="py-3 font-mono text-xs font-semibold">
                        <span className={row.stock > 0 ? "text-emerald-600" : "text-rose-500"}>{row.stock}</span>
                      </TableCell>

                      <TableCell className="py-3">
                        {row.deletedAt ? (
                          <Badge variant="outline" className="text-[9px] uppercase tracking-wider border-amber-200 bg-amber-50 text-amber-600 gap-1">
                            <Archive size={9} />
                            Soft deleted
                          </Badge>
                        ) : (
                          <Badge variant="outline" className="text-[9px] uppercase tracking-wider border-emerald-200 bg-emerald-50 text-emerald-600 gap-1">
                            <CheckCircle size={9} />
                            Active
                          </Badge>
                        )}
                      </TableCell>

                      <TableCell className="py-3 hidden md:table-cell text-[11px] text-muted-foreground">
                        {usageSummary(row) || <span className="italic">Not used</span>}
                      </TableCell>

                      <TableCell className="py-3 text-right pr-4">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(row)}
                          disabled={deletingId === row.id}
                          title="Delete permanently"
                          className="text-muted-foreground hover:text-destructive"
                        >
                          {deletingId === row.id ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : (
                            <Trash2 size={14} />
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-border pt-4 px-2">
              <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
                Showing Page {currentPage} of {totalPages} ({totalRecords} total SKUs)
              </p>
              <div className="flex gap-1.5">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
