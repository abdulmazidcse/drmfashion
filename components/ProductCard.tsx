"use client";

import React, { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { addToCart, getCart } from "@/lib/cart";
import { existsWith, findVariant, sortLengths, sortSizes } from "@/lib/variants";
import { toggleWishlist, isInWishlist } from "@/lib/wishlist";
import { useCurrency } from "@/providers/CurrencyProvider";
import { useSettings } from "@/providers/SettingsProvider";
import { trackSelectItem } from "@/lib/analytics";
import { formatImageUrl } from "@/lib/utils";
import { productImageAlt } from "@/lib/imageMeta";
import { useColors } from "@/providers/ColorsProvider";
import { swatchStyle } from "@/lib/colorStyle";

interface Variant {
  id: string;
  size: string;
  color: string;
  length: string | null;
  stock: number;
  price: number | null;
  /** Fetched by PRODUCT_CARD_SELECT but never declared here, so the card could
   *  not see the colourway shots it was already being sent. */
  image?: string | null;
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
  /**
   * Which listing this card belongs to, for GA4's `select_item`. Defaults to
   * `idPrefix`, which every caller already sets — pass these only where the
   * list needs naming more precisely (a category page, say).
   */
  listId?: string;
  listName?: string;
  /**
   * `sizes` for the thumbnail. The default describes the grid nearly every
   * caller uses — two across on a phone, three or four on a desktop. Pass one
   * only where the layout genuinely differs (the wishlist is one column on a
   * phone), since an over-stated width makes the browser download a variant
   * several times larger than the slot it lands in.
   */
  sizes?: string;
}

export default function ProductCard({
  product,
  idPrefix = "product",
  priority = false,
  showBadges = true,
  listId,
  listName,
  sizes = "(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw",
}: ProductCardProps) {
  const { formatPrice } = useCurrency();
  const { storeName } = useSettings();
  const { getColor } = useColors();
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [selectedSize, setSelectedSize] = useState<string>("");
  const [selectedLength, setSelectedLength] = useState<string>("");
  const [addError, setAddError] = useState<string>("");
  const [wishlisted, setWishlisted] = useState(false);
  const [added, setAdded] = useState(false);
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [imageIndex, setImageIndex] = useState(0);

  // Pairs with view_item_list: without it GA4 can report which listings were
  // seen but not which ones actually earned the click.
  const reportSelect = () => {
    trackSelectItem(listId || idPrefix, listName || idPrefix, {
      item_id: product.id,
      item_name: product.title,
      price: product.discountPrice ?? product.basePrice,
      item_brand: product.brand?.name,
      item_category: product.category?.name,
    });
  };

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
  const uniqueSizes = sortSizes(
    Array.from(new Set(product.variants.map((v) => v.size))).filter(Boolean)
  );
  const uniqueLengths = sortLengths(
    Array.from(new Set(product.variants.filter((v) => v.length).map((v) => v.length))) as string[]
  );
  const uniqueColors = Array.from(new Set(product.variants.map((v) => v.color))).filter(Boolean);

  // Images the arrows page through: the thumbnail first, then each distinct
  // colourway shot. Built from data the card already receives, so this costs no
  // extra query across a 120-card grid.
  const gallery = Array.from(
    new Set(
      [product.thumbnail, ...product.variants.map((v) => v.image)]
        .filter((src): src is string => Boolean(src && src.trim()))
    )
  );

  // One entry per colourway: the Color row that paints the swatch, plus the
  // first variant image carrying that colour so clicking can switch the photo.
  // Colours come from ColorsProvider (server-injected in the root layout) —
  // `variant.color` is only a name, with no relation to the Color table.
  const colorOptions = uniqueColors.map((name) => ({
    name,
    swatch: getColor(name),
    image: product.variants.find((v) => v.color === name && v.image?.trim())?.image ?? null,
  }));

  const primaryColor = uniqueColors[0] || "Classic";

  // `gallery[0]` is the thumbnail, which belongs to no particular colourway;
  // every later entry is some variant's shot, so its colour can be named.
  const visibleShot = gallery[imageIndex];
  const colorOfVisibleShot =
    imageIndex === 0
      ? null
      : product.variants.find((v) => v.image === visibleShot)?.color ?? null;
  const additionalColorsCount = uniqueColors.length - 1;
  const colorLabel =
    additionalColorsCount > 0
      ? `${primaryColor}, +${additionalColorsCount} colors`
      : primaryColor;

  const originalPrice = product.basePrice;
  const discountPrice = product.discountPrice;
  const hasDiscount = discountPrice && discountPrice < originalPrice;

  const activePrice = hasDiscount ? (discountPrice as number) : originalPrice;

  // Each axis is filtered by the other, so the pair on screen is always one the
  // product is actually made in. Before either is chosen every value that
  // exists in *some* combination is offered; picking one narrows the other.
  //
  // Out of stock counts as unavailable here: this is a quick-add control, and a
  // size that cannot be bought is not worth offering.
  const sizeAvailable = (size: string) =>
    existsWith(product.variants, {
      color: primaryColor || undefined,
      size,
      length: selectedLength || undefined,
      inStockOnly: true,
    });

  const lengthAvailable = (len: string) =>
    existsWith(product.variants, {
      color: primaryColor || undefined,
      size: selectedSize || undefined,
      length: len,
      inStockOnly: true,
    });

  const totalStock = product.variants.reduce((acc, v) => acc + v.stock, 0);
  const isOutOfStock = totalStock === 0;
  const isLowStock = totalStock > 0 && totalStock <= 5;
  const isGiftCard = product.category?.slug === 'gift-cards' || product.category?.name === 'Gift Cards';

  const handleAddToCart = (overrideSize?: string, overrideLength?: string) => {
    const finalSize = overrideSize !== undefined ? overrideSize : (selectedSize || uniqueSizes[0] || "");
    const finalLength = overrideLength !== undefined ? overrideLength : (selectedLength || uniqueLengths[0] || "");
    const finalColor = primaryColor;

    // This used to add whatever pair was on screen without ever looking a
    // variant up, so an unmade combination — or a sold-out one — reached the
    // cart at the product's headline price and only failed at checkout.
    const variant = findVariant(product.variants, finalColor, finalSize, finalLength);
    if (!variant) {
      setAddError(`Not available in ${finalSize}${finalLength ? ` / ${finalLength}` : ""}.`);
      setTimeout(() => setAddError(""), 2600);
      return;
    }

    // addToCart stacks onto an existing line, so what is already in the bag
    // counts towards the stock level.
    const lineId = `${product.id}-${finalColor}-${finalSize}-${finalLength}`;
    const alreadyInCart = getCart().find((c) => c.id === lineId)?.quantity ?? 0;

    if (alreadyInCart + 1 > variant.stock) {
      setAddError(
        variant.stock === 0
          ? "Out of stock."
          : `Only ${variant.stock} left${alreadyInCart ? ` — ${alreadyInCart} already in your bag` : ""}.`
      );
      setTimeout(() => setAddError(""), 2600);
      return;
    }

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

  return (
    <div
      className="flex flex-col group bg-white border border-zinc-100/60 transition-all duration-300 rounded-sm overflow-hidden"
      id={`${idPrefix}-${product.id}`}
      // No `hovered` state here any more: it was write-only, so every pointer
      // enter/leave re-rendered the whole card (× up to 120 cards in a grid) to
      // produce no visual change. Hover visuals are pure CSS `group-hover`.
      onMouseLeave={() => setShowQuickAdd(false)}
    >
      {/* ── Thumbnail ── */}
      <div className="relative aspect-[3/4] bg-zinc-50 w-full overflow-hidden">
        <Link href={`/product/${product.slug}`} onClick={reportSelect} className="absolute inset-0 block z-0">
          <Image
            src={formatImageUrl(gallery[imageIndex] ?? product.thumbnail)}
            // The arrows page through colourway shots, so the alt names the one
            // actually on screen rather than staying on the title throughout.
            alt={productImageAlt({
              title: product.title,
              brand: product.brand?.name,
              color: colorOfVisibleShot,
            })}
            fill
            sizes={sizes}
            // `priority` was declared but never forwarded, so every card in every
            // grid rendered `loading="lazy"` — including the LCP element. Callers
            // now opt the first row in (see the grids in /shop, /men, /women, …).
            priority={priority}
            className="object-cover group-hover:scale-[1.02] transition-transform duration-700 select-none"
          />
        </Link>

        {/* Wishlist bookmark */}
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
          className="absolute top-3 right-3 z-10 p-2 rounded-full bg-white/80 hover:bg-white shadow-sm transition-all duration-200 cursor-pointer"
          aria-label="Add to Wishlist"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={wishlisted ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.5"
            className={`w-4 h-4 transition-colors ${
              wishlisted ? "text-zinc-950 fill-zinc-950" : "text-zinc-500 hover:text-zinc-950"
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
            />
          </svg>
        </button>

        {/* Badges — featured takes priority over sale */}
        {isOutOfStock ? (
          <span className="absolute top-3 left-3 bg-zinc-400 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-1 select-none z-10">
            Sold Out
          </span>
        ) : isLowStock ? (
          <span className="absolute top-3 left-3 bg-amber-500 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-1 select-none z-10">
            Low Stock
          </span>
        ) : product.featured && !hasDiscount ? (
          <span className="absolute top-3 left-3 bg-zinc-950 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-1 select-none z-10">
            Featured
          </span>
        ) : hasDiscount ? (
          <span className="absolute top-3 left-3 bg-red-600 text-white text-[9px] font-bold tracking-widest uppercase px-2 py-1 select-none z-10">
            Sale
          </span>
        ) : null}

        {/* Flash Sale Timer */}
        {timeLeft && (
          <div className="absolute bottom-3 left-3 right-3 bg-zinc-950/90 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider text-center py-1.5 px-2 select-none z-10 rounded-sm flex items-center justify-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse"></span>
            Ends in {timeLeft}
          </div>
        )}

        {/* Left and Right navigation arrows on hover.
            Hidden when there is only one image — arrows that cannot go anywhere
            are what made these look broken in the first place. `preventDefault`
            keeps the click off the full-card <Link> underneath. */}
        {gallery.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Previous image"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setImageIndex((i) => (i - 1 + gallery.length) % gallery.length);
              }}
              className="absolute top-1/2 -translate-y-1/2 left-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-2xl font-light cursor-pointer select-none bg-black/10 hover:bg-black/30 w-8 h-8 rounded-full flex items-center justify-center"
            >
              &lt;
            </button>
            <button
              type="button"
              aria-label="Next image"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setImageIndex((i) => (i + 1) % gallery.length);
              }}
              className="absolute top-1/2 -translate-y-1/2 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 text-white text-2xl font-light cursor-pointer select-none bg-black/10 hover:bg-black/30 w-8 h-8 rounded-full flex items-center justify-center"
            >
              &gt;
            </button>
          </>
        )}

        {/* Quick Add overlay button on hover */}
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
          className={`absolute bottom-6 left-6 right-6 py-4 bg-zinc-950/40 backdrop-blur-md text-white text-[12px] font-extrabold uppercase tracking-widest text-center transition-all duration-300 z-10 hover:bg-zinc-950 shadow-lg cursor-pointer disabled:cursor-not-allowed disabled:bg-zinc-400/80 ${
            showQuickAdd ? 'opacity-0 translate-y-4 pointer-events-none' : 'opacity-0 translate-y-4 group-hover:opacity-100 group-hover:translate-y-0'
          }`}
        >
          {added ? "Added!" : (isOutOfStock ? "Out of Stock" : (isGiftCard ? "Add to Cart" : "Quick Add"))}
        </button>

        {/* ── Frosted size and length selector overlay ── */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md z-20 flex flex-col p-4 pt-8 border-t border-zinc-200/80 transition-all duration-300 ease-out transform shadow-[0_-10px_40px_rgba(0,0,0,0.05)] ${
            showQuickAdd ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          {/* Close button */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              setShowQuickAdd(false);
            }}
            className="absolute top-2 right-3 text-zinc-400 hover:text-black font-bold text-sm cursor-pointer z-30 transition-colors"
            aria-label="Close selector"
          >
            ✕
          </button>

          <div className="flex flex-col gap-4 mb-4">
            {/* SIZE row */}
            <div>
              <p className="text-[9px] font-black text-zinc-500 tracking-widest uppercase mb-1 text-center">
                SIZE
              </p>
              <div className="flex justify-center flex-wrap gap-1.5">
                {(uniqueSizes.length > 0 ? uniqueSizes : ["S", "M", "L", "XL", "2XL"]).map((size) => (
                  <button
                    key={size}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedSize(size === selectedSize ? "" : size);
                    }}
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer rounded-sm ${
                      selectedSize === size
                        ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
                        : "bg-white/50 text-zinc-700 border-zinc-200 hover:border-zinc-700 hover:text-zinc-950"
                    }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>

            {/* LENGTH row */}
            <div>
              <p className="text-[9px] font-black text-zinc-500 tracking-widest uppercase mb-1 text-center">
                LENGTH
              </p>
              <div className="flex justify-center flex-wrap gap-2">
                {(uniqueLengths.length > 0 ? uniqueLengths : ["Tall", "Extra Tall"]).map((len) => (
                  <button
                    key={len}
                    onClick={(e) => {
                      e.preventDefault();
                      setSelectedLength(len === selectedLength ? "" : len);
                    }}
                    className={`px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer rounded-sm ${
                      selectedLength === len
                        ? "bg-zinc-950 text-white border-zinc-950 shadow-sm"
                        : "bg-white/50 text-zinc-700 border-zinc-200 hover:border-zinc-700 hover:text-zinc-950"
                    }`}
                  >
                    {len}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Select Size & Length CTA */}
          <button
            onClick={(e) => {
              e.preventDefault();
              if (selectedSize && selectedLength) {
                handleAddToCart();
                setShowQuickAdd(false);
              }
            }}
            disabled={!selectedSize || !selectedLength}
            className={`w-full py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-300 text-center rounded-sm shadow-sm cursor-pointer ${
              selectedSize && selectedLength
                ? "bg-zinc-900 text-white hover:bg-black active:scale-[0.98]"
                : "bg-zinc-800/40 text-zinc-650 cursor-not-allowed"
            }`}
          >
            {selectedSize && selectedLength ? "Add to Cart" : "Select Size & Length"}
          </button>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="py-4 px-4 sm:px-5 flex flex-col flex-1">
        {(() => {
          const name = typeof storeName !== 'undefined' ? storeName : "Store";
          return (
            <span className="text-[10px] text-zinc-500 font-bold uppercase tracking-widest block mb-1">
              {product.brand?.name || name} / {product.category?.name || "CLOTHING"}
            </span>
          );
        })()}

        {/* Title */}
        <h3 className="text-[13px] font-bold text-zinc-900 tracking-wide uppercase line-clamp-1 mb-1 leading-snug">
          <Link href={`/product/${product.slug}`} onClick={reportSelect} className="hover:text-zinc-600 transition-colors">
            {product.title}
          </Link>
        </h3>

        {/* Colour label, swapped for clickable swatches on hover.
            Both layers are stacked in a fixed-height box and cross-faded with
            `group-hover`, so the row never reflows and hovering costs no
            re-render — the card is rendered up to 120× in a grid. */}
        {colorOptions.length > 1 ? (
          <div className="relative h-5 mb-1.5">
            <span className="absolute inset-0 flex items-center text-xs text-zinc-400 font-medium select-none opacity-100 group-hover:opacity-0 transition-opacity duration-200">
              {colorLabel}
            </span>
            <div className="absolute inset-0 flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
              {colorOptions.map((c) => {
                const isActive = Boolean(c.image) && gallery[imageIndex] === c.image;
                return (
                  <button
                    key={c.name}
                    type="button"
                    title={c.name}
                    aria-label={`Show ${c.name}`}
                    disabled={!c.image}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const i = c.image ? gallery.indexOf(c.image) : -1;
                      if (i >= 0) setImageIndex(i);
                    }}
                    className={`h-5 shrink-0 rounded-full border p-[2px] transition-all duration-200 ${
                      isActive ? "w-8 border-zinc-950" : "w-5 border-zinc-200 hover:border-zinc-400"
                    } ${c.image ? "cursor-pointer" : "cursor-default opacity-50"}`}
                  >
                    {/* The painted chip itself. swatchStyle() handles SOLID,
                        GRADIENT, CHECK and IMAGE, so a striped or two-tone
                        colourway reads the same here as on the product page.
                        A name with no Color row falls back to flat grey. */}
                    <span
                      className="block h-full w-full rounded-full"
                      style={swatchStyle(c.swatch ?? { value: "#71717a" })}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          <span className="text-xs text-zinc-400 font-medium mb-1.5 block select-none">
            {colorLabel}
          </span>
        )}

        {/* Pricing */}
        <div className="flex items-center gap-2 mb-1.5 select-none">
          {hasDiscount ? (
            <>
              <span className="text-[13px] font-black text-red-600">
                {formatPrice(discountPrice as number)}
              </span>
              <span className="text-[11px] text-zinc-400 line-through font-light">
                {formatPrice(originalPrice)}
              </span>
            </>
          ) : (
            <span className="text-[13px] font-black text-zinc-900">
              {formatPrice(originalPrice)}
            </span>
          )}
        </div>


      </div>
    </div>
  );
}
