"use client"

import { useEffect, useState } from "react"
import { useParams } from "next/navigation"
import { Printer, Loader2, ArrowLeft } from "lucide-react"
import api from "@/lib/axios"
import { useSettings } from "@/providers/SettingsProvider"

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
    sku: string
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
  }
  payment?: {
    provider: string
    transactionId?: string | null
    amount: number
  } | null
}

export default function InvoicePage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const { storeName } = useSettings()
  const [order, setOrder] = useState<Order | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchOrder() {
      if (!id) return
      try {
        const res = await api.get(`/admin/orders/${id}`)
        setOrder(res.data)
        
        // Automatically trigger print dialog once data is loaded and rendered
        setTimeout(() => {
          window.print()
        }, 500)
      } catch (err) {
        console.error("Failed to load order", err)
      } finally {
        setLoading(false)
      }
    }
    fetchOrder()
  }, [id])

  if (loading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
      </div>
    )
  }

  if (!order) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-white">
        <p>Order not found</p>
      </div>
    )
  }

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

  // Accurate breakdown using stored shippingFee field
  const subtotal = order.items.reduce((sum, i) => sum + i.price * i.quantity, 0)
  const shipping = order.shippingFee || 0
  const pointsDiscount = order.pointsRedeemed || 0
  // tax = totalAmount − subtotal − shipping + pointsDiscount
  const tax = Math.max(0, order.totalAmount - subtotal - shipping + pointsDiscount)

  return (
    <div className="invoice-print-root min-h-screen bg-zinc-50 p-4 md:p-8">
      {/* Controls - Hidden during print */}
      <div className="mb-6 flex justify-between items-center max-w-4xl mx-auto no-print">
        <button 
          onClick={() => window.close()} 
          className="flex items-center gap-2 text-sm font-bold text-zinc-500 hover:text-zinc-900 transition"
        >
          <ArrowLeft size={16} /> Close Window
        </button>
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-zinc-950 text-white px-5 py-2.5 rounded-lg text-sm font-bold hover:bg-zinc-800 transition"
        >
          <Printer size={16} /> Print / Save as PDF
        </button>
      </div>

      {/* INVOICE PAPER (A4 proportions) */}
      <div className="bg-white mx-auto max-w-4xl shadow-xl border border-zinc-200 print:shadow-none print:border-none p-8 md:p-16 min-h-[1056px] print:min-h-0 relative">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-12">
          <div>
            <h1 className="text-4xl font-black tracking-tighter uppercase mb-2">{storeName}</h1>
            <p className="text-zinc-500 text-sm">Premium {storeName}</p>
            <p className="text-zinc-500 text-sm">contact@store.local</p>
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-black text-zinc-200 uppercase tracking-widest mb-2">Invoice</h2>
            <p className="text-sm font-bold text-zinc-800">Order #{order.id.slice(0, 8)}</p>
            <p className="text-sm text-zinc-500">Date: {new Date(order.createdAt).toLocaleDateString()}</p>
            {order.payment?.provider && (
              <p className="text-sm text-zinc-500 mt-1">Payment: <span className="font-bold uppercase">{order.payment.provider}</span></p>
            )}
            {order.payment?.transactionId && (
              <p className="text-xs text-zinc-400 mt-0.5 font-mono">TXN: {order.payment.transactionId}</p>
            )}
          </div>
        </div>

        {/* Addresses */}
        <div className="grid grid-cols-2 gap-8 mb-12 border-t border-zinc-100 pt-8">
          <div>
            <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 mb-3">Bill To</h3>
            <p className="text-sm font-bold text-zinc-900">{order.user.name}</p>
            <p className="text-sm text-zinc-600">{order.user.email}</p>
            <p className="text-sm text-zinc-600">{order.shippingPhone}</p>
          </div>
          <div>
            <h3 className="text-xs font-black tracking-widest uppercase text-zinc-400 mb-3">Ship To</h3>
            <p className="text-sm font-bold text-zinc-900">{order.user.name}</p>
            <p className="text-sm text-zinc-600 max-w-xs">{order.shippingAddress}</p>
          </div>
        </div>

        {/* Order Status Info */}
        <div className="flex gap-6 mb-12 bg-zinc-50 p-4 rounded-lg">
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">Payment Status</span>
            <span className="text-sm font-bold text-zinc-900">{order.paymentStatus}</span>
          </div>
          <div>
            <span className="block text-[10px] font-black uppercase tracking-widest text-zinc-400">Fulfillment Status</span>
            <span className="text-sm font-bold text-zinc-900">{order.status}</span>
          </div>
        </div>

        {/* Line Items Table */}
        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="border-b-2 border-zinc-900 text-left">
              <th className="py-3 text-xs font-black uppercase tracking-widest text-zinc-900">Item Description</th>
              <th className="py-3 text-xs font-black uppercase tracking-widest text-zinc-900 text-center w-16">Qty</th>
              <th className="py-3 pl-4 text-xs font-black uppercase tracking-widest text-zinc-900 text-right w-32">Unit Price</th>
              <th className="py-3 pl-4 text-xs font-black uppercase tracking-widest text-zinc-900 text-right w-32">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {order.items.map(item => (
              <tr key={item.id} className="align-top">
                <td className="py-4">
                  <p className="text-sm font-bold text-zinc-900">{item.variant.product.title}</p>
                  <p className="text-xs text-zinc-500 mt-0.5">
                    Size: {item.variant.size} | Color: {item.variant.color}
                    {item.variant.length ? ` | Length: ${item.variant.length}` : ""} | SKU: {item.variant.sku}
                  </p>

                  {/* Custom Measurements Section */}
                  {item.isCustom && (
                    <div className="mt-2">
                      <span className="inline-block text-[9px] font-black uppercase tracking-widest bg-zinc-900 text-white rounded px-2 py-0.5 mb-1.5">
                        Made-to-Measure{item.customMeasurements?.templateName ? ` · ${item.customMeasurements.templateName}` : ""}
                      </span>
                      {(item.customFee ?? 0) > 0 && (
                        <p className="text-[10px] text-zinc-500 mb-1.5">
                          Custom tailoring fee: +{formatPrice(item.customFee ?? 0)}/item
                        </p>
                      )}
                      {item.customMeasurements?.values && item.customMeasurements.values.length > 0 && (
                        <div className="grid grid-cols-3 gap-x-4 gap-y-1 bg-zinc-50 border border-zinc-200 border-l-[3px] border-l-zinc-900 rounded p-2 mt-1">
                          {item.customMeasurements.values.map(v => (
                            <p key={v.key} className="text-[10px] text-zinc-600">
                              <span className="font-bold text-zinc-900">{v.label}:</span> {v.value}{v.unit}
                            </p>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-4 text-center text-sm font-bold text-zinc-700 w-16">{item.quantity}</td>
                <td className="py-4 pl-4 text-right text-sm font-bold text-zinc-700 font-mono whitespace-nowrap w-32">{formatPrice(item.price)}</td>
                <td className="py-4 pl-4 text-right text-sm font-bold text-zinc-900 font-mono whitespace-nowrap w-32">{formatPrice(item.price * item.quantity)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end border-t-2 border-zinc-900 pt-6">
          <div className="w-72 space-y-3">
            <div className="flex justify-between text-sm">
              <span className="font-bold text-zinc-600">Subtotal</span>
              <span className="font-bold text-zinc-900 font-mono whitespace-nowrap">{formatPrice(subtotal)}</span>
            </div>
            {pointsDiscount > 0 && (
              <div className="flex justify-between text-sm">
                <span className="font-bold text-zinc-600">Reward Points</span>
                <span className="font-bold text-emerald-600 font-mono whitespace-nowrap">−{formatPrice(pointsDiscount)}</span>
              </div>
            )}
            {tax > 0 && (
              <div className="flex justify-between text-sm">
                <span className="font-bold text-zinc-600">Tax (5%)</span>
                <span className="font-bold text-zinc-900 font-mono whitespace-nowrap">{formatPrice(tax)}</span>
              </div>
            )}
            {shipping > 0 && (
              <div className="flex justify-between text-sm">
                <span className="font-bold text-zinc-600">Shipping</span>
                <span className="font-bold text-zinc-900 font-mono whitespace-nowrap">{formatPrice(shipping)}</span>
              </div>
            )}
            <div className="flex justify-between text-lg pt-3 border-t border-zinc-200">
              <span className="font-black text-zinc-900">Grand Total</span>
              <span className="font-black text-zinc-900 font-mono whitespace-nowrap">{formatPrice(order.totalAmount)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="absolute bottom-12 left-0 right-0 text-center text-xs text-zinc-400 print:bottom-0">
          <p>Thank you for shopping with {storeName}.</p>
          <p>If you have any questions regarding this invoice, please contact support.</p>
        </div>

      </div>
    </div>
  )
}
