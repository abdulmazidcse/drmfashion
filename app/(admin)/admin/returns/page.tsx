"use client"

import { useState, useEffect } from "react"
import { Loader2, RefreshCw, CheckCircle2, XCircle, DollarSign, Clock, CreditCard, PackageCheck, Receipt, type LucideIcon } from "lucide-react"
import Swal from "sweetalert2";
import { useCurrency } from "@/providers/CurrencyProvider"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Checkbox } from "@/components/ui/checkbox"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { cn } from "@/lib/utils"

const STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  APPROVED: "bg-blue-100 text-blue-700 border-blue-200",
  REJECTED: "bg-red-100 text-red-700 border-red-200",
  REFUNDED: "bg-emerald-100 text-emerald-700 border-emerald-200",
}

const STATUS_ICONS: Record<string, LucideIcon> = {
  PENDING: Clock,
  APPROVED: CheckCircle2,
  REJECTED: XCircle,
  REFUNDED: DollarSign,
}

const PAYMENT_STATUS_COLORS: Record<string, string> = {
  PENDING: "bg-yellow-100 text-yellow-700 border-yellow-200",
  PAID: "bg-emerald-100 text-emerald-700 border-emerald-200",
  FAILED: "bg-red-100 text-red-700 border-red-200",
  REFUNDED: "bg-zinc-100 text-zinc-700 border-zinc-200",
}

const PROVIDER_LABELS: Record<string, string> = {
  card: "Card (Stripe)",
  cod: "Cash on Delivery",
  bkash: "bKash",
  nagad: "Nagad",
  square: "Square",
}

interface ReturnItem {
  id: string
  quantity: number
  price: number
  isCustom?: boolean
  variant?: {
    color?: string | null
    size?: string | null
    product?: { title: string; thumbnail?: string | null } | null
  } | null
}

interface ReturnRequest {
  id: string
  orderId: string
  reason: string
  status: string
  adminNote?: string | null
  refundAmount?: number | null
  refundMethod?: string | null
  refundTransactionId?: string | null
  refundedAt?: string | null
  restocked: boolean
  createdAt: string
  user?: { name: string; email: string } | null
  order: {
    id: string
    totalAmount: number
    status: string
    paymentStatus: string
    currencyCode?: string | null
    currencySymbol?: string | null
    exchangeRate?: number | null
    payment?: { provider: string; transactionId?: string | null; amount: number; status: string } | null
    items: ReturnItem[]
  }
}

const canRefundViaStripe = (r: ReturnRequest) =>
  r.order.payment?.provider === "card" && !!r.order.payment?.transactionId?.startsWith("pi_")

const allItemsCustom = (r: ReturnRequest) =>
  r.order.items.length > 0 && r.order.items.every((i) => i.isCustom)

const formatDate = (d: string) =>
  new Date(d).toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" })

export default function AdminReturnsPage() {
  const { formatBasePrice } = useCurrency()

  const [returns, setReturns] = useState<ReturnRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState("ALL")
  const [selected, setSelected] = useState<ReturnRequest | null>(null)
  const [adminNote, setAdminNote] = useState("")
  const [updating, setUpdating] = useState(false)

  // Refund dialog
  const [refundTarget, setRefundTarget] = useState<ReturnRequest | null>(null)
  const [refundAmount, setRefundAmount] = useState("")
  const [refundMethod, setRefundMethod] = useState<"stripe" | "manual">("manual")
  const [restock, setRestock] = useState(true)
  const [refundNote, setRefundNote] = useState("")
  const [refunding, setRefunding] = useState(false)
  const [refundError, setRefundError] = useState("")

  // Same convention as the orders page: amounts are stored in the base currency
  // and displayed in the currency the order was placed in.
  const formatOrderPrice = (r: ReturnRequest | null, basePrice: number) => {
    if (!r) return formatBasePrice(basePrice)
    const symbol = r.order.currencySymbol || "$"
    const rate = r.order.exchangeRate || 1.0
    const converted = basePrice * rate
    const formatted = converted.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${symbol}${formatted}`
  }

  const fetchReturns = async () => {
    setLoading(true)
    try {
      const query = filterStatus !== "ALL" ? `?status=${filterStatus}` : ""
      const res = await fetch(`/api/admin/returns${query}`)
      if (res.ok) setReturns(await res.json())
    } catch { }
    setLoading(false)
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchReturns()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus])

  const handleUpdate = async (id: string, status: string) => {
    setUpdating(true)
    try {
      const res = await fetch("/api/admin/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status, adminNote })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Failed to update")
      setSelected(null)
      setAdminNote("")
      await fetchReturns()
    } catch (err: unknown) {
      Swal.fire({ text: err instanceof Error ? err.message : "Failed to update", confirmButtonColor: "#18181b" })
    } finally {
      setUpdating(false)
    }
  }

  const openRefund = async (r: ReturnRequest) => {
    // Pull the freshest copy so the payment / stock state is current.
    let fresh = r
    try {
      const res = await fetch(`/api/admin/returns/${r.id}`)
      if (res.ok) fresh = await res.json()
    } catch { }
    setRefundTarget(fresh)
    setRefundAmount(fresh.order.totalAmount.toFixed(2))
    setRefundMethod(canRefundViaStripe(fresh) ? "stripe" : "manual")
    setRestock(!allItemsCustom(fresh))
    setRefundNote("")
    setRefundError("")
  }

  const closeRefund = () => {
    if (refunding) return
    setRefundTarget(null)
    setRefundError("")
  }

  const handleRefund = async () => {
    if (!refundTarget) return
    const amount = Number(refundAmount)
    const max = refundTarget.order.totalAmount
    if (!Number.isFinite(amount) || amount <= 0) { setRefundError("Enter a refund amount greater than 0."); return }
    if (amount > max + 0.005) { setRefundError(`Refund amount cannot exceed the order total (${formatOrderPrice(refundTarget, max)}).`); return }

    setRefunding(true)
    setRefundError("")
    try {
      const res = await fetch("/api/admin/returns", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: refundTarget.id,
          status: "REFUNDED",
          adminNote: refundNote || undefined,
          refundAmount: amount,
          refundMethod,
          restock,
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.message || "Failed to process refund")
      setRefundTarget(null)
      Swal.fire({ text: `Refund of ${formatOrderPrice(refundTarget, amount)} issued.`, confirmButtonColor: "#18181b", icon: "success" })
      await fetchReturns()
    } catch (err: unknown) {
      setRefundError(err instanceof Error ? err.message : "Failed to process refund")
    } finally {
      setRefunding(false)
    }
  }

  const counts = {
    ALL: returns.length,
    PENDING: returns.filter(r => r.status === "PENDING").length,
    APPROVED: returns.filter(r => r.status === "APPROVED").length,
    REJECTED: returns.filter(r => r.status === "REJECTED").length,
    REFUNDED: returns.filter(r => r.status === "REFUNDED").length,
  }

  const refundedTotal = returns
    .filter(r => r.status === "REFUNDED")
    .reduce((sum, r) => sum + (r.refundAmount ?? 0), 0)

  const summary = [
    { label: "Total Requests", value: String(counts.ALL), icon: RefreshCw, color: "text-foreground" },
    { label: "Pending", value: String(counts.PENDING), icon: Clock, color: "text-yellow-600" },
    { label: "Approved", value: String(counts.APPROVED), icon: CheckCircle2, color: "text-blue-600" },
    { label: "Refunded", value: String(counts.REFUNDED), icon: DollarSign, color: "text-emerald-600" },
    { label: "Refunded Amount", value: formatBasePrice(refundedTotal), icon: Receipt, color: "text-emerald-600" },
  ]

  const refundMax = refundTarget?.order.totalAmount ?? 0
  const refundAmountNumber = Number(refundAmount)
  const refundAmountValid = Number.isFinite(refundAmountNumber) && refundAmountNumber > 0 && refundAmountNumber <= refundMax + 0.005

  return (
    <div className="max-w-6xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Returns &amp; Refunds</h1>
          <p className="text-sm text-muted-foreground">Review return requests, issue refunds and restock returned items.</p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchReturns}>
          <RefreshCw className="w-4 h-4" /> Refresh
        </Button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {summary.map(s => (
          <Card key={s.label} className="py-0">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-9 h-9 rounded-md bg-muted flex items-center justify-center shrink-0">
                <s.icon className={cn("w-4 h-4", s.color)} />
              </div>
              <div className="min-w-0">
                <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{s.label}</p>
                <p className={cn("text-lg font-semibold truncate", s.color)}>{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 flex-wrap">
        {(["ALL", "PENDING", "APPROVED", "REJECTED", "REFUNDED"] as const).map(s => (
          <Button
            key={s}
            variant={filterStatus === s ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterStatus(s)}
            className="rounded-full"
          >
            {s} ({counts[s as keyof typeof counts]})
          </Button>
        ))}
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
      ) : returns.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          <RefreshCw className="w-12 h-12 mx-auto mb-4 opacity-30" />
          <p className="text-sm uppercase tracking-widest font-semibold">No return requests</p>
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map(r => {
            const Icon = STATUS_ICONS[r.status] || Clock
            const items = r.order.items || []
            const visibleItems = items.slice(0, 4)
            const extraCount = items.length - visibleItems.length
            const provider = r.order.payment?.provider || "cod"
            const canRefund = r.status === "PENDING" || r.status === "APPROVED"
            return (
              <Card key={r.id} className="overflow-hidden py-0 transition-shadow hover:shadow-sm">
                <CardContent className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <Badge className={cn("gap-1 border text-[10px] font-bold uppercase tracking-widest", STATUS_COLORS[r.status])}>
                        <Icon className="w-3 h-3" /> {r.status}
                      </Badge>
                      <span className="text-xs text-muted-foreground font-mono">#{r.orderId.slice(-8).toUpperCase()}</span>
                      <span className="text-xs font-semibold">{formatOrderPrice(r, r.order.totalAmount)}</span>
                    </div>
                    <p className="text-sm font-bold text-foreground">{r.user?.name} <span className="font-normal text-muted-foreground">({r.user?.email})</span></p>
                    <p className="text-xs text-muted-foreground whitespace-pre-line"><span className="font-semibold">Reason:</span> {r.reason}</p>
                    <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                      <span>{formatDate(r.createdAt)}</span>
                      <span className="text-border">|</span>
                      <span className="inline-flex items-center gap-1"><CreditCard className="w-3 h-3" /> {PROVIDER_LABELS[provider] || provider}</span>
                      <Badge variant="outline" className={cn("text-[10px] font-bold uppercase tracking-widest", PAYMENT_STATUS_COLORS[r.order.paymentStatus])}>
                        {r.order.paymentStatus}
                      </Badge>
                    </div>

                    {items.length > 0 && (
                      <div className="flex items-center gap-2 pt-1">
                        {visibleItems.map(item => {
                          const thumb = item.variant?.product?.thumbnail
                          const title = item.variant?.product?.title || "Item"
                          return (
                            <div key={item.id} className="relative w-10 h-10 rounded border border-border bg-muted overflow-hidden shrink-0" title={`${title} × ${item.quantity}`}>
                              {thumb ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={thumb} alt={title} className="w-full h-full object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[10px] text-muted-foreground">N/A</div>
                              )}
                              {item.quantity > 1 && (
                                <span className="absolute bottom-0 right-0 bg-foreground text-background text-[9px] font-bold px-1 rounded-tl">×{item.quantity}</span>
                              )}
                            </div>
                          )
                        })}
                        {extraCount > 0 && (
                          <div className="w-10 h-10 rounded border border-border bg-muted flex items-center justify-center text-xs font-semibold text-muted-foreground shrink-0">
                            +{extraCount}
                          </div>
                        )}
                      </div>
                    )}

                    {r.status === "REFUNDED" && (
                      <div className="flex items-center gap-2 flex-wrap pt-1 text-xs">
                        <span className="font-semibold text-emerald-700">Refunded {formatOrderPrice(r, r.refundAmount ?? 0)}</span>
                        <span className="text-muted-foreground">via {r.refundMethod === "stripe" ? "Stripe" : "Manual"}</span>
                        {r.refundTransactionId && (
                          <span className="font-mono text-muted-foreground">{r.refundTransactionId}</span>
                        )}
                        {r.refundedAt && <span className="text-muted-foreground">on {formatDate(r.refundedAt)}</span>}
                        {r.restocked && (
                          <Badge className="gap-1 border text-[10px] font-bold uppercase tracking-widest bg-emerald-100 text-emerald-700 border-emerald-200">
                            <PackageCheck className="w-3 h-3" /> Restocked
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {(r.status === "PENDING" || canRefund) && (
                    <div className="flex gap-2 shrink-0">
                      {r.status === "PENDING" && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => { setSelected(r); setAdminNote("") }}
                        >
                          Manage
                        </Button>
                      )}
                      {canRefund && (
                        <Button size="sm" onClick={() => openRefund(r)}>
                          <DollarSign className="w-4 h-4" /> Process Refund
                        </Button>
                      )}
                    </div>
                  )}
                </CardContent>

                {r.adminNote && (
                  <div className="px-5 pb-4">
                    <p className="text-xs text-muted-foreground bg-muted/50 border border-border rounded px-3 py-2"><span className="font-bold">Admin Note:</span> {r.adminNote}</p>
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* Manage Modal (Approve / Reject) */}
      <Dialog open={!!selected} onOpenChange={(open) => { if (!open) setSelected(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Manage Return</DialogTitle>
          </DialogHeader>
          {selected && (
            <>
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground"><span className="font-bold">Customer:</span> {selected.user?.name}</p>
                <p className="text-xs text-muted-foreground"><span className="font-bold">Order:</span> #{selected.orderId.slice(-8).toUpperCase()} · {formatOrderPrice(selected, selected.order.totalAmount)}</p>
                <p className="text-xs text-muted-foreground whitespace-pre-line"><span className="font-bold">Reason:</span> {selected.reason}</p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="adminNote">Admin Note (optional)</Label>
                <Textarea
                  id="adminNote"
                  value={adminNote}
                  onChange={e => setAdminNote(e.target.value)}
                  rows={3}
                  placeholder="Reason for approval/rejection, instructions, etc..."
                  className="resize-none"
                />
              </div>

              <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
                <Button size="lg" onClick={() => handleUpdate(selected.id, "APPROVED")} disabled={updating} className="w-full">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />} Approve Return
                </Button>
                <Button variant="destructive" size="lg" onClick={() => handleUpdate(selected.id, "REJECTED")} disabled={updating} className="w-full">
                  {updating ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />} Reject Return
                </Button>
                <Button variant="outline" size="lg" onClick={() => setSelected(null)} className="w-full">
                  Cancel
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Refund Modal */}
      <Dialog open={!!refundTarget} onOpenChange={(open) => { if (!open) closeRefund() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Process Refund</DialogTitle>
          </DialogHeader>
          {refundTarget && (() => {
            const stripeOk = canRefundViaStripe(refundTarget)
            const customOnly = allItemsCustom(refundTarget)
            const provider = refundTarget.order.payment?.provider || "cod"
            return (
              <>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground"><span className="font-bold">Customer:</span> {refundTarget.user?.name} ({refundTarget.user?.email})</p>
                  <p className="text-xs text-muted-foreground"><span className="font-bold">Order:</span> #{refundTarget.orderId.slice(-8).toUpperCase()} · {formatOrderPrice(refundTarget, refundTarget.order.totalAmount)}</p>
                  <p className="text-xs text-muted-foreground"><span className="font-bold">Paid via:</span> {PROVIDER_LABELS[provider] || provider} ({refundTarget.order.paymentStatus})</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refundAmount">Refund Amount ({refundTarget.order.currencyCode || "USD"} base)</Label>
                  <Input
                    id="refundAmount"
                    type="number"
                    min={0.01}
                    max={refundMax}
                    step="0.01"
                    value={refundAmount}
                    onChange={e => { setRefundAmount(e.target.value); setRefundError("") }}
                  />
                  <p className="text-[11px] text-muted-foreground">Maximum {formatOrderPrice(refundTarget, refundMax)} (order total).</p>
                </div>

                <div className="space-y-2">
                  <Label>Refund Method</Label>
                  <Select value={refundMethod} onValueChange={(v) => setRefundMethod(v as "stripe" | "manual")}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select method" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stripe" disabled={!stripeOk}>Stripe (refund to original card)</SelectItem>
                      <SelectItem value="manual">Manual (cash / bank / mobile wallet)</SelectItem>
                    </SelectContent>
                  </Select>
                  {!stripeOk && (
                    <p className="text-[11px] text-muted-foreground">
                      Stripe refunds are only available for card payments with a Stripe PaymentIntent. Record the refund as Manual once it has been paid out.
                    </p>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id="restock"
                      checked={restock}
                      disabled={customOnly}
                      onCheckedChange={(v) => setRestock(v === true)}
                    />
                    <Label htmlFor="restock" className={cn(customOnly && "text-muted-foreground")}>Restock returned items</Label>
                  </div>
                  <p className="text-[11px] text-muted-foreground pl-6">
                    {customOnly
                      ? "All items in this order are made-to-measure and cannot be restocked."
                      : "Adds the returned quantities back to variant stock. Made-to-measure items are skipped."}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="refundNote">Note (optional)</Label>
                  <Textarea
                    id="refundNote"
                    value={refundNote}
                    onChange={e => setRefundNote(e.target.value)}
                    rows={2}
                    placeholder="Reference number, reason for partial refund, etc..."
                    className="resize-none"
                  />
                </div>

                {refundError && (
                  <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded px-3 py-2">{refundError}</p>
                )}

                <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
                  <Button size="lg" onClick={handleRefund} disabled={refunding || !refundAmountValid} className="w-full">
                    {refunding ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />}
                    {refunding ? "Processing..." : `Refund ${refundAmountValid ? formatOrderPrice(refundTarget, refundAmountNumber) : ""}`}
                  </Button>
                  <Button variant="outline" size="lg" onClick={closeRefund} disabled={refunding} className="w-full">
                    Cancel
                  </Button>
                </DialogFooter>
              </>
            )
          })()}
        </DialogContent>
      </Dialog>
    </div>
  )
}
