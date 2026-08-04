"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import ProductCard from "./ProductCard"
import { useSettings } from "@/providers/SettingsProvider"

interface FlashSaleProps {
  products: any[]
}

/**
 * Signature deal band: a copper panel carrying the offer and the countdown, with
 * the discounted products in a plain grid underneath. The countdown itself is
 * unchanged — it still reads `flash_sale_end_date` from settings and ticks once
 * a second; only the shell around it is new.
 */
export default function FlashSale({ products }: FlashSaleProps) {
  const { settings, loading } = useSettings()

  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  useEffect(() => {
    if (loading) return;

    const endDateStr = settings["flash_sale_end_date"];
    if (!endDateStr) {
      setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const endTarget = new Date(endDateStr).getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTarget - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds })
    }, 1000)

    return () => clearInterval(timer)
  }, [loading, settings])

  if (loading || !products || products.length === 0) return null

  if (settings["flash_sale_enabled"] === "false") {
    return null;
  }

  const title = settings["flash_sale_title"] || "Limited time offers"
  const description = settings["flash_sale_description"] || "Grab our premium collections at exclusive discounted prices before the timer runs out."

  const pad = (n: number) => n.toString().padStart(2, "0")
  const units = [
    { value: pad(timeLeft.days), label: "Days" },
    { value: pad(timeLeft.hours), label: "Hrs" },
    { value: pad(timeLeft.minutes), label: "Min" },
    { value: pad(timeLeft.seconds), label: "Sec" },
  ]

  return (
    <section className="w-full max-w-[1400px] mx-auto px-5 sm:px-7 py-10 lg:py-14">
      <div className="relative overflow-hidden rounded-sg-lg bg-brand-600 text-white p-8 sm:p-12 lg:p-14 grid grid-cols-1 lg:grid-cols-[1.25fr_.75fr] gap-10 items-center">
        {/* Cyan bloom in the corner — the one place the secondary brand colour
            gets to be large, and it keeps the copper panel from going flat. */}
        <div
          className="pointer-events-none absolute -right-24 -top-24 w-[340px] h-[340px] rounded-full"
          style={{ background: "radial-gradient(circle, rgba(53,199,210,.42), transparent 68%)" }}
          aria-hidden="true"
        />

        <div className="relative z-10">
          <span className="sg-kicker text-brand-100">Flash sale</span>
          <h2 className="text-[30px] sm:text-[40px] font-extrabold leading-[1.06] mt-3">{title}</h2>
          <p className="text-white/80 text-[15px] leading-relaxed mt-4 max-w-[44ch]">{description}</p>
          <Link href="/shop" className="sg-btn bg-white text-brand-700 hover:bg-brand-50 mt-7">
            Shop the sale →
          </Link>
        </div>

        <div className="relative z-10 flex gap-3">
          {units.map((u) => (
            <div
              key={u.label}
              className="flex-1 rounded-[18px] bg-white/[0.13] border border-white/25 py-4 px-1.5 text-center backdrop-blur-sm"
            >
              <span className="block text-[30px] sm:text-[34px] font-extrabold leading-none tabular-nums">{u.value}</span>
              <span className="block text-[11px] font-bold uppercase tracking-[0.14em] text-white/70 mt-2">{u.label}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mt-6">
        {products.slice(0, 4).map((product) => (
          <ProductCard key={product.id} product={product} idPrefix="flash" />
        ))}
      </div>
    </section>
  )
}
