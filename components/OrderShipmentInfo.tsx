"use client"

import { useState } from "react"
import { ExternalLink, Truck } from "lucide-react"

// ─── Shipment details ────────────────────────────────────────────────────────
// The storefront's view of what Admin → Deliveries recorded on an order:
// carrier, tracking number (a link when the carrier has a tracking page),
// estimated delivery and the shipped / delivered stamps. Used by the public
// track-order page and by the account page's order list and track tab.
// Renders nothing until at least one of those has a value.
// ─────────────────────────────────────────────────────────────────────────────

export type ShipmentFields = {
  status?: string
  shippingCarrier?: string | null
  shippingMethod?: string | null
  trackingNumber?: string | null
  trackingUrl?: string | null
  estimatedDeliveryAt?: string | null
  shippedAt?: string | null
  deliveredAt?: string | null
}

export function hasShipmentInfo(order: ShipmentFields | null | undefined): boolean {
  if (!order) return false
  return Boolean(
    order.shippingCarrier || order.trackingNumber || order.trackingUrl ||
    order.estimatedDeliveryAt || order.shippedAt || order.deliveredAt
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-[9px] text-zinc-400 uppercase font-bold">{label}</p>
      <div className="text-xs font-bold text-zinc-900 mt-0.5">{children}</div>
    </div>
  )
}

export default function OrderShipmentInfo({ order, className = "" }: { order: ShipmentFields; className?: string }) {
  // Captured once so the render stays pure; "overdue" only needs day precision.
  const [now] = useState(() => Date.now())
  if (!hasShipmentInfo(order)) return null

  const estimated = order.estimatedDeliveryAt ? new Date(order.estimatedDeliveryAt) : null
  const overdue = Boolean(estimated && order.status === "SHIPPED" && estimated.getTime() < now)
  const method = order.shippingMethod && order.shippingMethod !== order.shippingCarrier ? order.shippingMethod : null

  return (
    <div className={className}>
      <h2 className="text-xs font-black uppercase tracking-widest text-zinc-500 mb-4 flex items-center gap-2">
        <Truck className="w-3.5 h-3.5" /> Shipment
      </h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-4">
        {order.shippingCarrier && (
          <Field label="Carrier">
            {order.shippingCarrier}
            {method && <span className="block text-[10px] font-medium text-zinc-400 mt-0.5">{method}</span>}
          </Field>
        )}
        {order.trackingNumber && (
          <Field label="Tracking number">
            {order.trackingUrl ? (
              <a
                href={order.trackingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 font-mono underline underline-offset-2 hover:text-zinc-600 break-all"
              >
                {order.trackingNumber} <ExternalLink className="w-3 h-3 shrink-0" />
              </a>
            ) : (
              <span className="font-mono break-all">{order.trackingNumber}</span>
            )}
          </Field>
        )}
        {order.estimatedDeliveryAt && !order.deliveredAt && (
          <Field label="Estimated delivery">
            <span className={overdue ? "text-red-500" : ""}>{formatDate(order.estimatedDeliveryAt)}</span>
          </Field>
        )}
        {order.shippedAt && <Field label="Shipped">{formatDate(order.shippedAt)}</Field>}
        {order.deliveredAt && <Field label="Delivered">{formatDate(order.deliveredAt)}</Field>}
      </div>
      {order.trackingUrl && (
        <a
          href={order.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-5 inline-flex items-center gap-1.5 px-5 py-2.5 text-[10px] font-bold uppercase tracking-widest bg-zinc-950 text-white rounded-lg hover:bg-zinc-800 transition"
        >
          Track package <ExternalLink className="w-3 h-3" />
        </a>
      )}
    </div>
  )
}
