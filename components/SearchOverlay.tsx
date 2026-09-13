"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { useCurrency } from "@/providers/CurrencyProvider";
import { MIN_SEARCH_LENGTH } from "@/lib/search";

interface SearchProduct {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  basePrice: number;
  discountPrice: number | null;
  category?: { name: string } | null;
  brand?: { name: string } | null;
  /** The colourway the query named, when it named one. */
  matchedColor?: string | null;
}

interface SearchOverlayProps {
  onClose: () => void;
  /** Suggestion list shown alongside the results. Hidden when empty. */
  popular?: string[];
}

/** Long enough that a fast typist sends one request, short enough to feel live. */
const DEBOUNCE_MS = 250;

/**
 * The header's search panel.
 *
 * Mounted only while open — the caller unmounts it on close, which is what
 * clears the query and the last result set. Keeping it mounted would mean
 * mirroring `open` into four pieces of state on every close.
 */
export default function SearchOverlay({ onClose, popular = [] }: SearchOverlayProps) {
  const router = useRouter();
  const { formatPrice } = useCurrency();

  const [query, setQuery] = useState("");
  const [products, setProducts] = useState<SearchProduct[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  /**
   * Which query the products on screen belong to. A string rather than a
   * `searched` flag so "nothing matched" is only claimed about the text the
   * shopper has actually finished typing, never about a half-typed word.
   */
  const [resultsFor, setResultsFor] = useState("");

  /**
   * Responses can land out of order — a three-letter query started first may
   * resolve after the five-letter one that replaced it, and would then paint
   * stale products under the newer text. Only the latest request writes state.
   */
  const requestId = useRef(0);

  // Escape to close, and the page behind must not scroll under the panel.
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handleKey);
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", handleKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  useEffect(() => {
    const trimmed = query.trim();

    // Too short to search. Bumping the id retires anything in flight; the
    // panel decides what to show from `query` itself, so there is no state to
    // wind back here.
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      requestId.current += 1;
      return;
    }

    const id = ++requestId.current;
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
        if (!res.ok) throw new Error(`Search failed: ${res.status}`);
        const data = await res.json();
        if (id !== requestId.current) return;
        setProducts(Array.isArray(data.products) ? data.products : []);
        setTotal(typeof data.total === "number" ? data.total : 0);
      } catch (err) {
        if (id !== requestId.current) return;
        console.error("[SEARCH_OVERLAY_ERROR]", err);
        setProducts([]);
        setTotal(0);
      } finally {
        if (id === requestId.current) {
          setLoading(false);
          setResultsFor(trimmed);
        }
      }
    }, DEBOUNCE_MS);

    return () => clearTimeout(timer);
  }, [query]);

  const goToResults = useCallback(
    (term: string) => {
      const trimmed = term.trim();
      if (!trimmed) return;
      router.push(`/shop?query=${encodeURIComponent(trimmed)}`);
      onClose();
    },
    [router, onClose]
  );

  const trimmed = query.trim();
  const hasQuery = trimmed.length >= MIN_SEARCH_LENGTH;
  // Results from the previous keystroke stay up while the next request runs,
  // so the grid does not blink empty between letters.
  const showGrid = hasQuery && products.length > 0;
  const showSkeleton = hasQuery && loading && products.length === 0;
  const showEmptyState = hasQuery && !loading && resultsFor === trimmed && products.length === 0;

  return (
    <div
      className="fixed inset-0 z-100 flex items-start justify-center overflow-y-auto bg-sig-ink/60 px-4 pt-14 pb-8 backdrop-blur-md animate-in fade-in duration-200 sm:px-6 sm:pt-16"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Search products"
    >
      <button
        onClick={onClose}
        className="fixed top-3 left-3 z-110 grid h-10 w-10 cursor-pointer place-items-center rounded-full bg-sig-card text-sig-ink transition-colors hover:bg-sig-copper-50"
        aria-label="Close search"
      >
        <X className="h-4 w-4" />
      </button>

      <div className="w-full max-w-5xl" onClick={(e) => e.stopPropagation()}>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            goToResults(query);
          }}
        >
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search for ..."
            className="w-full rounded-full border border-white/40 bg-white/15 px-7 py-4 text-xl font-light text-white outline-none backdrop-blur-sm transition-colors placeholder:text-white/70 focus:border-white sm:text-2xl"
            aria-label="Search products"
            autoFocus
          />
        </form>

        <div className="mt-8 grid grid-cols-1 gap-8 md:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          {/* Left rail: the suggestions, and the way out to the full results
              page. Stays put while results load so the panel does not jump. */}
          <div>
            {popular.length > 0 && (
              <>
                <h2 className="text-sm font-bold uppercase tracking-[0.09em] text-white/70">
                  Popular Searches
                </h2>
                <ul className="mt-4 flex flex-wrap gap-2 md:flex-col md:gap-2.5">
                  {popular.map((term) => (
                    <li key={term}>
                      <button
                        type="button"
                        onClick={() => setQuery(term)}
                        className="cursor-pointer rounded-full border border-white/25 px-[15px] py-2 text-[13px] font-semibold text-white/90 transition-colors hover:border-white hover:bg-white/10 hover:text-white md:w-fit"
                      >
                        {term}
                      </button>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {hasQuery && (
              <button
                type="button"
                onClick={() => goToResults(query)}
                className={`${popular.length > 0 ? "mt-8" : ""} w-full cursor-pointer rounded-full bg-sig-copper-600 px-6 py-4 text-sm font-bold text-white transition-colors hover:bg-sig-copper-500`}
              >
                View All Results{total > 0 ? ` (${total})` : ""}
              </button>
            )}
          </div>

          {/* Right: the preview grid. */}
          <div>
            {showSkeleton && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-[4/5] w-full rounded-sig bg-white/20" />
                    <div className="mt-3 h-3 w-3/4 rounded-full bg-white/20" />
                    <div className="mt-2 h-3 w-1/3 rounded-full bg-white/20" />
                  </div>
                ))}
              </div>
            )}

            {showGrid && (
              <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4">
                {products.map((product) => {
                  const hasDiscount =
                    product.discountPrice !== null && product.discountPrice < product.basePrice;
                  const activePrice = hasDiscount
                    ? (product.discountPrice as number)
                    : product.basePrice;

                  return (
                    <Link
                      key={product.id}
                      href={`/product/${product.slug}`}
                      onClick={onClose}
                      className="group block"
                    >
                      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-sig bg-sig-copper-50">
                        {product.thumbnail ? (
                          <Image
                            src={product.thumbnail}
                            alt={product.title}
                            fill
                            sizes="(max-width: 640px) 50vw, 170px"
                            className="object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                        ) : null}
                      </div>
                      {/* The colourway is part of the name here, not a separate
                          line: the shopper asked for "chinos blue" and this is
                          the blue one, so it reads as what the card *is*. */}
                      <h3 className="mt-2.5 line-clamp-2 text-[13px] leading-snug font-semibold text-white">
                        {product.title}
                        {product.matchedColor ? ` in ${product.matchedColor}` : ""}
                      </h3>
                      <p className="mt-1 text-[13px] font-semibold text-white/90">
                        {formatPrice(activePrice)}
                        {hasDiscount && (
                          <span className="ml-2 font-normal text-white/60 line-through">
                            {formatPrice(product.basePrice)}
                          </span>
                        )}
                      </p>
                    </Link>
                  );
                })}
              </div>
            )}

            {showEmptyState && (
              <p className="text-base text-white/80">
                No products match &ldquo;{trimmed}&rdquo;. Try a shorter or different word.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
