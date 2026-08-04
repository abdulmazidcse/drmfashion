"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import {
  FileText,
  Plus,
  Loader2,
  CheckCircle2,
  Package,
  Clock,
  TrendingUp
} from "lucide-react"
import api from "@/lib/axios"
import { useCurrency } from "@/providers/CurrencyProvider"
import Swal from "sweetalert2";
import { Button } from "@/components/ui/button"
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

export default function PurchasesPage() {
  const { formatBasePrice } = useCurrency()
  const [purchases, setPurchases] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processingId, setProcessingId] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  async function fetchPurchases() {
    try {
      setLoading(true)
      const res = await api.get(`/admin/purchases?page=${page}&limit=20`)
      setPurchases(res.data.data || res.data)
      if (res.data.meta) {
        setTotalPages(res.data.meta.totalPages)
        setTotalRecords(res.data.meta.total)
      }
    } catch (error) {
      console.error("Failed to load purchases", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPurchases()
  }, [page])

  async function markAsReceived(id: string) {
    if (!(await Swal.fire({ title: "Are you sure?", text: "Are you sure you want to mark this Purchase Order as received? This will permanently add the items to your live inventory stock.", icon: "warning", showCancelButton: true, confirmButtonColor: "#18181b", cancelButtonColor: "#ef4444", confirmButtonText: "Yes" })).isConfirmed) return

    try {
      setProcessingId(id)
      await api.post(`/admin/purchases/${id}/receive`)
      await fetchPurchases() // Refresh list
    } catch (error) {
      console.error("Failed to receive PO", error)
      Swal.fire({ text: "Failed to process purchase order.", confirmButtonColor: "#18181b", icon: "error" })
    } finally {
      setProcessingId(null)
    }
  }

  // Summary Metrics
  const activePOs = purchases.filter(p => p.status !== 'RECEIVED' && p.status !== 'CANCELLED')
  const totalSpent = purchases.reduce((sum, p) => sum + p.totalCost, 0)
  const totalItemsReceived = purchases.filter(p => p.status === 'RECEIVED').reduce((sum, p) => sum + p.items.reduce((s: number, i: any) => s + i.quantity, 0), 0)

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-2">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-3 bg-primary text-primary-foreground rounded-xl">
              <FileText size={24} />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Purchase Orders
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-2 max-w-md">
            Manage incoming stock from your suppliers, track purchase orders, and automatically replenish inventory.
          </p>
        </div>

        <Button asChild size="lg" className="shrink-0">
          <Link href="/admin/purchases/create">
            <Plus className="w-4 h-4" />
            Create New P.O.
          </Link>
        </Button>
      </div>

      {/* METRICS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Active Orders</p>
              <h3 className="text-2xl font-semibold">{activePOs.length}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
              <TrendingUp className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Expenditure</p>
              <h3 className="text-2xl font-semibold">{formatBasePrice(totalSpent)}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
              <Package className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Total Units Received</p>
              <h3 className="text-2xl font-semibold">{totalItemsReceived}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* LIST */}
      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50">
                  <TableHead>Order ID / Date</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Items Summary</TableHead>
                  <TableHead>Total Cost</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center">
                      <Loader2 className="w-8 h-8 animate-spin text-muted-foreground/40 mx-auto mb-3" />
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Loading Orders...</p>
                    </TableCell>
                  </TableRow>
                ) : purchases.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-20 text-center">
                      <FileText className="w-8 h-8 text-muted-foreground/30 mx-auto mb-3" />
                      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">No Purchase Orders Found</p>
                    </TableCell>
                  </TableRow>
                ) : (
                  purchases.map(po => {
                    const isReceived = po.status === 'RECEIVED'
                    const totalUnits = po.items.reduce((s: number, i: any) => s + i.quantity, 0)

                    return (
                      <TableRow key={po.id}>
                        <TableCell>
                          <div className="font-mono text-xs font-semibold text-foreground mb-1">
                            #{po.id.slice(-6).toUpperCase()}
                          </div>
                          <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                            {new Date(po.createdAt).toLocaleDateString()}
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="text-sm font-medium text-foreground">{po.supplier.name}</div>
                          {po.supplier.email && <div className="text-[10px] text-muted-foreground">{po.supplier.email}</div>}
                        </TableCell>

                        <TableCell>
                          <div className="text-xs font-medium text-foreground">
                            {po.items.length} unique variants
                          </div>
                          <div className="text-[10px] text-muted-foreground font-medium uppercase mt-0.5">
                            {totalUnits} Total Units
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-sm font-semibold text-foreground">
                          {formatBasePrice(po.totalCost)}
                        </TableCell>

                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              isReceived
                                ? 'bg-emerald-50 text-emerald-600 border-emerald-200'
                                : 'bg-amber-50 text-amber-600 border-amber-200'
                            }
                          >
                            {po.status}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-right">
                          {!isReceived && (
                            <Button
                              size="sm"
                              onClick={() => markAsReceived(po.id)}
                              disabled={processingId === po.id}
                            >
                              {processingId === po.id ? (
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                              ) : (
                                <CheckCircle2 className="w-3.5 h-3.5" />
                              )}
                              Receive Stock
                            </Button>
                          )}

                          {isReceived && (
                            <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-600 uppercase tracking-wider bg-emerald-50 px-3 py-2 rounded-md">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Added to Inventory
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })
                )}
              </TableBody>
            </Table>
          </div>

          {/* PAGINATION */}
          {totalPages > 1 && (
            <div className="flex justify-between items-center p-4 border-t border-border">
              <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
                Showing page {page} of {totalPages} ({totalRecords} total)
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
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
