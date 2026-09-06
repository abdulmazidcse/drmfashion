"use client"

import { useEffect, useState } from "react"
import {
  Package,
  Search,
  Eye,
  Trash2,
  Loader2,
  X,
  CreditCard,
  Calendar,
  TrendingUp,
  RotateCcw,
  DollarSign,
  Filter,
  Truck,
  CheckCircle2,
  AlertCircle,
  Printer,
  Clock,
  ExternalLink
} from "lucide-react"
import api from "@/lib/axios"
import type { DeliveryCarrier } from "@/lib/delivery"
import { useCurrency } from "@/providers/CurrencyProvider"
import Swal from "sweetalert2";
import { confirmDelete } from "@/lib/confirmDelete"
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

type Product = {
  id: string
  title: string
  thumbnail: string
}

type Variant = {
  id: string
  size: string
  color: string
  length: string | null
  product: Product
}

type OrderItem = {
  id: string
  quantity: number
  price: number
  variant: Variant
  isCustom?: boolean
  customFee?: number
  customMeasurements?: {
    templateName: string
    values: { key: string; label: string; value: number; unit: string }[]
    feeBreakdown?: { label: string; amount: number }[]
  } | null
}

type Payment = {
  id: string
  provider: string
  amount: number
  status: string
  transactionId: string | null
  createdAt: string
}

type User = {
  id: string
  name: string
  email: string
  phone: string | null
}

type DeliveryForm = { carrier: string; trackingNumber: string; estimatedDeliveryAt: string }

/** ISO → local `YYYY-MM-DD` for a `<input type="date">`. */
function toDateInput(value: string | null | undefined) {
  if (!value) return ""
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return ""
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

function formatDeliveryDate(value: string | null | undefined) {
  return value ? new Date(value).toLocaleDateString("en-US", { dateStyle: "medium" }) : "—"
}

type Order = {
  id: string
  userId: string
  user: User
  totalAmount: number
  status: "PENDING" | "PROCESSING" | "SHIPPED" | "DELIVERED" | "CANCELLED"
  paymentStatus: "PENDING" | "PAID" | "FAILED" | "REFUNDED"
  shippingAddress: string
  shippingPhone: string
  shippingCarrier?: string | null
  shippingMethod?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  estimatedDeliveryAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
  deliveryNote?: string | null
  currencyCode?: string
  currencySymbol?: string
  exchangeRate?: number
  items: OrderItem[]
  payment?: Payment | null
  createdAt: string
  updatedAt: string
}

export default function AdminOrdersPage() {
  const { formatPrice: globalFormatPrice, formatBasePrice, selectedCurrency, convertPrice } = useCurrency()

  const formatOrderPrice = (ord: Order | null, usdPrice: number) => {
    if (!ord) return globalFormatPrice(usdPrice)
    const symbol = ord.currencySymbol || "$"
    const rate = ord.exchangeRate || 1.0
    const converted = usdPrice * rate
    const formatted = converted.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${symbol}${formatted}`
  }
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  
  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("")
  const [statusFilter, setStatusFilter] = useState<string>("ALL")
  const [paymentFilter, setPaymentFilter] = useState<string>("ALL")
  
  // Mutating loading state
  const [updatingId, setUpdatingId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalRecords, setTotalRecords] = useState(0)

  // Delivery mini-form in the drawer
  const [carriers, setCarriers] = useState<DeliveryCarrier[]>([])
  // Captured once so the "overdue" check keeps the render pure.
  const [now] = useState(() => Date.now())
  // The admin's unsaved edits, tagged with the order they belong to. When a
  // different order is opened the draft no longer matches and the form falls
  // back to that order's stored values — no effect needed to reset it.
  const [deliveryDraft, setDeliveryDraft] = useState<(DeliveryForm & { orderId: string }) | null>(null)
  const deliveryForm: DeliveryForm =
    selectedOrder && deliveryDraft?.orderId === selectedOrder.id
      ? deliveryDraft
      : {
          carrier: selectedOrder?.shippingCarrier || "",
          trackingNumber: selectedOrder?.trackingNumber || "",
          estimatedDeliveryAt: toDateInput(selectedOrder?.estimatedDeliveryAt),
        }
  const patchDeliveryForm = (patch: Partial<DeliveryForm>) => {
    if (!selectedOrder) return
    setDeliveryDraft({ ...deliveryForm, ...patch, orderId: selectedOrder.id })
  }

  useEffect(() => {
    api.get("/admin/deliveries/carriers")
      .then((res) => setCarriers(Array.isArray(res.data) ? res.data : []))
      .catch((error) => console.error("Failed to fetch carriers:", error))
  }, [])

  async function fetchOrders() {
    try {
      setLoading(true)
      const res = await api.get(`/admin/orders?page=${page}&limit=20&search=${searchQuery}&status=${statusFilter}&paymentStatus=${paymentFilter}`)
      const fetchedOrders = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      setOrders(fetchedOrders)
      if (res.data.meta) {
        setTotalPages(res.data.meta.totalPages)
        setTotalRecords(res.data.meta.total)
      }
    } catch (error) {
      console.error("Failed to fetch orders:", error)
    } finally {
      setLoading(false)
    }
  }

  // Debounced fetch
  useEffect(() => {
    const handler = setTimeout(() => {
      fetchOrders()
    }, 500)
    return () => clearTimeout(handler)
  }, [page, searchQuery, statusFilter, paymentFilter])

  // Reset page
  useEffect(() => {
    setPage(1)
  }, [searchQuery, statusFilter, paymentFilter])

  // Sync selected order detailed view when list changes
  useEffect(() => {
    if (selectedOrder) {
      const updated = orders.find(o => o.id === selectedOrder.id)
      if (updated) {
        setSelectedOrder(updated)
      }
    }
  }, [orders])

  async function handleUpdateStatus(
    orderId: string,
    payload: {
      status?: string
      paymentStatus?: string
      shippingCarrier?: string | null
      trackingNumber?: string | null
      estimatedDeliveryAt?: string | null
    }
  ) {
    try {
      setUpdatingId(orderId)
      await api.patch(`/admin/orders/${orderId}`, payload)
      // Refresh list
      const res = await api.get("/admin/orders")
      const updatedOrders = Array.isArray(res.data.data) ? res.data.data : Array.isArray(res.data) ? res.data : []
      setOrders(updatedOrders)
    } catch (error) {
      Swal.fire({ text: "Failed to update status details.", confirmButtonColor: "#18181b", icon: "error" })
      console.error(error)
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleDeleteOrder(orderId: string) {
    if (!(await confirmDelete("Are you sure you want to permanently delete this order? This will remove all items and payment records."))) return
    try {
      setDeletingId(orderId)
      await api.delete(`/admin/orders/${orderId}`)
      setSelectedOrder(null)
      fetchOrders()
    } catch (error) {
      Swal.fire({ text: "Failed to delete order due to database constraints.", confirmButtonColor: "#18181b", icon: "error" })
      console.error(error)
    } finally {
      setDeletingId(null)
    }
  }

  // Filter logic handled by server

  // Calculations for stats
  const totalOrders = orders.length
  const totalRevenue = orders
    .filter(o => o.paymentStatus === "PAID" || o.status === "DELIVERED")
    .reduce((sum, o) => sum + o.totalAmount, 0)
  const pendingOrders = orders.filter(o => o.status === "PENDING" || o.status === "PROCESSING").length
  const completedOrders = orders.filter(o => o.status === "DELIVERED").length

  // Status badging styles
  const getStatusBadge = (status: Order["status"]) => {
    const styles = {
      PENDING: "bg-amber-50 text-amber-700 border-amber-200/60",
      PROCESSING: "bg-indigo-50 text-indigo-700 border-indigo-200/60",
      SHIPPED: "bg-sky-50 text-sky-700 border-sky-200/60",
      DELIVERED: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      CANCELLED: "bg-rose-50 text-rose-700 border-rose-200/60"
    }
    return styles[status] || "bg-zinc-50 text-zinc-650"
  }

  const getPaymentStatusBadge = (status: Order["paymentStatus"]) => {
    const styles = {
      PENDING: "bg-zinc-100 text-zinc-600 border-zinc-200",
      PAID: "bg-emerald-50 text-emerald-700 border-emerald-200/60",
      FAILED: "bg-rose-50 text-rose-750 border-rose-200/60",
      REFUNDED: "bg-purple-50 text-purple-700 border-purple-200/60"
    }
    return styles[status] || "bg-zinc-50 text-zinc-650"
  }

  return (
    <>
      {/* SIDE SHEET DETAIL PANEL */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition duration-300">
          <div className="bg-card w-full max-w-lg h-full shadow-2xl flex flex-col relative animate-in slide-in-from-right duration-350">
            {/* Modal Header */}
            <div className="p-5 border-b border-border flex items-center justify-between bg-primary text-primary-foreground">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-primary-foreground/10 rounded-lg">
                  <Package size={15} />
                </div>
                <div>
                  <h3 className="text-xs font-semibold tracking-widest uppercase">Order Details</h3>
                  <p className="text-[10px] font-mono text-primary-foreground/60 mt-0.5">#{selectedOrder.id}</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setSelectedOrder(null)}
                className="text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10"
              >
                <X size={18} />
              </Button>
            </div>

            {/* Modal Content Scrollable */}
            <div className="flex-1 overflow-y-auto p-5 space-y-6">
              {/* STAGE & STATUS CONTROLS */}
              <div className="bg-muted/50 rounded-xl p-4.5 border border-border space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">Manage Statuses</span>
                  {updatingId === selectedOrder.id && <Loader2 className="w-4 h-4 animate-spin text-foreground" />}
                </div>

                <div className="grid grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">Order Pipeline</label>
                    <select
                      value={selectedOrder.status}
                      onChange={(e) => handleUpdateStatus(selectedOrder.id, { status: e.target.value })}
                      disabled={updatingId !== null}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="PROCESSING">PROCESSING</option>
                      <option value="SHIPPED">SHIPPED</option>
                      <option value="DELIVERED">DELIVERED</option>
                      <option value="CANCELLED">CANCELLED</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">Payment Status</label>
                    <select
                      value={selectedOrder.paymentStatus}
                      onChange={(e) => handleUpdateStatus(selectedOrder.id, { paymentStatus: e.target.value })}
                      disabled={updatingId !== null}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                    >
                      <option value="PENDING">PENDING</option>
                      <option value="PAID">PAID</option>
                      <option value="FAILED">FAILED</option>
                      <option value="REFUNDED">REFUNDED</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* DELIVERY */}
              <div className="bg-muted/50 rounded-xl p-4.5 border border-border space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-1.5">
                    <Truck className="w-3.5 h-3.5" /> Delivery
                  </span>
                  {selectedOrder.status === "SHIPPED" && selectedOrder.estimatedDeliveryAt && new Date(selectedOrder.estimatedDeliveryAt).getTime() < now && (
                    <span className="text-[8px] font-extrabold uppercase tracking-widest text-rose-600 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" /> Overdue
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
                  <div>
                    <span className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Carrier</span>
                    <span className="font-semibold text-foreground">{selectedOrder.shippingCarrier || "—"}</span>
                    {selectedOrder.shippingMethod && (
                      <span className="block text-[10px] text-muted-foreground">{selectedOrder.shippingMethod}</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Tracking</span>
                    {selectedOrder.trackingNumber ? (
                      selectedOrder.trackingUrl ? (
                        <a
                          href={selectedOrder.trackingUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-mono font-semibold text-foreground underline underline-offset-2 break-all"
                        >
                          {selectedOrder.trackingNumber} <ExternalLink className="w-3 h-3 shrink-0" />
                        </a>
                      ) : (
                        <span className="font-mono font-semibold text-foreground break-all">{selectedOrder.trackingNumber}</span>
                      )
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </div>
                  <div>
                    <span className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Est. Delivery</span>
                    <span className="font-mono text-muted-foreground">{formatDeliveryDate(selectedOrder.estimatedDeliveryAt)}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Shipped / Delivered</span>
                    <span className="font-mono text-muted-foreground">
                      {formatDeliveryDate(selectedOrder.shippedAt)} / {formatDeliveryDate(selectedOrder.deliveredAt)}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3.5 pt-3 border-t border-border">
                  <div>
                    <label className="block text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">Carrier</label>
                    <select
                      value={deliveryForm.carrier}
                      onChange={(e) => patchDeliveryForm({ carrier: e.target.value })}
                      disabled={updatingId !== null}
                      className="w-full h-9 rounded-md border border-input bg-transparent px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring/50 outline-none"
                    >
                      <option value="">— None —</option>
                      {carriers.filter((c) => c.active).map((c) => (
                        <option key={c.id} value={c.name}>{c.name}</option>
                      ))}
                      {deliveryForm.carrier && !carriers.some((c) => c.active && c.name === deliveryForm.carrier) && (
                        <option value={deliveryForm.carrier}>{deliveryForm.carrier}</option>
                      )}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">Tracking Number</label>
                    <Input
                      value={deliveryForm.trackingNumber}
                      onChange={(e) => patchDeliveryForm({ trackingNumber: e.target.value })}
                      disabled={updatingId !== null}
                      placeholder="Tracking #"
                      className="h-9 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-[8px] font-extrabold uppercase tracking-widest text-muted-foreground mb-1">Est. Delivery</label>
                    <Input
                      type="date"
                      value={deliveryForm.estimatedDeliveryAt}
                      onChange={(e) => patchDeliveryForm({ estimatedDeliveryAt: e.target.value })}
                      disabled={updatingId !== null}
                      className="h-9"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button
                      size="sm"
                      className="w-full h-9"
                      disabled={updatingId !== null}
                      onClick={() => handleUpdateStatus(selectedOrder.id, {
                        shippingCarrier: deliveryForm.carrier || null,
                        trackingNumber: deliveryForm.trackingNumber.trim() || null,
                        estimatedDeliveryAt: deliveryForm.estimatedDeliveryAt
                          ? new Date(`${deliveryForm.estimatedDeliveryAt}T00:00:00`).toISOString()
                          : null,
                      })}
                    >
                      <Truck size={14} /> Save delivery
                    </Button>
                  </div>
                </div>
              </div>

              {/* CUSTOMER & SHIPPING SUMMARY */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-foreground border-b border-border pb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-muted-foreground" /> Customer Information
                </h4>

                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Name</span>
                    <span className="font-semibold text-foreground">{selectedOrder.user.name}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Email</span>
                    <span className="font-medium text-muted-foreground truncate block">{selectedOrder.user.email}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Phone</span>
                    <span className="font-medium text-foreground">{selectedOrder.shippingPhone}</span>
                  </div>
                  <div>
                    <span className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest">Order Placed</span>
                    <span className="font-mono text-muted-foreground">{new Date(selectedOrder.createdAt).toLocaleDateString("en-US", { dateStyle: "medium" })}</span>
                  </div>
                </div>

                <div className="bg-muted/50 border border-border rounded-lg p-3 mt-2">
                  <span className="block text-[8px] font-extrabold text-muted-foreground uppercase tracking-widest mb-1">Full Shipping Destination</span>
                  <p className="text-xs font-medium text-foreground leading-relaxed">{selectedOrder.shippingAddress}</p>
                </div>
              </div>

              {/* ORDERED ITEMS breakdown */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-semibold uppercase tracking-widest text-foreground border-b border-border pb-1.5 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5 text-muted-foreground" /> Products Purchased ({selectedOrder.items.length})
                </h4>

                <div className="divide-y divide-border">
                  {selectedOrder.items.map((item) => (
                    <div key={item.id} className="py-3 flex gap-3.5 items-center">
                      <img
                        src={item.variant.product.thumbnail}
                        alt={item.variant.product.title}
                        className="w-11 h-14 object-cover rounded bg-muted border border-border shrink-0"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-foreground truncate uppercase tracking-wide">
                          {item.variant.product.title}
                        </p>
                        <p className="text-[9px] text-muted-foreground mt-0.5 font-medium">
                          Color: {item.variant.color} · Size: {item.variant.size} {item.variant.length ? `· Length: ${item.variant.length}` : ""}
                        </p>
                        <p className="text-[9px] font-medium text-muted-foreground mt-0.5">
                          Qty: {item.quantity} × {formatOrderPrice(selectedOrder, item.price)}
                        </p>

                        {item.isCustom && item.customMeasurements && (
                          <div className="mt-1.5 border-l-2 border-foreground/70 pl-2">
                            <p className="text-[9px] font-bold uppercase tracking-widest text-foreground">
                              Made to measure · {item.customMeasurements.templateName}
                              {(item.customFee ?? 0) > 0 && (
                                <span className="ml-1 font-medium text-muted-foreground">
                                  (+{formatOrderPrice(selectedOrder, item.customFee ?? 0)}/item)
                                </span>
                              )}
                            </p>
                            {(item.customMeasurements.feeBreakdown?.length ?? 0) > 1 && (
                              <p className="text-[9px] text-muted-foreground">
                                {item.customMeasurements.feeBreakdown!
                                  .map((line) => `${line.label} +${formatOrderPrice(selectedOrder, line.amount)}`)
                                  .join(" · ")}
                              </p>
                            )}
                            <div className="mt-1 grid grid-cols-2 gap-x-3 gap-y-0.5">
                              {item.customMeasurements.values.map((v) => (
                                <p key={v.key} className="text-[9px] text-muted-foreground">
                                  <span className="font-semibold text-foreground">{v.label}:</span> {v.value}
                                  {v.unit}
                                </p>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      <div className="text-right shrink-0">
                        <span className="text-xs font-semibold text-foreground font-mono">
                          {formatOrderPrice(selectedOrder, item.price * item.quantity)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border pt-3 flex justify-between items-baseline">
                  <span className="text-[10px] font-semibold uppercase tracking-widest text-foreground">Grand Total</span>
                  <span className="text-base font-semibold text-foreground font-mono">
                    {formatOrderPrice(selectedOrder, selectedOrder.totalAmount)}
                  </span>
                </div>
              </div>

              {/* PAYMENT TRANSACTION METHOD FEED */}
              {selectedOrder.payment && (
                <div className="bg-muted/50 rounded-xl p-4 border border-border space-y-2">
                  <span className="block text-[8px] font-semibold uppercase tracking-widest text-muted-foreground">Transaction details</span>
                  <div className="grid grid-cols-2 gap-2 text-[10px] font-medium text-muted-foreground">
                    <div>Payment Method: <span className="font-semibold text-foreground uppercase">{selectedOrder.payment.provider}</span></div>
                    <div>Transaction ID: <span className="font-mono text-foreground">{selectedOrder.payment.transactionId || "N/A"}</span></div>
                    <div>Amount Paid: <span className="font-semibold text-foreground">{formatOrderPrice(selectedOrder, selectedOrder.payment.amount)}</span></div>
                    <div>Payment Date: <span className="font-mono text-foreground">{new Date(selectedOrder.payment.createdAt).toLocaleDateString()}</span></div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-border flex gap-3.5 bg-muted/50 shrink-0">
              <Button asChild variant="outline" size="lg" className="flex-1">
                <a
                  href={`/admin/orders/${selectedOrder.id}/invoice`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Printer size={14} /> Download PDF
                </a>
              </Button>
              {/* <Button
                variant="destructive"
                size="lg"
                onClick={() => handleDeleteOrder(selectedOrder.id)}
                disabled={deletingId !== null}
                className="flex-1"
              >
                {deletingId === selectedOrder.id ? (
                  <Loader2 size={14} className="animate-spin" />
                ) : (
                  <Trash2 size={14} />
                )}
                Delete Order
              </Button> */}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6 max-w-7xl mx-auto p-2">
        {/* VIEW TITLE HEADER */}
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-primary text-primary-foreground rounded-xl">
            <Package size={20} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Order Registry
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              Manage client acquisitions, shipping pipeline, and retail checkouts.
            </p>
          </div>
        </div>

        {/* METRICS GRID SUMMARY */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="p-4.5 gap-0 flex flex-col justify-between">
            <div className="flex justify-between items-center text-muted-foreground">
              <Package size={16} />
              <span className="text-[7.5px] font-extrabold text-muted-foreground uppercase tracking-widest">Total Orders</span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-semibold text-foreground tracking-tight font-mono">{totalOrders}</h3>
              <p className="text-[8px] text-muted-foreground font-bold uppercase mt-0.5">Submissions</p>
            </div>
          </Card>

          <Card className="p-4.5 gap-0 flex flex-col justify-between">
            <div className="flex justify-between items-center text-emerald-600">
              <DollarSign size={16} />
              <span className="text-[7.5px] font-extrabold text-muted-foreground uppercase tracking-widest">Paid Revenues</span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-semibold text-foreground tracking-tight font-mono">{formatBasePrice(totalRevenue)}</h3>
              <p className="text-[8px] text-emerald-600 font-bold uppercase mt-0.5">Total pipeline revenue</p>
            </div>
          </Card>

          <Card className="p-4.5 gap-0 flex flex-col justify-between">
            <div className="flex justify-between items-center text-amber-500">
              <Clock size={16} />
              <span className="text-[7.5px] font-extrabold text-muted-foreground uppercase tracking-widest">In Processing</span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-semibold text-foreground tracking-tight font-mono">{pendingOrders}</h3>
              <p className="text-[8px] text-amber-600 font-bold uppercase mt-0.5">Awaiting dispatch</p>
            </div>
          </Card>

          <Card className="p-4.5 gap-0 flex flex-col justify-between">
            <div className="flex justify-between items-center text-muted-foreground">
              <CheckCircle2 size={16} />
              <span className="text-[7.5px] font-extrabold text-muted-foreground uppercase tracking-widest">Fulfilled</span>
            </div>
            <div className="mt-2.5">
              <h3 className="text-xl font-semibold text-foreground tracking-tight font-mono">{completedOrders}</h3>
              <p className="text-[8px] text-muted-foreground font-bold uppercase mt-0.5">Delivered to client</p>
            </div>
          </Card>
        </div>

        {/* SEARCH AND FILTERS BAR */}
        <Card className="p-4.5">
          <div className="flex flex-col md:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
              <Input
                type="text"
                placeholder="Search by Order ID, Client Name, Email, or Phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            {/* Filter selectors */}
            <div className="flex gap-2 shrink-0">
              <div className="flex items-center gap-1.5 rounded-md border border-input bg-transparent px-3 shadow-xs">
                <Filter className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-foreground focus:outline-none appearance-none cursor-pointer pr-1"
                >
                  <option value="ALL">ALL PIPELINE</option>
                  <option value="PENDING">PENDING</option>
                  <option value="PROCESSING">PROCESSING</option>
                  <option value="SHIPPED">SHIPPED</option>
                  <option value="DELIVERED">DELIVERED</option>
                  <option value="CANCELLED">CANCELLED</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 rounded-md border border-input bg-transparent px-3 shadow-xs">
                <CreditCard className="w-3.5 h-3.5 text-muted-foreground" />
                <select
                  value={paymentFilter}
                  onChange={(e) => setPaymentFilter(e.target.value)}
                  className="bg-transparent text-xs font-medium text-foreground focus:outline-none appearance-none cursor-pointer pr-1"
                >
                  <option value="ALL">ALL PAYMENT</option>
                  <option value="PENDING">PENDING</option>
                  <option value="PAID">PAID</option>
                  <option value="FAILED">FAILED</option>
                  <option value="REFUNDED">REFUNDED</option>
                </select>
              </div>

              <Button
                variant="outline"
                size="icon"
                onClick={() => {
                  setSearchQuery("")
                  setStatusFilter("ALL")
                  setPaymentFilter("ALL")
                }}
                title="Reset Filters"
              >
                <RotateCcw size={13} />
              </Button>
            </div>
          </div>
        </Card>

        {/* REGISTRY TABLE CONTAINER */}
        <Card className="p-0 overflow-hidden">
          <CardContent className="p-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-muted-foreground mb-3" />
              <span className="text-muted-foreground text-xs font-medium">Retrieving client transactions...</span>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-20 flex flex-col items-center justify-center">
              <div className="w-12 h-12 rounded-2xl bg-muted border border-border flex items-center justify-center mb-3">
                <Package className="text-muted-foreground w-5 h-5" />
              </div>
              <h3 className="text-sm font-semibold text-foreground">No matching orders</h3>
              <p className="text-muted-foreground mt-1 text-xs max-w-xs leading-relaxed">
                We couldn't find any orders that match the selected search parameters or filters.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="bg-muted/50 text-[8.5px] font-black uppercase tracking-widest text-muted-foreground">
                    <TableHead className="text-muted-foreground">ID</TableHead>
                    <TableHead className="text-muted-foreground">Client Detail</TableHead>
                    <TableHead className="text-muted-foreground">Order Date</TableHead>
                    <TableHead className="text-muted-foreground">Items</TableHead>
                    <TableHead className="text-muted-foreground">Total Amount</TableHead>
                    <TableHead className="text-muted-foreground">Order Status</TableHead>
                    <TableHead className="text-muted-foreground">Payment</TableHead>
                    <TableHead className="text-right text-muted-foreground">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="text-xs">
                  {orders.map((order) => {
                    const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0)
                    return (
                      <TableRow
                        key={order.id}
                        className="group cursor-pointer"
                        onClick={() => setSelectedOrder(order)}
                      >
                        {/* ID */}
                        <TableCell className="font-mono text-[10px] font-medium text-muted-foreground">
                          #{order.id.slice(0, 10)}...
                        </TableCell>

                        {/* Customer details */}
                        <TableCell>
                          <div className="font-semibold text-foreground">{order.user.name}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{order.user.email}</div>
                          <div className="text-[10px] text-muted-foreground mt-0.5">{order.shippingPhone}</div>
                        </TableCell>

                        {/* Created At */}
                        <TableCell className="text-muted-foreground font-medium">
                          {new Date(order.createdAt).toLocaleDateString("en-US", {
                            dateStyle: "medium"
                          })}
                        </TableCell>

                        {/* Items count */}
                        <TableCell className="font-medium text-muted-foreground">
                          {itemCount} {itemCount === 1 ? "Item" : "Items"}
                        </TableCell>

                        {/* Total Amount */}
                        <TableCell className="font-semibold text-foreground font-mono">
                          {formatOrderPrice(order, order.totalAmount)}
                        </TableCell>

                        {/* Order Status */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <select
                            value={order.status}
                            onChange={(e) => handleUpdateStatus(order.id, { status: e.target.value })}
                            disabled={updatingId !== null}
                            className={cn("border text-[9px] font-extrabold px-2 py-1 rounded-full focus:outline-none uppercase tracking-wider cursor-pointer", getStatusBadge(order.status))}
                          >
                            <option value="PENDING">PENDING</option>
                            <option value="PROCESSING">PROCESSING</option>
                            <option value="SHIPPED">SHIPPED</option>
                            <option value="DELIVERED">DELIVERED</option>
                            <option value="CANCELLED">CANCELLED</option>
                          </select>
                        </TableCell>

                        {/* Payment Details */}
                        <TableCell onClick={(e) => e.stopPropagation()}>
                          <div className="flex flex-col gap-1 items-start">
                            <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-widest", getPaymentStatusBadge(order.paymentStatus))}>
                              {order.paymentStatus}
                            </Badge>
                            <span className="text-[8.5px] font-extrabold text-muted-foreground uppercase tracking-widest font-sans pl-0.5">
                              {order.payment?.provider || "COD"}
                            </span>
                          </div>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedOrder(order)}
                              title="Details"
                            >
                              <Eye size={14} />
                            </Button>
                            {/* <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleDeleteOrder(order.id)}
                              disabled={deletingId === order.id}
                              className="text-muted-foreground hover:text-destructive"
                              title="Delete"
                            >
                              {deletingId === order.id ? (
                                <Loader2 size={14} className="animate-spin" />
                              ) : (
                                <Trash2 size={14} />
                              )}
                            </Button> */}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          )}
          </CardContent>
        </Card>

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="flex justify-between items-center mt-6">
            <span className="text-xs text-muted-foreground font-medium">
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
      </div>
    </>
  )
}