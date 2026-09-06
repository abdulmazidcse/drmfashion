"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Timer, ArrowRight, Zap } from "lucide-react"
import ProductCard from "./ProductCard"
import { useSettings } from "@/providers/SettingsProvider"

interface FlashSaleProps {
  products: any[]
}

export default function FlashSale({ products }: FlashSaleProps) {
  const { settings, loading } = useSettings()
  
  const [timeLeft, setTimeLeft] = useState({
    hours: 0,
    minutes: 0,
    seconds: 0
  })

  // Basic countdown logic
  useEffect(() => {
    if (loading) return;

    const endDateStr = settings["flash_sale_end_date"];
    if (!endDateStr) {
      setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
      return;
    }

    const endTarget = new Date(endDateStr).getTime();

    const timer = setInterval(() => {
      const now = new Date().getTime();
      const distance = endTarget - now;

      if (distance < 0) {
        clearInterval(timer);
        setTimeLeft({ hours: 0, minutes: 0, seconds: 0 });
        return;
      }

      // Calculate days, hours, minutes and seconds
      const days = Math.floor(distance / (1000 * 60 * 60 * 24));
      // Add days to hours so it displays total hours
      const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)) + (days * 24);
      const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((distance % (1000 * 60)) / 1000);

      setTimeLeft({ hours, minutes, seconds })
    }, 1000)

    return () => clearInterval(timer)
  }, [loading, settings])

  if (loading || !products || products.length === 0) return null

  if (settings["flash_sale_enabled"] === "false") {
    return null;
  }

  const title = settings["flash_sale_title"] || "Limited Time Offers"
  const description = settings["flash_sale_description"] || "Grab our premium collections at exclusive discounted prices before the timer runs out."

  return (
    <section className="w-full py-16 sm:py-24 bg-zinc-950 text-white overflow-hidden relative">
      <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #3f3f46 1px, transparent 1px)', backgroundSize: '24px 24px' }}></div>
      
      <div className="max-w-[1600px] mx-auto px-6 lg:px-8 relative z-10">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
          
          <div className="space-y-4 max-w-xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-at-peach text-at-ink text-[10px] font-bold uppercase tracking-widest rounded-at-btn animate-pulse">
              <Zap className="w-3 h-3" /> Flash Sale
            </div>
            <h2 className="at-heading text-at-subheading">{title}</h2>
            <p className="text-zinc-400 font-light text-sm">{description}</p>
          </div>

          <div className="flex flex-col items-start md:items-end gap-3">
            <div className="flex items-center gap-4 text-center">
              <div className="bg-zinc-900 border border-zinc-800 rounded-at-btn p-3 min-w-[70px]">
                <span className="block text-2xl font-black text-white">{timeLeft.hours.toString().padStart(2, '0')}</span>
                <span className="block text-[9px] uppercase tracking-widest text-zinc-500 mt-1">Hours</span>
              </div>
              <span className="text-2xl font-black text-zinc-600">:</span>
              <div className="bg-zinc-900 border border-zinc-800 rounded-at-btn p-3 min-w-[70px]">
                <span className="block text-2xl font-black text-white">{timeLeft.minutes.toString().padStart(2, '0')}</span>
                <span className="block text-[9px] uppercase tracking-widest text-zinc-500 mt-1">Mins</span>
              </div>
              <span className="text-2xl font-black text-zinc-600">:</span>
              <div className="bg-zinc-900 border border-zinc-800 rounded-at-btn p-3 min-w-[70px]">
                <span className="block text-2xl font-black text-at-peach">{timeLeft.seconds.toString().padStart(2, '0')}</span>
                <span className="block text-[9px] uppercase tracking-widest text-zinc-500 mt-1">Secs</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-[5px]">
          {products.slice(0, 4).map((product, idx) => (
            <div key={product.id} className="bg-white text-zinc-950 transform hover:-translate-y-2 transition-transform duration-300">
              <ProductCard product={product} idPrefix="flash" />
            </div>
          ))}
        </div>

        <div className="mt-12 text-center">
          <Link href="/shop" className="inline-flex items-center gap-2 border-b-2 border-white pb-1 text-xs font-bold uppercase tracking-widest hover:text-zinc-400 hover:border-zinc-400 transition-colors">
            View All Offers <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </section>
  )
}
