"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Loader2 } from "lucide-react"
import { useCurrency } from "@/providers/CurrencyProvider"
import PrintInvoiceButton from "@/components/PrintInvoiceButton"

type CustomMeasurement = {
  templateName?: string
  values?: { key: string; label: string; value: number; unit: string }[]
}

type OrderItem = {
  id: string
  quantity: number
  price: number
  isCustom?: boolean
  customFee?: number
  customMeasurements?: CustomMeasurement | null
  variant: {
    size: string
    color: string
    length?: string | null
    product: {
      title: string
    }
  }
}

type Order = {
  id: string
  totalAmount: number
  shippingFee: number
  pointsRedeemed: number
  status: string
  paymentStatus: string
  shippingAddress: string
  shippingPhone: string
  currencyCode?: string
  currencySymbol?: string
  exchangeRate?: number
  createdAt: string
  items: OrderItem[]
  user: {
    name: string
    email: string
    phone?: string | null
  }
  payment?: {
    provider: string
    transactionId?: string | null
  } | null
}

type Settings = {
  brand_logo_url?: string
  brand_slogan?: string
}

export default function InvoiceClient({ id }: { id: string }) {
  const { formatPrice: globalFormatPrice } = useCurrency()
  const [order, setOrder] = useState<Order | null>(null)
  const [settings, setSettings] = useState<Settings>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [orderRes, settingsRes] = await Promise.all([
          fetch(`/api/customer/invoice/${id}`),
          fetch(`/api/settings`),
        ])
        if (orderRes.ok) setOrder(await orderRes.json())
        if (settingsRes.ok) setSettings(await settingsRes.json())
      } catch (err) {
        console.error("Failed to load invoice", err)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [id])

  if (loading) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <Loader2 style={{ width: 32, height: 32, animation: "spin 1s linear infinite", color: "#aaa" }} />
      </div>
    )
  }

  if (!order) {
    return (
      <div style={{ display: "flex", height: "100vh", alignItems: "center", justifyContent: "center" }}>
        <p>Invoice not found.</p>
      </div>
    )
  }

  // Format price using frozen order currency & rate
  const formatPrice = (usdPrice: number) => {
    const symbol = order.currencySymbol || "$"
    const rate = order.exchangeRate || 1.0
    const converted = usdPrice * rate
    const formatted = converted.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })
    return `${symbol}${formatted}`
  }

  const subtotal = order.items.reduce((sum, item) => sum + item.price * item.quantity, 0)
  const shippingFee = order.shippingFee ?? 0
  const pointsDiscount = order.pointsRedeemed ?? 0
  const tax = Math.max(0, order.totalAmount - subtotal - shippingFee + pointsDiscount)

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #111; background: #fff; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @media print { body { margin: 0; } .no-print { display: none !important; } }
      `}</style>
      <div style={{ maxWidth: 720, margin: "40px auto", padding: 48 }}>

        {/* Print Button */}
        <div className="no-print" style={{ textAlign: "right", marginBottom: 24 }}>
          <PrintInvoiceButton />
        </div>

        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", borderBottom: "2px solid #09090b", paddingBottom: 24, marginBottom: 32 }}>
          <div>
            {settings.brand_logo_url
              ? <img src={settings.brand_logo_url} alt="Logo" style={{ height: 36, objectFit: "contain", marginBottom: 8 }} />
              : <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: "0.3em", textTransform: "uppercase", marginBottom: 8 }}>STORE</div>
            }
          </div>
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 28, fontWeight: 900, color: "#09090b" }}>INVOICE</div>
            <div style={{ fontSize: 12, color: "#666", marginTop: 4 }}>
              #{id.slice(-8).toUpperCase()}
            </div>
            <div style={{ fontSize: 12, color: "#666" }}>
              {new Date(order.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
            </div>
            <div style={{ fontSize: 10, color: "#000", marginTop: 8, fontWeight: "bold" }}>
              Tracking ID: <span style={{ fontFamily: "monospace", fontSize: 11, background: "#f4f4f5", padding: "2px 6px", borderRadius: 4 }}>{id}</span>
            </div>
          </div>
        </div>

        {/* Bill To & Order Info */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6, fontWeight: 700 }}>Bill To</div>
            <div style={{ fontSize: 13, color: "#111", lineHeight: 1.6 }}>
              <strong>{order.user.name}</strong><br />
              {order.user.email}<br />
              {order.user.phone || order.shippingPhone}<br />
              {order.shippingAddress}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.15em", marginBottom: 6, fontWeight: 700 }}>Order Details</div>
            <div style={{ fontSize: 13, color: "#111", lineHeight: 1.6 }}>
              <span style={{ fontWeight: 700 }}>Order ID:</span> <span style={{ fontFamily: "monospace", fontSize: 11, background: "#f4f4f5", padding: "1px 4px", borderRadius: 3 }}>{id}</span><br />
              <span style={{ fontWeight: 700 }}>Status:</span> {order.status}<br />
              <span style={{ fontWeight: 700 }}>Payment:</span> {order.payment?.provider?.toUpperCase() || "COD"}<br />
              <span style={{ fontWeight: 700 }}>Payment Status:</span> {order.paymentStatus}
              {order.payment?.transactionId && (
                <><br /><span style={{ fontWeight: 700 }}>TXN ID:</span> {order.payment.transactionId}</>
              )}
            </div>
          </div>
        </div>

        {/* Items Table */}
        <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: 24 }}>
          <thead>
            <tr style={{ background: "#f9f9f9" }}>
              <th style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 12px", textAlign: "left" }}>Item</th>
              <th style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 12px", textAlign: "center" }}>Variant</th>
              <th style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 12px", textAlign: "center" }}>Qty</th>
              <th style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 12px", textAlign: "right" }}>Unit Price</th>
              <th style={{ fontSize: 10, color: "#888", textTransform: "uppercase", letterSpacing: "0.1em", padding: "10px 12px", textAlign: "right" }}>Total</th>
            </tr>
          </thead>
          <tbody>
            {order.items.map(item => {
              const measurements = item.customMeasurements
              return (
                <tr key={item.id} style={{ borderBottom: "1px solid #f0f0f0", verticalAlign: "top" }}>
                  <td style={{ fontSize: 13, color: "#333", padding: 12 }}>
                    <div>{item.variant.product.title}</div>
                    {item.isCustom && (
                      <div style={{ marginTop: 6 }}>
                        <span style={{ display: "inline-block", fontSize: 9, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", background: "#09090b", color: "#fff", borderRadius: 3, padding: "2px 6px", marginBottom: 4 }}>
                          Made-to-Measure{measurements?.templateName ? ` · ${measurements.templateName}` : ""}
                        </span>
                        {(item.customFee ?? 0) > 0 && (
                          <div style={{ fontSize: 10, color: "#666", marginBottom: 4 }}>
                            Custom fee: +{formatPrice(item.customFee ?? 0)}/item
                          </div>
                        )}
                        {measurements?.values && measurements.values.length > 0 && (
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "3px 10px", padding: "7px 10px", background: "#f4f4f5", borderRadius: 4, borderLeft: "3px solid #09090b", marginTop: 4 }}>
                            {measurements.values.map(v => (
                              <div key={v.key} style={{ fontSize: 10, color: "#555" }}>
                                <span style={{ fontWeight: 700, color: "#111" }}>{v.label}:</span>{" "}
                                {v.value}{v.unit}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </td>
                  <td style={{ fontSize: 12, color: "#666", padding: 12, textAlign: "center" }}>
                    {item.variant.color}, {item.variant.size}{item.variant.length ? `, ${item.variant.length}` : ""}
                  </td>
                  <td style={{ fontSize: 13, color: "#333", padding: 12, textAlign: "center" }}>{item.quantity}</td>
                  <td style={{ fontSize: 13, color: "#333", padding: 12, textAlign: "right" }}>{formatPrice(item.price)}</td>
                  <td style={{ fontSize: 13, color: "#333", padding: 12, textAlign: "right" }}>{formatPrice(item.price * item.quantity)}</td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={4} style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, color: "#555" }}>Subtotal</td>
              <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, color: "#555" }}>{formatPrice(subtotal)}</td>
            </tr>
            {pointsDiscount > 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, color: "#059669" }}>Reward Points Discount</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, color: "#059669" }}>-{formatPrice(pointsDiscount)}</td>
              </tr>
            )}
            {tax > 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, color: "#555" }}>Tax (5%)</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, color: "#555" }}>{formatPrice(tax)}</td>
              </tr>
            )}
            {shippingFee > 0 && (
              <tr>
                <td colSpan={4} style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, color: "#555" }}>Shipping</td>
                <td style={{ padding: "8px 12px", textAlign: "right", fontSize: 13, color: "#555" }}>{formatPrice(shippingFee)}</td>
              </tr>
            )}
            <tr style={{ borderTop: "2px solid #09090b" }}>
              <td colSpan={4} style={{ padding: "16px 12px", textAlign: "right", fontWeight: 700, fontSize: 15, color: "#09090b" }}>Grand Total</td>
              <td style={{ padding: "16px 12px", textAlign: "right", fontWeight: 700, fontSize: 15, color: "#09090b" }}>{formatPrice(order.totalAmount)}</td>
            </tr>
          </tfoot>
        </table>

        {/* Footer */}
        <div style={{ borderTop: "1px solid #eee", paddingTop: 20, marginTop: 32, textAlign: "center", fontSize: 11, color: "#aaa" }}>
          Thank you for your purchase! For any questions, please contact our support team.
        </div>
      </div>
    </>
  )
}
