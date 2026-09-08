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

  // Rounded, and only trusted above zero: a rounding-to-0 discount would put a
  // "-0%" chip on the card, which reads as broken rather than as a small saving.
  const discountPercent = hasDiscount
    ? Math.round(((originalPrice - (discountPrice as number)) / originalPrice) * 100)
    : 0;

  // The corner chip. One string so the four states below differ only in colour.
  const chipClass =
    "absolute top-3 left-3 z-10 select-none rounded-full px-3 py-1.5 text-[11px] font-extrabold text-white";

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
      className="flex flex-col group bg-sig-card border border-sig-line rounded-sig overflow-hidden transition-all duration-300 hover:-translate-y-[5px] hover:border-sig-copper-200 hover:shadow-sig"
      id={`${idPrefix}-${product.id}`}
      // No `hovered` state here any more: it was write-only, so every pointer
      // enter/leave re-rendered the whole card (× up to 120 cards in a grid) to
      // produce no visual change. Hover visuals are pure CSS `group-hover`.
      onMouseLeave={() => setShowQuickAdd(false)}
    >
      {/* ── Thumbnail ── */}
      <div className="relative aspect-[4/5] bg-sig-copper-50 w-full overflow-hidden">
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
            className="object-cover group-hover:scale-[1.05] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)] select-none"
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
          className="absolute top-2.5 right-2.5 z-10 grid h-9 w-9 place-items-center rounded-full bg-white/95 shadow-[0_4px_12px_rgba(0,0,0,0.08)] transition-all duration-200 hover:bg-white cursor-pointer"
          aria-label="Add to Wishlist"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill={wishlisted ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth="1.8"
            className={`w-[17px] h-[17px] transition-colors ${
              wishlisted
                ? "text-sig-copper-600 fill-sig-copper-600"
                : "text-sig-soft group-hover:text-sig-copper-600"
            }`}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 20s-7-4.5-7-9a4 4 0 017-2.5A4 4 0 0119 11c0 4.5-7 9-7 9z"
            />
          </svg>
        </button>

        {/* Badges — featured takes priority over sale */}
        {/* One chip, four states. Copper is the default; aqua marks stock
            warnings and ink marks "featured", so the discount percentage — the
            only one a shopper acts on — keeps the loudest colour. */}
        {isOutOfStock ? (
          <span className={`${chipClass} bg-sig-soft`}>Sold Out</span>
        ) : isLowStock ? (
          <span className={`${chipClass} bg-sig-aqua-600`}>Low Stock</span>
        ) : hasDiscount ? (
          <span className={`${chipClass} bg-sig-copper-600`}>
            {discountPercent > 0 ? `-${discountPercent}%` : "Sale"}
          </span>
        ) : product.featured ? (
          <span className={`${chipClass} bg-sig-ink`}>Featured</span>
        ) : null}

        {/* Flash Sale Timer */}
        {timeLeft && (
          <div className="absolute bottom-3 left-3 right-3 bg-sig-ink/90 backdrop-blur-sm text-white text-[10px] font-bold tracking-wider text-center py-1.5 px-2 select-none z-10 rounded-full flex items-center justify-center gap-1.5">
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

        {/* Sold-out notice. This slot used to hold a hover-only "Quick Add"
            bar; the "+" chip in the price row has taken that over — one add
            path, and one that works on touch, where there is no hover. */}
        {isOutOfStock && (
          <span className="absolute inset-x-6 bottom-6 z-10 select-none rounded-full bg-sig-ink/70 py-3 text-center text-[11px] font-extrabold uppercase tracking-widest text-white backdrop-blur-md">
            Out of Stock
          </span>
        )}

        {/* ── Frosted size and length selector overlay ── */}
        <div 
          className={`absolute bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md z-20 flex flex-col p-4 pt-8 border-t border-sig-line transition-all duration-300 ease-out transform shadow-[0_-10px_40px_rgba(0,0,0,0.05)] ${
            showQuickAdd ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0 pointer-events-none'
          }`}
        >
          {/* Close button */}
          <button 
            onClick={(e) => {
              e.preventDefault();
              setShowQuickAdd(false);
            }}
            className="absolute top-2 right-3 text-sig-soft hover:text-sig-ink font-bold text-sm cursor-pointer z-30 transition-colors"
            aria-label="Close selector"
          >
            ✕
          </button>

          <div className="flex flex-col gap-4 mb-4">
            {/* SIZE row */}
            <div>
              <p className="text-[9px] font-black text-sig-soft tracking-widest uppercase mb-1 text-center">
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
                    className={`px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer rounded-full ${
                      selectedSize === size
                        ? "bg-sig-copper-600 text-white border-sig-copper-600 shadow-sm"
                        : "bg-white/50 text-sig-ink border-sig-line hover:border-sig-copper-400 hover:text-sig-copper-700"
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
                    className={`px-3.5 py-1 text-[10px] font-bold uppercase tracking-wider transition-all duration-200 border cursor-pointer rounded-full ${
                      selectedLength === len
                        ? "bg-sig-copper-600 text-white border-sig-copper-600 shadow-sm"
                        : "bg-white/50 text-sig-ink border-sig-line hover:border-sig-copper-400 hover:text-sig-copper-700"
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
            className={`w-full py-2.5 text-[10px] font-black tracking-widest uppercase transition-all duration-300 text-center rounded-full shadow-sm cursor-pointer ${
              selectedSize && selectedLength
                ? "bg-sig-copper-600 text-white hover:bg-sig-copper-500 active:scale-[0.98]"
                : "bg-sig-copper-100 text-sig-copper-400 cursor-not-allowed"
            }`}
          >
            {selectedSize && selectedLength ? "Add to Cart" : "Select Size & Length"}
          </button>
        </div>
      </div>

      {/* ── Info ── */}
      <div className="flex flex-1 flex-col px-4 pb-[19px] pt-4 sm:px-[17px]">
        {(() => {
          const name = typeof storeName !== 'undefined' ? storeName : "Store";
          return (
            <span className="block text-[11px] font-bold uppercase tracking-[0.09em] text-sig-aqua-700">
              {product.category?.name || product.brand?.name || name}
            </span>
          );
        })()}

        {/* Title */}
        <h3 className="mb-2 mt-[7px] text-[15px] font-bold leading-snug tracking-[-0.01em] text-sig-ink line-clamp-1">
          <Link href={`/product/${product.slug}`} onClick={reportSelect} className="transition-colors hover:text-sig-copper-700">
            {product.title}
          </Link>
        </h3>

        {/* Colour label, swapped for clickable swatches on hover.
            Both layers are stacked in a fixed-height box and cross-faded with
            `group-hover`, so the row never reflows and hovering costs no
            re-render — the card is rendered up to 120× in a grid. */}
        {colorOptions.length > 1 ? (
          <div className="relative mb-2.5 h-5">
            <span className="absolute inset-0 flex items-center text-xs font-medium text-sig-soft select-none opacity-100 group-hover:opacity-0 transition-opacity duration-200">
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
                      isActive ? "w-8 border-sig-copper-600" : "w-5 border-sig-line hover:border-sig-copper-400"
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
          <span className="mb-2.5 block text-xs font-medium text-sig-soft select-none">
            {colorLabel}
          </span>
        )}

        {/* Price row. The trailing chip is the reference's "+" affordance: it
            opens the same size/length selector the Quick Add overlay does, so
            the card has one add path on touch, where there is no hover. */}
        <div className="mt-auto flex items-center justify-between gap-2.5 select-none">
          <div className="flex items-baseline">
            <span className="text-[17px] font-extrabold text-sig-copper-700">
              {formatPrice(activePrice)}
            </span>
            {hasDiscount && (
              <s className="ml-[7px] text-[13px] font-medium text-sig-copper-200">
                {formatPrice(originalPrice)}
              </s>
            )}
          </div>

          {!isOutOfStock && (
            <button
              type="button"
              aria-label={isGiftCard ? "Add to cart" : "Choose size and length"}
              onClick={(e) => {
                e.preventDefault();
                if (isGiftCard) {
                  handleAddToCart(uniqueSizes[0] || "", uniqueLengths[0] || "");
                } else {
                  setShowQuickAdd(true);
                }
              }}
              className="grid h-[38px] w-[38px] shrink-0 cursor-pointer place-items-center rounded-full bg-sig-copper-50 text-[19px] font-bold leading-none text-sig-copper-700 transition-colors group-hover:bg-sig-copper-600 group-hover:text-white"
            >
              +
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
