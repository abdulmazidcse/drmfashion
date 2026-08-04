"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { addToCart } from "@/lib/cart";
import { toggleWishlist, isInWishlist } from "@/lib/wishlist";
import { useCurrency } from "@/providers/CurrencyProvider";
import { useSettings } from "@/providers/SettingsProvider";

interface Variant {
  id: string;
  size: string;
  color: string;
  length: string | null;
  stock: number;
  price: number | null;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  /** Not rendered by the card — listing queries no longer select it. */
  description?: string;
  thumbnail: string;
  basePrice: number;
  discountPrice: number | null;
  flashSaleEndDate?: string | Date | null;
  featured: boolean;
  brand?: { name: string } | null;
  category?: { name: string; slug: string } | null;
  variants: Variant[];
}

interface ProductCardProps {
  product: Product;
  idPrefix?: string;
  priority?: boolean;
  showBadges?: boolean;
}

export default function ProductCard({
  product,
  idPrefix = "product",
  priority = false,
  showBadges = true,
}: ProductCardProps) {
  const { formatPrice } = useCurrency();
  const { storeName } = useSettings();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedLength, setSelectedLength] = useState<string>("");
  const [wishlisted, setWishlisted] = useState(false);
  const [added, setAdded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  React.useEffect(() => {
    if (product.flashSaleEndDate) {
      const target = new Date(product.flashSaleEndDate).getTime();
      const interval = setInterval(() => {
        const now = new Date().getTime();
        const distance = target - now;
        if (distance < 0) {
          clearInterval(interval);
          setTimeLeft(null);
        } else {
          const days = Math.floor(distance / (1000 * 60 * 60 * 24));
          const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
          const seconds = Math.floor((distance % (1000 * 60)) / 1000);
          setTimeLeft(`${days}d ${hours}h ${minutes}m ${seconds}s`);
        }
      }, 1000);
      return () => clearInterval(interval);
    }
  }, [product.flashSaleEndDate]);

  React.useEffect(() => {
    setWishlisted(isInWishlist(product.id));
    const handleUpdate = () => setWishlisted(isInWishlist(product.id));
    window.addEventListener("wishlist-updated", handleUpdate);
    return () => window.removeEventListener("wishlist-updated", handleUpdate);
  }, [product.id]);

  // Extract unique sizes, lengths, and colors from variants
  const uniqueSizes = Array.from(new Set(product.variants.map((v) => v.size))).filter(Boolean);
  const uniqueLengths = Array.from(
    new Set(product.variants.filter((v) => v.length).map((v) => v.length))
  ) as string[];
  const uniqueColors = Array.from(new Set(product.variants.map((v) => v.color))).filter(Boolean);

  const primaryColor = uniqueColors[0] || "Classic";
  const additionalColorsCount = uniqueColors.length - 1;
  const colorLabel =
    additionalColorsCount > 0
      ? `${primaryColor}, +${additionalColorsCount} colors`
      : primaryColor;

  const originalPrice = product.basePrice;
  const discountPrice = product.discountPrice;
  const hasDiscount = discountPrice && discountPrice < originalPrice;

  const activePrice = hasDiscount ? (discountPrice as number) : originalPrice;

  // Shown on the badge instead of the word "Sale" — a number converts better and
  // costs nothing to derive from the two prices already in hand.
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - (discountPrice as number)) / originalPrice) * 100)
    : 0;

  const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
  const isOutOfStock = totalStock === 0;
  const isLowStock = totalStock > 0 && totalStock <= 5;
  const isGiftCard = product.category?.slug === 'gift-cards' || product.category?.name === 'Gift Cards';

  const handleAddToCart = (overrideSize?: string, overrideLength?: string) => {
    const finalSize = overrideSize !== undefined ? overrideSize : (selectedSize || uniqueSizes[0] || "");
    const finalLength = overrideLength !== undefined ? overrideLength : (selectedLength || uniqueLengths[0] || "");
    const finalColor = primaryColor;

    addToCart({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      thumbnail: product.thumbnail,
      color: finalColor,
      size: finalSize,
      length: finalLength,
      price: activePrice,
    });

    setAdded(true);
    // Reset after 1.8 s
    setTimeout(() => setAdded(false), 1800);
  };

  const chip = "sg-chip absolute top-3.5 left-3.5 z-10 select-none text-white";

  return (
    <div
      className="group sg-card flex flex-col overflow-hidden transition-all duration-300 hover:-translate-y-1.5 hover:border-brand-200 hover:shadow-sg"
      id={`${idPrefix}-${product.id}`}
      // No `hovered` state here any more: it was write-only, so every pointer
      // enter/leave re-rendered the whole card (× up to 120 cards in a grid) to
      // produce no visual change. Hover visuals are pure CSS `group-hover`.
      onMouseLeave={() => setShowQuickAdd(false)}
    >
      {/* ── Thumbnail ── */}
      <div className="relative aspect-[4/5] bg-brand-50 w-full overflow-hidden">
        <Link href={`/product/${product.slug}`} className="absolute inset-0 block z-0">
          <Image
            src={product.thumbnail}
            alt={product.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            // `priority` was declared but never forwarded, so every card in every
            // grid rendered `loading="lazy"` — including the LCP element. Callers
            // now opt the first row in (see the grids in /shop, /men, /women, …).
            priority={priority}
            className="object-cover group-hover:scale-[1.05] transition-transform duration-700 select-none"
          />
        </Link>

        {/* Wishlist */}
        <button
          onClick={(e) => {
            e.preventDefault();
            toggleWishlist({
              productId: product.id,
              slug: product.slug,
              title: product.title,
              thumbnail: product.thumbnail,
              basePrice: product.basePrice,
              discountPrice: product.discountPrice
            });
          }}
          className="absolute top-3 right-3 z-10 w-9 h-9 rounded-full bg-white/95 shadow-sm grid place-items-center transition-all duration-200 cursor-pointer hover:bg-white"
          aria-label="Add to Wishlist"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={wishlisted ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            className={`w-4 h-4 transition-colors ${
              wishlisted ? "text-brand-600" : "text-soft group-hover:text-brand-600"
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 20s-7-4.5-7-9a4 4 0 017-2.5A4 4 0 0119 11c0 4.5-7 9-7 9z"
            />
          </svg>
        </button>

        {/* Badges — stock state first, then the discount, then the curator's pick */}
        {showBadges && (
          isOutOfStock ? (
            <span className={`${chip} bg-faint`}>Sold out</span>
          ) : isLowStock ? (
            <span className={`${chip} bg-amber-600`}>Only {totalStock} left</span>
          ) : hasDiscount ? (
            <span className={`${chip} bg-brand-600`}>−{discountPercent}%</span>
          ) : product.featured ? (
            <span className={`${chip} bg-foreground`}>Featured</span>
          ) : null
        )}

        {/* Flash Sale Timer */}
        {timeLeft && (
          <div className="absolute bottom-3.5 left-3.5 right-3.5 bg-brand-ink/90 backdrop-blur-sm text-white text-[11px] font-bold rounded-full text-center py-2 px-3 select-none z-10 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-300 animate-pulse"></span>
            Ends in {timeLeft}
          </div>
        )}

        {/* Quick Add — slides up on hover, hidden while the size sheet is open */}
        <button
          onMouseEnter={() => {
            if (!isOutOfStock && !isGiftCard) {
              setShowQuickAdd(true);
            }
          }}
          onClick={(e) => {
            e.preventDefault();
            if (isGiftCard) {
              handleAddToCart(uniqueSizes[0] || "", uniqueLengths[0] || "");
            } else {
              setShowQuickAdd(true);
            }
          }}
          disabled={isOutOfStock}
          className={`absolute bottom-4 left-4 right-4 py-3.5 rounded-full bg-white/95 backdrop-blur-sm text-foreground text-[12px] font-extrabold tracking-wide text-center transition-all duration-300 z-10 shadow-sg cursor-pointer hover:bg-brand-600 hover:text-white disabled:cursor-not-allowed disabled:bg-white/70 disabled:text-faint ${
            showQuickAdd || timeLeft ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
        >
          {added ? "Added ✓" : (isOutOfStock ? "Out of stock" : (isGiftCard ? "Add to bag" : "Quick add"))}
        </button>

        {/* ── Size and length sheet ── */}
        <div
          className={`absolute bottom-0 left-0 right-0 bg-white/97 backdrop-blur-md z-20 flex flex-col p-4 pt-7 rounded-t-[22px] border-t border-line transition-all duration-300 ease-out transform shadow-[0_-10px_40px_rgba(28,26,23,0.08)] ${
            showQuickAdd ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          <button
            onClick={(e) => {
              e.preventDefault();
              setShowQuickAdd(false);
            }}
            className="absolute top-2.5 right-3 text-faint hover:text-brand-700 font-bold text-sm cursor-pointer z-30 transition-colors"
            aria-label="Close selector"
          >
            ✕
          </button>

          <div className="flex flex-col gap-3.5 mb-4">
            {/* SIZE row */}
            <div>
              <p className="text-[10px] font-extrabold text-faint tracking-[0.14em] uppercase mb-1.5 text-center">
                Size
              </p>
              <div className="flex justify-center flex-wrap gap-1.5">
                {(uniqueSizes.length > 0 ? uniqueSizes : ["S", "M", "L", "XL", "2XL"]).map((size) => (
                  <button
                    key={size}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedSize(size === selectedSize ? "" : size);
                    }}
                    className={`px-3 py-1.5 text-[11px] font-bold uppercase rounded-full transition-all duration-200 border cursor-pointer ${
                      selectedSize === size
                        ? "bg-brand-600 rounded-full text-white border-brand-600"
                        : "bg-cream text-soft border-line hover:border-brand-400 hover:text-brand-700"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* LENGTH row */}
            <div>
              <p className="text-[10px] font-extrabold text-faint tracking-[0.14em] uppercase mb-1.5 text-center">
                Length
              </p>
              <div className="flex justify-center flex-wrap gap-1.5">
                {(uniqueLengths.length > 0 ? uniqueLengths : ["Regular", "Long"]).map((len) => (
                  <button
                    key={len}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedLength(len === selectedLength ? "" : len);
                    }}
                    className={`px-3.5 py-1.5 text-[11px] font-bold uppercase rounded-full transition-all duration-200 border cursor-pointer ${
                      selectedLength === len
                        ? "bg-brand-600 rounded-full text-white border-brand-600"
                        : "bg-cream text-soft border-line hover:border-brand-400 hover:text-brand-700"
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <button
            onClick={(e) => {
              e.preventDefault();
              if (selectedSize && selectedLength) {
                handleAddToCart();
                setShowQuickAdd(false);
              }
            }}
            disabled={!selectedSize || !selectedLength}
            className="sg-btn sg-btn-sm sg-btn-primary w-full"
          >
            {selectedSize && selectedLength ? "Add to bag" : "Select size & length"}
          </button>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="p-4 sm:px-5 flex flex-col flex-1">
        {(() => {
          const name = typeof storeName !== 'undefined' ? storeName : "Store";
          return (
            <span className="text-[10.5px] text-aqua-700 font-extrabold uppercase tracking-[0.14em] block mb-1.5">
              {product.category?.name || product.brand?.name || name}
            </span>
          );
        })()}

        {/* Title */}
        <h3 className="text-[15px] font-bold text-foreground leading-snug line-clamp-1 mb-1">
          <Link href={`/product/${product.slug}`} className="hover:text-brand-700 transition-colors">
            {product.title}
          </Link>
        </h3>

        {/* Colour label */}
        <span className="text-[12.5px] text-soft mb-3 block select-none line-clamp-1">
          {colorLabel}
        </span>

        {/* Pricing + add */}
        <div className="mt-auto flex items-center justify-between gap-3 select-none">
          <div className="flex items-baseline gap-2 min-w-0">
            <span className="text-[17px] font-extrabold text-brand-700">
              {formatPrice(activePrice)}
            </span>
            {hasDiscount && (
              <span className="text-[13px] text-faint line-through font-medium">
                {formatPrice(originalPrice)}
              </span>
            )}
          </div>
          <button
            onClick={(e) => {
              e.preventDefault();
              if (isOutOfStock) return;
              if (isGiftCard || (uniqueSizes.length <= 1 && uniqueLengths.length <= 1)) {
                handleAddToCart();
              } else {
                setShowQuickAdd(true);
              }
            }}
            disabled={isOutOfStock}
            aria-label="Add to bag"
            className="w-9 h-9 shrink-0 rounded-full bg-brand-50 text-brand-700 grid place-items-center text-lg font-bold transition-colors cursor-pointer group-hover:bg-brand-600 group-hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {added ? "✓" : "+"}
          </button>
        </div>
      </div>
    </div>
  );
}
