"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardPlus,
  FileText,
  Loader2,
  Minus,
  Package,
  Plus,
  Search,
  Trash2,
  UserCheck,
} from "lucide-react"
import api from "@/lib/axios"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent } from "@/components/ui/card"
import { ORDER_SOURCES, type OrderSource } from "@/lib/orderSources"
import { activeShippingMethods, shippingMethodsFromSettings, shippingPriceForCountry, WHOLE_COUNTRY } from "@/lib/shipping"
import { formatImageUrl } from "@/lib/utils"

/**
 * Admin → Orders → Create Order: for orders that arrive on the Facebook page,
 * Messenger, WhatsApp or by phone. Staff fill in the customer, pick products
 * and the delivery, and the result is a normal delivery order (PENDING, cash
 * on delivery unless something was paid) that flows through Orders,
 * Deliveries / Steadfast and the invoice like any website order.
 *
 * Totals here are a preview — /api/admin/orders/manual recomputes them.
 */

type Variant = { id: string; color: string; size: string; length: string | null; sku: string; stock: number; price: number | null }
type Product = { id: string; title: string; productCode: string | null; thumbnail: string; basePrice: number; discountPrice: number | null; variants: Variant[] }
type Line = { variantId: string; title: string; thumbnail: string; label: string; sku: string; stock: number; quantity: number; price: number }
type Customer = { id: string; name: string; email: string; phone: string | null }

const tk = (n: number) => `৳${(Math.round(n * 100) / 100).toLocaleString("en-BD")}`
const BD_PHONE = /^01[3-9]\d{8}$/
const normPhone = (raw: string) => raw.replace(/[^\d]/g, "").replace(/^880/, "0")

const sectionTitle = "text-[11px] font-bold uppercase tracking-widest text-muted-foreground"
const chip = (on: boolean) =>
  `rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
    on ? "border-zinc-900 bg-zinc-900 text-white" : "border-zinc-200 bg-white text-zinc-700 hover:border-zinc-400"
  }`

export default function CreateOrderPage() {
  // ── Customer ────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [address, setAddress] = useState("")
  const [customerId, setCustomerId] = useState<string | null>(null)
  const [phoneMatch, setPhoneMatch] = useState<Customer | null>(null)

  // ── Order meta ──────────────────────────────────────────────────────────
  const [source, setSource] = useState<OrderSource>("facebook")
  const [status, setStatus] = useState<"PENDING" | "PROCESSING">("PENDING")
  const [adminNote, setAdminNote] = useState("")

  // ── Products ────────────────────────────────────────────────────────────
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<Product[]>([])
  const [searching, setSearching] = useState(false)
  const [openProductId, setOpenProductId] = useState<string | null>(null)
  const [lines, setLines] = useState<Line[]>([])
  const searchBoxRef = useRef<HTMLDivElement>(null)

  // ── Delivery & payment ──────────────────────────────────────────────────
  const [methods, setMethods] = useState<Array<{ id: string; name: string; price: number }>>([])
  const [shippingMethod, setShippingMethod] = useState("")
  const [shippingFee, setShippingFee] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [paymentType, setPaymentType] = useState<"cod" | "advance" | "paid">("cod")
  const [paymentMethod, setPaymentMethod] = useState("bkash")
  const [advanceAmount, setAdvanceAmount] = useState(0)
  const [transactionId, setTransactionId] = useState("")

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")
  const [created, setCreated] = useState<{ id: string; total: number } | null>(null)

  // Delivery options = the store's active shipping methods that serve Bangladesh.
  useEffect(() => {
    api
      .get("/settings")
      .then((res) => {
        const list = activeShippingMethods(shippingMethodsFromSettings(res.data))
          .filter((m) => {
            const r = m.regionRestriction
            if (!r) return true
            if (r.scope === "only") return r.country === "BD"
            return !(r.country === "BD" && r.region === WHOLE_COUNTRY)
          })
          .map((m) => ({ id: m.id, name: m.name, price: shippingPriceForCountry(m, "BD") }))
        setMethods(list)
        if (list[0]) {
          setShippingMethod(list[0].name)
          setShippingFee(list[0].price)
        }
      })
      .catch(() => {})
  }, [])

  // Product search (debounced).
  useEffect(() => {
    const q = query.trim()
    if (q.length < 2) {
      setResults([])
      return
    }
    const t = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await api.get(`/admin/products?view=order&limit=12&search=${encodeURIComponent(q)}`)
        setResults(res.data.data || [])
      } catch {
        setResults([])
      } finally {
        setSearching(false)
      }
    }, 300)
    return () => clearTimeout(t)
  }, [query])

  // Close the results when clicking elsewhere.
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) setResults([])
    }
    document.addEventListener("mousedown", onDown)
    return () => document.removeEventListener("mousedown", onDown)
  }, [])

  // A returning customer is recognised by phone number.
  useEffect(() => {
    const p = normPhone(phone)
    setPhoneMatch(null)
    if (!BD_PHONE.test(p) || customerId) return
    const t = setTimeout(async () => {
      try {
        const res = await api.get(`/admin/users?search=${p}&role=USER&limit=5`)
        const list: Customer[] = res.data.data || res.data || []
        const hit = list.find((c) => c.phone && normPhone(c.phone) === p)
        if (hit) setPhoneMatch(hit)
      } catch {}
    }, 400)
    return () => clearTimeout(t)
  }, [phone, customerId])

  const pickCustomer = (c: Customer) => {
    setCustomerId(c.id)
    setFullName(c.name || fullName)
    if (c.email && !c.email.endsWith("@phone-order.local")) setEmail(c.email)
    setPhoneMatch(null)
  }

  const addVariant = (p: Product, v: Variant) => {
    if (v.stock <= 0) return
    const price = v.price ?? p.discountPrice ?? p.basePrice
    setLines((prev) => {
      const i = prev.findIndex((l) => l.variantId === v.id)
      if (i > -1) {
        const next = [...prev]
        next[i] = { ...next[i], quantity: Math.min(next[i].quantity + 1, v.stock) }
        return next
      }
      return [
        ...prev,
        {
          variantId: v.id,
          title: p.title,
          thumbnail: p.thumbnail,
          label: [v.color, v.size, v.length].filter(Boolean).join(" / "),
          sku: v.sku,
          stock: v.stock,
          quantity: 1,
          price,
        },
      ]
    })
  }

  const setLine = (variantId: string, patch: Partial<Line>) =>
    setLines((prev) => prev.map((l) => (l.variantId === variantId ? { ...l, ...patch } : l)))

  const subtotal = useMemo(() => lines.reduce((s, l) => s + l.price * l.quantity, 0), [lines])
  const appliedDiscount = Math.min(Math.max(0, discount), subtotal)
  const total = Math.max(0, subtotal - appliedDiscount + Math.max(0, shippingFee))
  const paidNow = paymentType === "paid" ? total : paymentType === "advance" ? Math.min(Math.max(0, advanceAmount), total) : 0
  const dueOnDelivery = Math.max(0, total - paidNow)

  const phoneOk = BD_PHONE.test(normPhone(phone))
  const canSubmit = fullName.trim() && phoneOk && address.trim() && lines.length > 0 && !submitting

  const submit = async () => {
    setError("")
    if (!canSubmit) {
      setError(
        !fullName.trim()
          ? "Enter the customer's name."
          : !phoneOk
            ? "Enter a valid mobile number (01XXXXXXXXX)."
            : !address.trim()
              ? "Enter the delivery address."
              : "Add at least one product."
      )
      return
    }
    setSubmitting(true)
    try {
      const res = await api.post("/admin/orders/manual", {
        userId: customerId,
        fullName,
        phone,
        email,
        address,
        source,
        status,
        adminNote,
        items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity, price: l.price })),
        shippingMethod,
        shippingFee,
        discount: appliedDiscount,
        paymentType,
        paymentMethod,
        advanceAmount,
        transactionId,
      })
      setCreated({ id: res.data.orderId, total: res.data.totalAmount })
      window.scrollTo({ top: 0, behavior: "smooth" })
    } catch (e: any) {
      setError(e?.response?.data?.message || "Could not create the order.")
    } finally {
      setSubmitting(false)
    }
  }

  const reset = () => {
    setCreated(null)
    setFullName("")
    setPhone("")
    setEmail("")
    setAddress("")
    setCustomerId(null)
    setLines([])
    setDiscount(0)
    setAdvanceAmount(0)
    setTransactionId("")
    setAdminNote("")
    setPaymentType("cod")
    setStatus("PENDING")
    setError("")
  }

  if (created) {
    return (
      <div className="w-full p-2">
        <Card className="mx-auto max-w-xl">
          <CardContent className="flex flex-col items-center gap-4 p-10 text-center">
            <CheckCircle2 className="h-14 w-14 text-emerald-500" />
            <div>
              <h2 className="text-xl font-bold">Order created</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                #{created.id.slice(-8).toUpperCase()} · {tk(created.total)}
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              <Button asChild variant="outline">
                <Link href={`/admin/orders/${created.id}/invoice`}>
                  <FileText className="mr-1.5 h-4 w-4" /> Invoice
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/admin/orders">View in Orders</Link>
              </Button>
              <Button onClick={reset}>
                <Plus className="mr-1.5 h-4 w-4" /> Create another
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="w-full space-y-6 p-2">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary text-primary-foreground">
            <ClipboardPlus className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Create Order</h1>
            <p className="text-sm text-muted-foreground">For orders from Facebook, Messenger, WhatsApp or a phone call</p>
          </div>
        </div>
        <Button asChild variant="outline">
          <Link href="/admin/orders">
            <ArrowLeft className="mr-1.5 h-4 w-4" /> Orders
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        {/* ── Left column ── */}
        <div className="space-y-6">
          {/* Source */}
          <Card>
            <CardContent className="space-y-3 p-5">
              <p className={sectionTitle}>Order came from</p>
              <div className="flex flex-wrap gap-2">
                {ORDER_SOURCES.map((s) => (
                  <button key={s.value} type="button" className={chip(source === s.value)} onClick={() => setSource(s.value)}>
                    {s.label}
                  </button>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Customer */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <p className={sectionTitle}>Customer</p>
                {customerId && (
                  <button type="button" onClick={() => setCustomerId(null)} className="text-xs font-semibold text-muted-foreground hover:text-foreground">
                    <UserCheck className="mr-1 inline h-3.5 w-3.5 text-emerald-600" /> Existing customer · unlink
                  </button>
                )}
              </div>
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div className="space-y-1.5">
                  <Label>Mobile number *</Label>
                  <Input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="01XXXXXXXXX" inputMode="tel" />
                  {phone && !phoneOk && <p className="text-xs text-red-600">Use an 11-digit Bangladeshi number.</p>}
                  {phoneMatch && (
                    <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs">
                      <span>
                        Existing customer: <b>{phoneMatch.name}</b>
                      </span>
                      <button type="button" onClick={() => pickCustomer(phoneMatch)} className="font-bold text-emerald-700 hover:underline">
                        Use
                      </button>
                    </div>
                  )}
                </div>
                <div className="space-y-1.5">
                  <Label>Full name *</Label>
                  <Input value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Customer name" />
                </div>
                <div className="space-y-1.5 md:col-span-2">
                  <Label>Delivery address *</Label>
                  <Textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} placeholder="House, road, area, district" />
                </div>
                <div className="space-y-1.5">
                  <Label>Email (optional)</Label>
                  <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@example.com" type="email" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Products */}
          <Card>
            <CardContent className="space-y-4 p-5">
              <p className={sectionTitle}>Products</p>
              <div ref={searchBoxRef} className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search by product name, code or SKU…"
                  className="pl-9"
                />
                {searching && <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />}
                {results.length > 0 && (
                  <div className="absolute z-30 mt-1 max-h-[420px] w-full overflow-y-auto rounded-xl border bg-white shadow-xl">
                    {results.map((p) => {
                      const open = openProductId === p.id
                      const inStock = p.variants.filter((v) => v.stock > 0).length
                      return (
                        <div key={p.id} className="border-b last:border-0">
                          <button
                            type="button"
                            onClick={() => setOpenProductId(open ? null : p.id)}
                            className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-zinc-50"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={formatImageUrl(p.thumbnail)} alt="" className="h-11 w-9 shrink-0 rounded object-cover bg-zinc-100" />
                            <span className="min-w-0 flex-1">
                              <span className="block truncate text-sm font-semibold">{p.title}</span>
                              <span className="text-xs text-muted-foreground">
                                {p.productCode ? `${p.productCode} · ` : ""}
                                {tk(p.discountPrice ?? p.basePrice)} · {inStock} variant{inStock === 1 ? "" : "s"} in stock
                              </span>
                            </span>
                          </button>
                          {open && (
                            <div className="flex flex-wrap gap-1.5 bg-zinc-50 px-3 pb-3 pt-1">
                              {p.variants.length === 0 && <span className="text-xs text-muted-foreground">No variants.</span>}
                              {p.variants.map((v) => (
                                <button
                                  key={v.id}
                                  type="button"
                                  disabled={v.stock <= 0}
                                  onClick={() => addVariant(p, v)}
                                  className="rounded-md border bg-white px-2.5 py-1.5 text-xs font-medium hover:border-zinc-900 disabled:cursor-not-allowed disabled:opacity-40"
                                  title={v.sku}
                                >
                                  {[v.color, v.size, v.length].filter(Boolean).join(" / ")}
                                  <span className="ml-1.5 text-muted-foreground">({v.stock})</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {lines.length === 0 ? (
                <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed py-10 text-sm text-muted-foreground">
                  <Package className="h-8 w-8 opacity-40" />
                  Search above and pick a size to add a product.
                </div>
              ) : (
                <div className="overflow-x-auto rounded-xl border">
                  <table className="w-full text-sm">
                    <thead className="bg-zinc-50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                      <tr>
                        <th className="px-3 py-2.5 font-semibold">Product</th>
                        <th className="px-3 py-2.5 font-semibold">Qty</th>
                        <th className="px-3 py-2.5 font-semibold">Unit price</th>
                        <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                        <th className="w-10" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((l) => (
                        <tr key={l.variantId} className="border-t">
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-3">
                              {/* eslint-disable-next-line @next/next/no-img-element */}
                              <img src={formatImageUrl(l.thumbnail)} alt="" className="h-12 w-10 shrink-0 rounded object-cover bg-zinc-100" />
                              <div className="min-w-0">
                                <p className="max-w-[280px] truncate font-semibold">{l.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {l.label} · {l.sku} · {l.stock} in stock
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="inline-flex items-center rounded-lg border">
                              <button type="button" className="p-1.5 hover:bg-zinc-100" onClick={() => (l.quantity <= 1 ? setLines((p) => p.filter((x) => x.variantId !== l.variantId)) : setLine(l.variantId, { quantity: l.quantity - 1 }))}>
                                <Minus className="h-3.5 w-3.5" />
                              </button>
                              <span className="w-8 text-center font-semibold">{l.quantity}</span>
                              <button type="button" className="p-1.5 hover:bg-zinc-100 disabled:opacity-30" disabled={l.quantity >= l.stock} onClick={() => setLine(l.variantId, { quantity: l.quantity + 1 })}>
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <Input
                              type="number"
                              min={0}
                              value={l.price}
                              onChange={(e) => setLine(l.variantId, { price: Math.max(0, Number(e.target.value) || 0) })}
                              className="h-9 w-28"
                            />
                          </td>
                          <td className="px-3 py-2.5 text-right font-semibold">{tk(l.price * l.quantity)}</td>
                          <td className="px-2">
                            <button type="button" onClick={() => setLines((p) => p.filter((x) => x.variantId !== l.variantId))} className="rounded p-1.5 text-muted-foreground hover:bg-red-50 hover:text-red-600" aria-label="Remove">
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Note */}
          <Card>
            <CardContent className="space-y-2 p-5">
              <p className={sectionTitle}>Internal note</p>
              <Textarea value={adminNote} onChange={(e) => setAdminNote(e.target.value)} rows={2} placeholder="e.g. Customer asked for delivery after 5 pm. Only staff see this." />
            </CardContent>
          </Card>
        </div>

        {/* ── Right column ── */}
        <div className="space-y-6 xl:sticky xl:top-20 xl:self-start">
          <Card>
            <CardContent className="space-y-4 p-5">
              <p className={sectionTitle}>Delivery</p>
              {methods.length > 0 && (
                <div className="space-y-1.5">
                  <Label>Area</Label>
                  <div className="flex flex-wrap gap-2">
                    {methods.map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        className={chip(shippingMethod === m.name)}
                        onClick={() => {
                          setShippingMethod(m.name)
                          setShippingFee(m.price)
                        }}
                      >
                        {m.name} · {tk(m.price)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="space-y-1.5">
                <Label>Delivery charge</Label>
                <Input type="number" min={0} value={shippingFee} onChange={(e) => setShippingFee(Math.max(0, Number(e.target.value) || 0))} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-4 p-5">
              <p className={sectionTitle}>Payment</p>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={chip(paymentType === "cod")} onClick={() => setPaymentType("cod")}>
                  Cash on delivery
                </button>
                <button
                  type="button"
                  className={chip(paymentType === "advance")}
                  onClick={() => {
                    setPaymentType("advance")
                    if (!advanceAmount) setAdvanceAmount(shippingFee)
                  }}
                >
                  Advance paid
                </button>
                <button type="button" className={chip(paymentType === "paid")} onClick={() => setPaymentType("paid")}>
                  Fully paid
                </button>
              </div>

              {paymentType !== "cod" && (
                <div className="space-y-3 rounded-lg bg-zinc-50 p-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label>Paid by</Label>
                      <select value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} className="h-9 w-full rounded-md border bg-white px-2 text-sm">
                        <option value="bkash">bKash</option>
                        <option value="nagad">Nagad</option>
                        <option value="rocket">Rocket</option>
                        <option value="bank">Bank transfer</option>
                        <option value="cash">Cash</option>
                      </select>
                    </div>
                    {paymentType === "advance" && (
                      <div className="space-y-1.5">
                        <Label>Amount paid</Label>
                        <Input type="number" min={0} value={advanceAmount} onChange={(e) => setAdvanceAmount(Math.max(0, Number(e.target.value) || 0))} className="bg-white" />
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5">
                    <Label>Transaction ID (optional)</Label>
                    <Input value={transactionId} onChange={(e) => setTransactionId(e.target.value)} placeholder="e.g. 9JK3L2M1N0" className="bg-white" />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <Label>Order status</Label>
                <div className="flex gap-2">
                  <button type="button" className={chip(status === "PENDING")} onClick={() => setStatus("PENDING")}>
                    Pending
                  </button>
                  <button type="button" className={chip(status === "PROCESSING")} onClick={() => setStatus("PROCESSING")}>
                    Confirmed / Processing
                  </button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="space-y-3 p-5">
              <p className={sectionTitle}>Summary</p>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Subtotal ({lines.reduce((s, l) => s + l.quantity, 0)} items)</span>
                <span className="font-semibold">{tk(subtotal)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-sm">
                <span className="text-muted-foreground">Discount</span>
                <Input type="number" min={0} value={discount} onChange={(e) => setDiscount(Math.max(0, Number(e.target.value) || 0))} className="h-8 w-28 text-right" />
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Delivery</span>
                <span className="font-semibold">{tk(shippingFee)}</span>
              </div>
              <div className="flex justify-between border-t pt-3 text-base">
                <span className="font-bold">Total</span>
                <span className="font-bold">{tk(total)}</span>
              </div>
              {paidNow > 0 && (
                <div className="flex justify-between text-sm text-emerald-700">
                  <span>Paid</span>
                  <span className="font-semibold">− {tk(paidNow)}</span>
                </div>
              )}
              <div className="flex justify-between rounded-lg bg-amber-50 px-3 py-2 text-sm">
                <span className="font-semibold text-amber-900">Collect on delivery</span>
                <span className="font-bold text-amber-900">{tk(dueOnDelivery)}</span>
              </div>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <Button className="h-11 w-full" disabled={submitting} onClick={submit}>
                {submitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ClipboardPlus className="mr-2 h-4 w-4" />}
                Create Order
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
