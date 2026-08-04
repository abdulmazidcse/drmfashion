"use client"

import { Suspense, useCallback, useEffect, useRef, useState } from "react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"
import { AlertCircle, ArrowLeft, CheckCircle, MapPin, Package, Search } from "lucide-react"
import Header from "@/components/HeaderClient"
import Footer from "@/components/Footer"

// ─── Types ────────────────────────────────────────────────────────────────────

type TrackedItem = {
  id: string; quantity: number; price: number
  productTitle: string; thumbnail: string
  color: string; size: string; length: string | null
}

type TrackedOrder = {
  id: string; number: string; totalAmount: number; status: string
  paymentStatus: string; shippingAddress: string; shippingPhone: string
  currencyCode?: string; currencySymbol?: string; exchangeRate?: number
  createdAt: string; updatedAt: string; items: TrackedItem[]
}

type OrderSummary = {
  id: string; number: string; status: string; totalAmount: number
  currencySymbol?: string; exchangeRate?: number
  createdAt: string; itemCount: number
}

type Stage = { key: string; label: string; desc: string; completed: boolean; active: boolean }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatOrderPrice(ord: { currencySymbol?: string; exchangeRate?: number } | null | undefined, usdPrice: number) {
  const symbol = ord?.currencySymbol || "$"
  const rate = ord?.exchangeRate || 1.0
  return `${symbol}${(usdPrice * rate).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

/** A phone is 9+ digits; the order number is the 8-character code from the email. */
function looksLikePhone(value: string) {
  const trimmed = value.trim()
  if (trimmed.startsWith("+")) return true
  return /^[\d\s()+-]+$/.test(trimmed) && trimmed.replace(/\D/g, "").length >= 9
}

type LookupResult =
  | { matchedBy: "phone"; orders: OrderSummary[] }
  | { matchedBy: "orderId"; order: TrackedOrder; stages: Stage[] }

/** Calls the public tracking endpoint; throws with the API's own message when nothing matches. */
async function lookup(param: "orderId" | "phone", value: string): Promise<LookupResult> {
  const res = await fetch(`/api/customer/track?${param}=${encodeURIComponent(value)}`)
  const data = await res.json()
  if (!res.ok || !data.found) throw new Error(data.message || data.error || "Order not found.")
  return data as LookupResult
}

const STATUS_STYLES: Record<string, string> = {
  DELIVERED: "bg-emerald-50 text-emerald-600 border-emerald-100",
  SHIPPED: "bg-blue-50 text-blue-600 border-blue-100",
  CANCELLED: "bg-red-50 text-red-600 border-red-100",
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function TrackOrderContent() {
  const searchParams = useSearchParams()
  // Deep links: /track-order?orderId=… (order emails) or ?phone=…
  const prefill = searchParams.get("orderId") || searchParams.get("phone") || ""

  const [query, setQuery] = useState(prefill)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [order, setOrder] = useState<TrackedOrder | null>(null)
  const [stages, setStages] = useState<Stage[]>([])
  const [matches, setMatches] = useState<OrderSummary[] | null>(null)

  const track = useCallback(async (rawValue: string, keepMatches = false) => {
    const value = rawValue.trim()
    if (!value) {
      setError("Enter your order number or the phone number you ordered with.")
      return
    }

    setLoading(true)
    setError("")
    setOrder(null)
    if (!keepMatches) setMatches(null)

    try {
      let data = await lookup(looksLikePhone(value) ? "phone" : "orderId", value)

      // A single hit on a phone search goes straight to the detail view.
      if (data.matchedBy === "phone" && data.orders.length === 1) {
        data = await lookup("orderId", data.orders[0].id)
      }

      if (data.matchedBy === "phone") {
        setMatches(data.orders)
      } else {
        setOrder(data.order)
        setStages(data.stages)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.")
    } finally {
      setLoading(false)
    }
  }, [])

  // Look the deep-linked order up once on mount.
  const prefillSearched = useRef(false)
  useEffect(() => {
    if (!prefill || prefillSearched.current) return
    prefillSearched.current = true
    track(prefill)
  }, [prefill, track])

  return (
    <div className="flex flex-col min-h-screen bg-cream/60 text-foreground font-sans antialiased">
      <Header />

      <main className="flex-1 w-full max-w-3xl mx-auto px-4 sm:px-6 py-12 md:py-16">

        {/* ── Search card ──────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mx-auto mb-5">
            <Package className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight">Track My Order</h1>
          <p className="text-soft text-sm mt-2 max-w-md mx-auto">
            No account needed — enter the order number from your confirmation email, or the phone number you ordered with.
          </p>
        </div>

        <div className="bg-white border border-line rounded-sg p-6 md:p-8 shadow-xl shadow-line/40">
          <form
            onSubmit={(e) => { e.preventDefault(); track(query) }}
            className="flex flex-col sm:flex-row gap-3"
          >
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 w-4 h-4 text-faint" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Order number (e.g. #A1B2C3D4) or phone number"
                autoComplete="off"
                className="w-full pl-10 pr-4 py-3 text-sm border border-line bg-cream focus:bg-white focus:outline-none focus:ring-2 focus:ring-aqua-400 transition rounded-sg"
              />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="bg-brand-600 text-white px-8 py-3 text-[12.5px] font-bold uppercase tracking-[0.12em] rounded-full hover:bg-brand-700 disabled:opacity-50 transition cursor-pointer"
            >
              {loading ? "Tracking..." : "Track"}
            </button>
          </form>

          {error && (
            <p className="text-red-500 text-xs flex items-center gap-1.5 mt-4">
              <AlertCircle className="w-3.5 h-3.5 shrink-0" />{error}
            </p>
          )}

          <p className="text-[11px] text-faint mt-4">
            Your order number is printed at the top of the confirmation email we sent you.{" "}
            <Link href="/pages/contact-support" className="underline underline-offset-2 hover:text-soft">Can&apos;t find it?</Link>
          </p>
        </div>

        {/* ── Multiple orders for one phone ────────────────────────────────── */}
        {matches && !order && (
          <div className="mt-8">
            <h2 className="text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-soft mb-3">
              {matches.length} orders found for this number
            </h2>
            <div className="space-y-2">
              {matches.map((m) => (
                <button
                  key={m.id}
                  onClick={() => track(m.id, true)}
                  className="w-full bg-white border border-line rounded-sg p-4 flex flex-wrap items-center justify-between gap-3 text-left hover:border-brand-300 transition cursor-pointer"
                >
                  <div>
                    <p className="text-xs font-mono font-bold text-foreground">#{m.number}</p>
                    <p className="text-[11px] text-faint mt-0.5">
                      {formatDate(m.createdAt)} · {m.itemCount} item{m.itemCount === 1 ? "" : "s"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-extrabold">{formatOrderPrice(m, m.totalAmount)}</span>
                    <span className={`text-[9px] font-extrabold uppercase px-2 py-0.5 rounded border ${STATUS_STYLES[m.status] || "bg-amber-50 text-amber-600 border-amber-100"}`}>
                      {m.status}
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Order detail ─────────────────────────────────────────────────── */}
        {order && (
          <div className="mt-8 space-y-4">
            {matches && (
              <button
                onClick={() => { setOrder(null) }}
                className="text-[12px] font-bold uppercase tracking-[0.14em] text-soft hover:text-brand-700 flex items-center gap-1.5 cursor-pointer"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to results
              </button>
            )}

            {/* Summary */}
            <div className="bg-white border border-line rounded-sg p-5 flex flex-wrap justify-between items-center gap-4">
              <div>
                <p className="text-[9px] text-faint uppercase font-bold">Order Number</p>
                <p className="text-xs font-mono font-bold">#{order.number}</p>
              </div>
              <div>
                <p className="text-[9px] text-faint uppercase font-bold">Placed</p>
                <p className="text-xs font-bold">{formatDate(order.createdAt)}</p>
              </div>
              <div>
                <p className="text-[9px] text-faint uppercase font-bold">Status</p>
                <span className={`text-[10px] font-extrabold uppercase px-2.5 py-1 rounded border ${STATUS_STYLES[order.status] || "bg-amber-50 text-amber-600 border-amber-100"}`}>
                  {order.status}
                </span>
              </div>
              <div>
                <p className="text-[9px] text-faint uppercase font-bold">Total</p>
                <p className="text-xs font-extrabold">{formatOrderPrice(order, order.totalAmount)}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="bg-white border border-line rounded-sg p-6 md:p-8">
              <h2 className="text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-soft mb-6">Progress</h2>
              <div className="relative pl-8 border-l border-line space-y-6 ml-2">
                {stages.map((stage, i) => (
                  <div key={stage.key} className="relative">
                    {i < stages.length - 1 && (
                      <div className={`absolute left-[-33.5px] top-6 w-0.5 h-12 ${stage.completed ? "bg-brand-600" : "bg-cream"}`} />
                    )}
                    <div className={`absolute left-[-40px] top-1 w-5 h-5 rounded-full border-2 flex items-center justify-center ${stage.active ? "bg-brand-600 border-brand-600 ring-4 ring-line" : stage.completed ? "bg-brand-600 border-brand-600" : "bg-white border-line"}`}>
                      {stage.completed && <CheckCircle className="w-3 h-3 text-white fill-white stroke-brand-600" />}
                    </div>
                    <h3 className={`text-xs font-extrabold uppercase ${stage.active ? "text-foreground" : stage.completed ? "text-soft" : "text-faint"}`}>{stage.label}</h3>
                    <p className="text-[10px] text-faint mt-0.5">{stage.desc}</p>
                  </div>
                ))}
              </div>

              {order.status === "CANCELLED" && (
                <p className="mt-6 text-[11px] text-red-500 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" /> This order was cancelled. Contact us if that wasn&apos;t expected.
                </p>
              )}
            </div>

            {/* Items */}
            <div className="bg-white border border-line rounded-sg p-6 md:p-8">
              <h2 className="text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-soft mb-5">Items</h2>
              <div className="space-y-3">
                {order.items.map((item) => (
                  <div key={item.id} className="flex gap-4 items-center">
                    <div className="w-12 h-16 rounded-lg bg-cream border border-line overflow-hidden shrink-0">
                      {item.thumbnail && <img src={item.thumbnail} alt={item.productTitle} className="w-full h-full object-cover" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-xs font-bold uppercase truncate text-foreground">{item.productTitle}</h3>
                      <p className="text-[10px] text-faint mt-0.5">
                        {item.color} · {item.size} {item.length ? `· ${item.length}` : ""} · Qty {item.quantity}
                      </p>
                    </div>
                    <p className="text-xs font-extrabold text-foreground">{formatOrderPrice(order, item.price * item.quantity)}</p>
                  </div>
                ))}
              </div>

              <div className="mt-6 pt-5 border-t border-line flex items-start gap-3">
                <MapPin className="w-4 h-4 text-faint shrink-0 mt-0.5" />
                <div>
                  <p className="text-[9px] text-faint uppercase font-bold mb-1">Delivering to</p>
                  <p className="text-xs text-soft leading-relaxed">{order.shippingAddress}</p>
                  <p className="text-xs text-soft mt-1">{order.shippingPhone}</p>
                </div>
              </div>
            </div>

            {/* Next steps */}
            <div className="bg-white border border-line rounded-sg p-6 flex flex-wrap gap-3">
              <Link href="/pages/shipping-policy" className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] border border-line rounded-full hover:bg-brand-600 hover:text-white hover:border-brand-600 transition">
                Delivery Times
              </Link>
              <Link href="/pages/returns-exchanges" className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] border border-line rounded-full hover:bg-brand-600 hover:text-white hover:border-brand-600 transition">
                Returns &amp; Exchanges
              </Link>
              <Link href="/pages/contact-support" className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.14em] border border-line rounded-full hover:bg-brand-600 hover:text-white hover:border-brand-600 transition">
                Contact Support
              </Link>
            </div>
          </div>
        )}

        {/* ── Account nudge ────────────────────────────────────────────────── */}
        {!order && !matches && (
          <p className="text-center text-xs text-faint mt-8">
            Want your full order history in one place?{" "}
            <Link href="/account" className="font-bold text-soft underline underline-offset-2 hover:text-brand-700">Sign in to your account</Link>
          </p>
        )}
      </main>

      <Footer />
    </div>
  )
}

export default function TrackOrderPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-cream flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-line border-t-brand-600 rounded-full animate-spin" />
      </div>
    }>
      <TrackOrderContent />
    </Suspense>
  )
}
