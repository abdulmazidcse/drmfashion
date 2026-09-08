"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import ProductCard from "./ProductCard"
import { useSettings } from "@/providers/SettingsProvider"

interface FlashSaleProps {
  products: any[]
}

export default function FlashSale({ products }: FlashSaleProps) {
  const { settings, loading } = useSettings()

  // Four units now, not three: the reference's band counts down in days as well,
  // and folding days into the hours figure produced readings like "62 Hours",
  // which is a worse answer to "how long have I got" than "02 days, 14 hours".
  const [timeLeft, setTimeLeft] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  // Basic countdown logic
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

  const title = settings["flash_sale_title"] || "Limited Time Offers"
  const description = settings["flash_sale_description"] || "Grab our premium collections at exclusive discounted prices before the timer runs out."

  // Nothing configured, or the deadline has passed — the clock is dropped
  // rather than shown reading four zeros, which advertises an expired sale.
  const hasCountdown =
    timeLeft.days + timeLeft.hours + timeLeft.minutes + timeLeft.seconds > 0

  const units: [number, string][] = [
    [timeLeft.days, "Days"],
    [timeLeft.hours, "Hrs"],
    [timeLeft.minutes, "Min"],
    [timeLeft.seconds, "Sec"],
  ]

  return (
    <section className="bg-sig-cream pb-12 pt-2.5 lg:pb-[70px]">
      <div className="sig-wrap">

        {/* ── Deal band ── */}
        <div className="relative grid items-center gap-10 overflow-hidden rounded-[26px] bg-sig-copper-600 px-7 py-10 text-white sm:px-14 sm:py-[52px] lg:grid-cols-[1.25fr_0.75fr] lg:rounded-sig-lg">
          {/* Aqua bloom in the top-right corner — the one place the secondary
              colour appears at full strength. Decorative, so it sits behind
              everything and takes no pointer events. */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -right-[90px] -top-[90px] h-[340px] w-[340px] rounded-full"
            style={{
              background:
                "radial-gradient(circle, rgba(53,199,210,0.42), transparent 68%)",
            }}
          />

          <div className="relative z-10">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-sig-copper-100">
              Flash deal
            </span>
            <h2 className="my-3.5 text-[30px] font-extrabold leading-[1.05] tracking-[-0.035em] sm:text-[40px]">
              {title}
            </h2>
            <p className="max-w-[44ch] text-[15px] leading-[1.7] text-white/80">
              {description}
            </p>
            <Link
              href="/shop"
              className="mt-[26px] inline-flex items-center justify-center gap-2.5 rounded-full bg-white px-[30px] py-[15px] text-sm font-bold text-sig-copper-700 transition-colors hover:bg-sig-copper-50"
            >
              Shop the sale →
            </Link>
          </div>

          {hasCountdown && (
            <div className="relative z-10 flex gap-3">
              {units.map(([value, label]) => (
                <div
                  key={label}
                  className="flex-1 rounded-[18px] border border-white/25 bg-white/[0.13] px-1.5 py-4 text-center"
                >
                  <b className="block text-[28px] font-extrabold tracking-[-0.03em] sm:text-[32px]">
                    {value.toString().padStart(2, "0")}
                  </b>
                  <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                    {label}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── What is actually on offer ── */}
        <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-4 lg:gap-5">
          {products.slice(0, 4).map((product) => (
            <ProductCard key={product.id} product={product} idPrefix="flash" />
          ))}
        </div>

      </div>
    </section>
  )
}
