"use client"

import { useState, useEffect, useRef } from "react"
import ProductCard from "@/components/ProductCard"
import { trackViewItemList, type AnalyticsItem } from "@/lib/analytics"
import { searchResultColor } from "@/lib/search"

interface ShopProductListProps {
  initialProducts: any[]
  /**
   * What was searched for, when the listing is a search result. Cards then
   * name the colourway the query asked for, the way the header's suggestion
   * panel does. Empty while browsing a category, which leaves titles alone.
   */
  query?: string
}

const BATCH_SIZE = 8

export default function ShopProductList({ initialProducts, query = "" }: ShopProductListProps) {
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE)
  const observerRef = useRef<HTMLDivElement | null>(null)

  const visibleProducts = initialProducts.slice(0, visibleCount)
  const hasMore = visibleCount < initialProducts.length

  // Reset pagination if initialProducts changes (e.g. active filter/category changed!)
  useEffect(() => {
    setVisibleCount(BATCH_SIZE)
  }, [initialProducts])

  // GA4 view_item_list. Reports the whole result set rather than the first
  // batch: the rest is already in memory and scrolling reveals it without any
  // further server round trip, so batching would under-report the listing.
  const listKey = initialProducts.map((p) => p.id).join(",")
  useEffect(() => {
    const items: AnalyticsItem[] = initialProducts.map((p) => ({
      item_id: p.id,
      item_name: p.title,
      price: p.discountPrice ?? p.basePrice,
      item_brand: p.brand?.name,
      item_category: p.category?.name,
    }))
    trackViewItemList("shop", "Shop", items)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey])

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
              <ProductCard
                product={product}
                idPrefix="shop"
                listId="shop"
                listName="Shop"
                priority={idx < 4}
                matchedColor={query ? searchResultColor(query, product.variants ?? []) : null}
              />
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
        <div ref={observerRef} className="flex flex-col items-center justify-center py-10 border-t border-zinc-100 mt-12">
          <button
            type="button"
            onClick={loadNextBatch}
            className="px-10 py-4 bg-zinc-950 text-white text-[10px] font-black uppercase tracking-widest hover:bg-zinc-800 transition-all shadow-sm rounded-sm cursor-pointer"
          >
            Load More
          </button>
        </div>
      )}
    </div>
  )
}
