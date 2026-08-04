"use client"

import { useState, useEffect, useRef } from "react"
import ProductCard from "@/components/ProductCard"

interface ShopProductListProps {
  initialProducts: any[]
}

const BATCH_SIZE = 8

export default function ShopProductList({ initialProducts }: ShopProductListProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const observerRef = useRef<HTMLDivElement | null>(null)

  const visibleProducts = initialProducts.slice(0, visibleCount)
  const hasMore = visibleCount < initialProducts.length

  // Reset pagination if initialProducts changes (e.g. active filter/category changed!)
  useEffect(() => {
    setVisibleCount(BATCH_SIZE)
  }, [initialProducts])

  // Load next batch function. The batch is already in memory — it came down with
  // the RSC payload — so this is pure state, no fetch and no reason to stall.
  const loadNextBatch = () => {
    if (!hasMore) return
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, initialProducts.length))
  }

  // Setup intersection observer for infinite scroll
  useEffect(() => {
    if (!hasMore) return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadNextBatch()
        }
      },
      { threshold: 0.05, rootMargin: "150px" } // Trigger 150px before reaching bottom
    )

    const currentRef = observerRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasMore, visibleCount, initialProducts])

  return (
    <div className="space-y-12">
      {/* Products Grid */}
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
        {visibleProducts.map((product, idx) => {
          // The first batch is server-rendered and contains the LCP element, so it
          // paints as-is. `animation: … both` starts at opacity 0 and staggered up
          // to 450ms, which held the largest image back from counting as painted.
          // Only batches appended after hydration animate in.
          const isInitialBatch = idx < BATCH_SIZE
          return (
            <div
              key={product.id}
              className="transition-all duration-500 ease-out"
              style={
                isInitialBatch
                  ? undefined
                  : {
                      animation: "fadeUp 0.6s cubic-bezier(0.16, 1, 0.3, 1) both",
                      animationDelay: `${Math.min((idx % BATCH_SIZE) * 60, 450)}ms`,
                    }
              }
            >
              {/* First row only — opts these out of `loading="lazy"`. */}
              <ProductCard product={product} idPrefix="shop" priority={idx < 4} />
            </div>
          )
        })}
      </div>

      {/* The inline <style> that used to sit here redefined `@keyframes fadeIn`.
          Being injected into the body it landed after globals.css and silently
          overrode the global `fadeIn` (and therefore `.animate-fade-in`) for the
          whole page. `fadeUp` in globals.css is the same effect, already loaded. */}

      {/* Trigger Area */}
      {hasMore && (
        <div ref={observerRef} className="flex flex-col items-center justify-center py-10 border-t border-line mt-12">
          <button
            type="button"
            onClick={loadNextBatch}
            className="px-10 py-4 bg-brand-600 text-white text-[10px] font-extrabold uppercase tracking-[0.14em] hover:bg-brand-700 transition-all shadow-sm rounded-full cursor-pointer"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
