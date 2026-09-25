"use client"
import { ShoppingCart } from "lucide-react"
import type { OrderData } from "@/lib/landing/sections"
import { Field, inp } from "@/components/admin/landing/fieldHelpers"

export function OrderSettings({ data, onChange }: { data: OrderData; onChange: (patch: Partial<OrderData>) => void }) {
  return (
    <div className="space-y-4">
      <Field label="Heading">
        <input className={inp} value={data.heading} onChange={(e) => onChange({ heading: e.target.value })} />
      </Field>
      <Field label="Subheading">
        <input className={inp} value={data.subheading} onChange={(e) => onChange({ subheading: e.target.value })} />
      </Field>
      <Field label="Button Text">
        <input className={inp} value={data.buttonText} onChange={(e) => onChange({ buttonText: e.target.value })} />
      </Field>
      <p className="text-[10px] text-zinc-400">
        Products shown here come from the &ldquo;Content &amp; SEO&rdquo; tab&apos;s Featured Products list, not from this section.
      </p>
    </div>
  )
}

/**
 * The real order form needs live products/payments/shipping/tax that aren't
 * available while editing, so the canvas gets a simplified stand-in instead
 * of the actual cart/checkout — same trade-off PageBuilder makes for its own
 * data-driven blocks. Use "View on store" to see the real thing.
 */
export function OrderPreview({ data, productCount }: { data: OrderData; productCount: number }) {
  return (
    <div className="max-w-2xl mx-auto px-6 py-4 text-center">
      {data.heading && <h2 className="text-2xl font-black tracking-tight">{data.heading}</h2>}
      {data.subheading && <p className="mt-2 text-sm opacity-70">{data.subheading}</p>}
      <div className="mt-6 border-2 border-dashed border-zinc-300 rounded-xl p-8 flex flex-col items-center gap-2 text-zinc-400">
        <ShoppingCart className="w-6 h-6" />
        <p className="text-xs font-bold uppercase tracking-widest">Order Form</p>
        <p className="text-[11px]">{productCount} product{productCount === 1 ? "" : "s"} selected · {data.buttonText || "Place Order"}</p>
      </div>
    </div>
  )
}
