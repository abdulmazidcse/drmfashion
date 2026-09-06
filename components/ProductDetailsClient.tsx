"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Star, ChevronLeft, ChevronRight, Plus, Minus, Heart, Check, ShoppingBag, X, ChevronDown, Maximize2, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { hasVariant, firstAvailableSize, sortLengths, sortSizes } from "@/lib/variants";
import MeasureFigure, { type FigureGender } from "@/components/MeasureFigure";
import { useCurrency } from "@/providers/CurrencyProvider";
import { addToCart, getCart } from "@/lib/cart";
import { toggleWishlist, isInWishlist } from "@/lib/wishlist";
import { useSettings } from "@/providers/SettingsProvider";
import { parseHeightsGuide, HEIGHTS_GUIDE_SETTING_KEY } from "@/lib/heightsGuide";
import ProductCard from "./ProductCard";
import Footer from "./Footer";
import CustomMeasurementForm, { type CustomMeasurementState } from "./CustomMeasurementForm";
import { resolveSurcharge } from "@/lib/measurement";
import { guidePoints, resolveHowToMeasure, resolveSizeChart, tableInUnit, type MeasurePoint, resolveHowToMeasureImage } from "@/lib/sizeChart";
import { chartPoints, POINT_LABELS, recommendLength, recommendSize, type BodyMeasurements } from "@/lib/sizeRecommend";
import { swatchStyle, isLightColor, relativeLuminance, DEFAULT_ANGLE, type SwatchColor } from "@/lib/colorStyle";
import { getCachedTint, sampleImageTint } from "@/lib/imageTint";
import { trackViewItem } from "@/lib/analytics";
import { formatImageUrl, stripScriptTags } from "@/lib/utils";
import { productImageAlt, productImageCaption, readVariantImages } from "@/lib/imageMeta";
import Swal from "@/lib/swal";

interface Variant {
  id: string;
  size: string;
  color: string;
  length: string | null;
  stock: number;
  price: number | null;
  image?: string | null;
  /** Only the main product's variants carry the images JSON; cards never read it. */
  images?: any;
}

interface ProductImage {
  id: string;
  url: string;
  color: string | null;
  /** Admin-written alt; blank falls back to a generated one — lib/imageMeta.ts. */
  alt?: string | null;
  /** Optional caption rendered under the shot. */
  caption?: string | null;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  /** Present on the main product; related products are fetched card-shaped. */
  description?: string;
  /** Doubles as the one-line summary above the accordions — it is already
   *  written to be exactly that sentence, so there is no second field to keep
   *  in step. The page query uses `include`, so it is always present here. */
  metaDescription?: string | null;
  thumbnail: string;
  sizeChart?: string | null;
  basePrice: number;
  discountPrice: number | null;
  featured: boolean;
  brand?: { name: string } | null;
  category?: {
    name: string;
    slug: string;
    // Only the measuring guide inherits up the chain now; the chart itself is
    // named on the product.
    howToMeasure?: string | null;
    howToMeasureImage?: string | null;
    parent?: {
      name: string;
      howToMeasure?: string | null;
      howToMeasureImage?: string | null;
      parent?: { name: string; howToMeasure?: string | null; howToMeasureImage?: string | null } | null;
    } | null;
  } | null;
  /** The named chart this product shows, or null when it shows none. */
  sizeChart?: { name: string; table: unknown } | null;
  variants: Variant[];
  images?: ProductImage[];
  flashSaleEndDate?: string | Date | null;
  tags?: string | null;
  customMeasurementEnabled?: boolean;
  customSurchargeType?: "FLAT" | "PERCENT" | null;
  customSurchargeValue?: number | null;
  measurementTemplate?: {
    id: string;
    name: string;
    instructions: string | null;
    active: boolean;
    surchargeType: "FLAT" | "PERCENT";
    surchargeValue: number;
    fields: {
      key: string;
      label: string;
      unit: string;
      required: boolean;
      minValue: number | null;
      maxValue: number | null;
      step: number;
      helpText: string | null;
      placeholder: string | null;
      tiers?: {
        minValue: number;
        maxValue: number;
        surchargeType: "FLAT" | "PERCENT";
        surchargeValue: number;
        position: number;
      }[];
    }[];
  } | null;
}

interface Category {
  id: string;
  name: string;
  slug: string;
}

interface ProductDetailsClientProps {
  product: Product;
  categories: Category[];
  relatedProducts: Product[];
  /** Curated in Admin → the "Model is also wearing" cross-sell. Null hides it. */
  modelWearsProduct?: Product | null;
  dbColors?: ({ name: string } & SwatchColor)[];
}

/**
 * Which body the size-guide figure draws. Anything under the Women tree gets
 * the women's outline; everything else (Men, unisex, accessories) the men's.
 */
function figureGenderFor(product: Product): FigureGender {
  const names = [
    product.category?.name,
    product.category?.slug,
    product.category?.parent?.name,
    product.category?.parent?.parent?.name,
  ];
  return names.some((n) => /women|ladies|female/i.test(n || "")) ? "women" : "men";
}

/** What the built-in guide below covers, in the order it lists them. */
const BUILT_IN_POINTS: Record<FigureGender, MeasurePoint[]> = {
  // Same order as the numbers printed on the reference illustrations.
  men: ["sleeve", "chest", "neck", "waist", "hips", "inseam"],
  women: ["chest", "sleeve", "waist", "hips", "inseam"],
};

/** The default measuring steps, used when no category has written its own. */
const BUILT_IN_GUIDE: Record<FigureGender, { title: string; text: string }[]> = {
  men: [
    { title: "Sleeve Length", text: "Measure from the center back of the neck at your collar seam, along the top of your shoulder, and down to your wrist." },
    { title: "Chest", text: "Measure around the fullest part of your chest, keeping the tape horizontal under your arms and flat across the back." },
    { title: "Neck", text: "Measure around your neck at Adam's apple height, keeping some slack in the tape for comfortable breathing." },
    { title: "Waist", text: "Measure around your natural waistline (where you normally wear your pants), keeping some slack in the measuring tape." },
    { title: "Hips", text: "Measure around the fullest part of your hips/seat, keeping the tape horizontal all the way around." },
    { title: "Inseam", text: "Measure from the inner crotch seam straight down along the inside of your leg to the bottom of the ankle bone." },
  ],
  women: [
    { title: "Bust", text: "Measure around the fullest part of your bust, keeping the tape horizontal under your arms and flat across the back." },
    { title: "Sleeve Length", text: "Measure from the center back of the neck at your collar seam, along the top of your shoulder, and down to your wrist." },
    { title: "Waist", text: "Measure around the narrowest part of your natural waistline, keeping some slack in the measuring tape." },
    { title: "Hips", text: "Measure around the fullest part of your hips, keeping the tape horizontal all the way around." },
    { title: "Inseam", text: "Measure from the inner crotch seam straight down along the inside of your leg to the bottom of the ankle bone." },
  ],
};

// Swatch colors map for dynamic UI circles
const COLOR_HEX_MAP: Record<string, string> = {
  "Black": "#09090b",
  "Obsidian Black": "#09090b",
  "Navy Blue": "#1e3a8a",
  "Charcoal": "#374151",
  "Olive": "#3f6212",
  "Burgundy": "#7f1d1d",
  "White": "#ffffff",
  "Grey": "#71717a",
  "Light Blue": "#93c5fd",
  "Classic Crimson": "#b91c1c",
  "Pure Ivory": "#fafaf9",
  "Ruby Red": "#dc2626",
  "Beige": "#f5f5dc",
  "Camel": "#c19a6b",
  "Ivory White": "#fafaf9"
};

// Static images removed for database-driven operation

const getWidthAtY = (y: number): number => {
  if (y <= 45) return 10;
  if (y <= 60) return 6;
  if (y <= 80) return 16;
  if (y <= 120) return 34;
  if (y <= 150) return 30;
  if (y <= 180) return 26;
  if (y <= 200) return 24;
  if (y <= 235) return 18;
  if (y <= 275) return 14;
  if (y <= 315) return 10;
  return 6;
};

const MannequinSVG = ({ scanZone }: { scanZone: number }) => {
  return (
    <svg className="w-full max-w-[280px] h-[360px] mx-auto overflow-visible select-none" viewBox="0 0 200 360">
      <defs>
        <linearGradient id="mannequinGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f4f4f5" />
          <stop offset="40%" stopColor="#e4e4e7" />
          <stop offset="80%" stopColor="#d4d4d8" />
          <stop offset="100%" stopColor="#a1a1aa" />
        </linearGradient>

        <filter id="shadow">
          <feDropShadow dx="0" dy="8" stdDeviation="6" floodOpacity="0.08" />
        </filter>

        <filter id="glow">
          <feGaussianBlur stdDeviation="3" result="coloredBlur" />
          <feMerge>
            <feMergeNode in="coloredBlur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>

      <g filter="url(#shadow)">
        <ellipse cx="100" cy="45" rx="14" ry="18" fill="url(#mannequinGrad)" />
        <path d="M92 61 C92 61 93 72 94 76 C94 76 100 80 106 76 C107 72 108 61 108 61 Z" fill="url(#mannequinGrad)" />
        <path d="M72 80 C68 90, 64 110, 66 120 C68 130, 72 145, 74 160 C75 170, 72 185, 76 200 C78 208, 85 210, 100 210 C115 210, 122 208, 124 200 C128 185, 125 170, 126 160 C128 145, 132 130, 134 120 C136 110, 132 90, 128 80 Z" fill="url(#mannequinGrad)" />
        <path d="M72 80 C62 82, 53 95, 48 110 C43 125, 41 140, 43 150 C44 156, 48 156, 50 150 C52 140, 56 125, 62 110 C65 105, 68 95, 70 88 Z" fill="url(#mannequinGrad)" />
        <path d="M128 80 C138 82, 147 95, 152 110 C157 125, 159 140, 157 150 C156 156, 152 156, 150 150 C148 140, 144 125, 138 110 C135 105, 132 95, 130 88 Z" fill="url(#mannequinGrad)" />
        <path d="M76 200 C74 215, 75 235, 77 255 C79 275, 78 295, 80 320 C80 325, 80 335, 83 340 C85 342, 90 342, 91 338 C92 334, 91 315, 91 300 C91 285, 92 260, 93 245 C94 230, 96 215, 96 205 Z" fill="url(#mannequinGrad)" />
        <path d="M124 200 C126 215, 125 235, 123 255 C121 275, 122 295, 120 320 C120 325, 120 335, 117 340 C115 342, 110 342, 109 338 C108 334, 109 315, 109 300 C109 285, 108 260, 107 245 C106 230, 104 215, 104 205 Z" fill="url(#mannequinGrad)" />
        {[50, 70, 90, 105, 120, 135, 150, 165, 180, 195, 215, 235, 255, 275, 295, 315, 330].map((y, i) => (
          <path
            key={i}
            d={`M ${100 - getWidthAtY(y)} ${y} Q 100 ${y + 3} ${100 + getWidthAtY(y)} ${y}`}
            fill="none"
            stroke="rgba(255, 255, 255, 0.45)"
            strokeWidth="0.4"
          />
        ))}
        <path d="M 100 45 Q 101 190 100 335" fill="none" stroke="rgba(255, 255, 255, 0.3)" strokeWidth="0.5" />
        <path d="M 90 45 Q 92 190 91 335" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.3" />
        <path d="M 110 45 Q 108 190 109 335" fill="none" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="0.3" />
      </g>

      {scanZone === 1 && (
        <>
          <ellipse cx="85" cy="290" rx="16" ry="4" fill="none" stroke="#6366F1" strokeWidth="2.5" filter="url(#glow)" className="animate-pulse" />
          <ellipse cx="115" cy="290" rx="16" ry="4" fill="none" stroke="#6366F1" strokeWidth="2.5" filter="url(#glow)" className="animate-pulse" />
          <ellipse cx="85" cy="290" rx="16" ry="4" fill="none" stroke="#A5B4FC" strokeWidth="1" />
          <ellipse cx="115" cy="290" rx="16" ry="4" fill="none" stroke="#A5B4FC" strokeWidth="1" />
        </>
      )}

      {scanZone === 2 && (
        <>
          <ellipse cx="100" cy="180" rx="36" ry="7" fill="none" stroke="#6366F1" strokeWidth="2.5" filter="url(#glow)" className="animate-pulse" />
          <ellipse cx="100" cy="180" rx="36" ry="7" fill="none" stroke="#A5B4FC" strokeWidth="1" />
        </>
      )}

      {scanZone === 3 && (
        <>
          <ellipse cx="100" cy="110" rx="38" ry="8" fill="none" stroke="#6366F1" strokeWidth="2.5" filter="url(#glow)" className="animate-pulse" />
          <ellipse cx="100" cy="110" rx="38" ry="8" fill="none" stroke="#A5B4FC" strokeWidth="1" />
        </>
      )}

      {scanZone === 4 && (
        <>
          <ellipse cx="100" cy="68" rx="18" ry="4" fill="none" stroke="#6366F1" strokeWidth="2.5" filter="url(#glow)" className="animate-pulse" />
          <ellipse cx="100" cy="68" rx="18" ry="4" fill="none" stroke="#A5B4FC" strokeWidth="1" />
        </>
      )}
    </svg>
  );
};

/**
 * The type ramp this page is drawn on, ported one-for-one from the reference
 * storefront so the whole buy box reads as one voice: a 12px uppercase legend
 * over every control, 13px semibold for anything you read, 18px bold for prices
 * and accordion headers, 24px for the two headlines. Defined once here because
 * roughly forty elements below share four sizes between them, and a size that
 * drifts on one of them is the thing that makes a page look assembled rather
 * than designed.
 */
const AT_TITLE = "text-[12px] font-normal uppercase leading-[14px] tracking-[0.05em]";
const AT_LABEL = "text-[13px] font-semibold leading-5 tracking-[0.02em]";
const AT_BASE_LARGE = "text-[18px] font-bold leading-[18px] tracking-[0.02em]";
const AT_SUBHEAD =
  "text-[16px] font-semibold leading-[22px] tracking-[0.01em] sm:text-[24px] sm:leading-[28px]";
/** Admin-written HTML inside the accordions, held to the same 13px body size.
 *  `product-prose` (app/globals.css) carries the actual p/ul/ol/li/heading/a
 *  rules — @tailwindcss/typography isn't installed, so `prose-*:` variants
 *  compile to nothing and were silently no-ops. */
const AT_PROSE =
  "product-prose text-[13px] font-normal leading-5 tracking-[0.02em] text-[var(--pk-muted)]";

/**
 * First column hugs the left edge, last hugs the right, everything between is
 * centred — the alignment the fixed three-column heights table used, generalised
 * to whatever width an admin builds. With a single column the left rule wins.
 */
function headingCellAlign(index: number, total: number): string {
  if (index === 0) return "text-left pl-6"
  if (index === total - 1) return "text-right pr-6"
  return "text-center"
}

/**
 * Column spans for the media wall, over a six-column grid.
 *
 * The rhythm is the point: the first shots run two-up at half width, and once
 * there are enough images the tail drops to three-up. A uniform grid of eight
 * identical tiles reads as a contact sheet; changing the beat partway down
 * makes the same photographs read as a laid-out page.
 *
 * Every row is filled exactly — a trailing image is widened rather than left
 * beside a hole, which is the thing that makes an otherwise tidy grid look
 * broken.
 */
function mediaWallSpans(total: number): number[] {
  if (total <= 0) return [];
  if (total <= 4) {
    // A lone trailing shot takes the full width instead of half a row.
    return Array.from({ length: total }, (_, i) =>
      total % 2 !== 0 && i === total - 1 ? 6 : 3
    );
  }

  const spans: number[] = [];
  let placed = 0;
  while (placed < total) {
    const left = total - placed;
    let row: number[];
    if (left === 1) row = [6];
    else if (left === 2) row = [3, 3];
    // The opening two rows stay large whatever the total — those are the shots
    // the visitor actually looks at.
    else if (placed < 4 && left >= 4) row = [3, 3];
    else if (left % 3 === 0) row = [2, 2, 2];
    // 4 and 5 both leave a fillable remainder after one more pair.
    else if (left === 4 || left === 5) row = [3, 3];
    else row = [2, 2, 2];
    spans.push(...row);
    placed += row.length;
  }
  return spans;
}

/**
 * The visitor's own recently-viewed list, as the "Recently Viewed" tab needs it.
 *
 * Read through useSyncExternalStore rather than an effect so the first paint
 * matches what the server sent. getSnapshot has to return the *same* array
 * between calls or React re-renders forever, so the parse is memoised against
 * the raw string it came from — the list only changes on navigation, never
 * while this page is open.
 */
let recentRaw: string | null = null;
let recentParsed: any[] = [];

function readRecentlyViewed(): any[] {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem("recently_viewed");
  } catch {
    return [];
  }
  if (raw !== recentRaw) {
    recentRaw = raw;
    try {
      const parsed = raw ? JSON.parse(raw) : [];
      recentParsed = Array.isArray(parsed) ? parsed : [];
    } catch {
      recentParsed = [];
    }
  }
  return recentParsed;
}

/** Nothing to subscribe to: the list cannot change while this page is open. */
const noopSubscribe = () => () => {};
const NO_RECENT: any[] = [];

export default function ProductDetailsClient({ product, categories, relatedProducts, modelWearsProduct = null, dbColors = [] }: ProductDetailsClientProps) {
  const { formatPrice } = useCurrency();
  const { storeName, settings } = useSettings();

  // `shipping_free_threshold` is held in the store's base currency, like every
  // other amount, so formatPrice converts it the same way the product price is
  // converted. A blank or non-numeric value means "not configured".
  const rawFreeShipping = Number(settings.shipping_free_threshold);
  const freeShippingThreshold =
    Number.isFinite(rawFreeShipping) && rawFreeShipping > 0 ? rawFreeShipping : null;
  const router = useRouter();
  // Brand-level, identical on every product — edited in Settings → Branding.
  const heightsGuide = useMemo(
    () => parseHeightsGuide(settings[HEIGHTS_GUIDE_SETTING_KEY]),
    [settings]
  );
  // Blank entries are dropped here rather than in parseHeightsGuide, so a
  // half-filled row an admin left behind never reaches a shopper while still
  // surviving a round trip through the settings form.
  const heightsRows = heightsGuide.rows.filter((row) => row.some((cell) => cell.trim()));
  const heightsModels = heightsGuide.models.filter((m) => m.image.trim());
  // Extract unique variants properties dynamically
  const uniqueColors = Array.from(new Set(product.variants.map(v => v.color))).filter(Boolean);
  const uniqueSizes = sortSizes(Array.from(new Set(product.variants.map(v => v.size))).filter(Boolean));
  const uniqueLengths = sortLengths(Array.from(new Set(product.variants.filter(v => v.length).map(v => v.length))) as string[]);

  // Active selections
  const [selectedColor, setSelectedColor] = useState<string>(uniqueColors[0] || "Black");
  const [selectedSize, setSelectedSize] = useState<string>(uniqueSizes[0] || "M");
  const [selectedLength, setSelectedLength] = useState<string>(uniqueLengths[0] || "");

  // ─── Which combinations actually exist ──────────────────────────────────────
  // The three lists above are every value the product uses anywhere, which is
  // right for *rendering* the options but wrong for deciding which are
  // selectable: a shirt stocked in Semi Tall S but not Tall S was letting a
  // shopper pick Tall + S and add a variant that does not exist.
  //
  // Each option is therefore checked against the other two current selections,
  // and offered as disabled rather than hidden — a size vanishing as the
  // shopper switches length reads as a glitch, a struck-through one reads as
  // "not in this length".
  const isSizeAvailable = (size: string) =>
    hasVariant(product.variants, selectedColor, size, selectedLength);
  const isLengthAvailable = (len: string) =>
    hasVariant(product.variants, selectedColor, selectedSize, len);

  // Changing colour or length can strip the current size out from under the
  // shopper. Rather than leave an impossible pair selected, fall to the first
  // size that does exist for what they just picked.
  useEffect(() => {
    if (uniqueSizes.length === 0) return;
    if (hasVariant(product.variants, selectedColor, selectedSize, selectedLength)) return;

    const fallback = firstAvailableSize(product.variants, uniqueSizes, selectedColor, selectedLength);
    if (fallback) setSelectedSize(fallback);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColor, selectedLength]);
  const [wishlisted, setWishlisted] = useState<boolean>(false);
  const [customMeasurement, setCustomMeasurement] = useState<CustomMeasurementState>({
    active: false,
    valid: true,
    fee: 0,
    values: [],
    error: null,
    feeBreakdown: [],
  });
  const [addedToBag, setAddedToBag] = useState<boolean>(false);
  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [newReview, setNewReview] = useState({ name: "", rating: 5, comment: "" });
  const [submittingReview, setSubmittingReview] = useState(false);
  const [scrolledHalfway, setScrolledHalfway] = useState(false);
  
  // Stock Alert state
  const [notifyEmail, setNotifyEmail] = useState("");
  const [notifyLoading, setNotifyLoading] = useState(false);
  const [notifySuccess, setNotifySuccess] = useState(false);

  // Save to recently viewed on mount
  React.useEffect(() => {
    if (!product) return;
    try {
      const stored = localStorage.getItem("recently_viewed");
      let viewedList = stored ? JSON.parse(stored) : [];
      // Remove if exists to push to front
      viewedList = viewedList.filter((p: { id: string }) => p.id !== product.id);
      
      // Store minimal product payload
      viewedList.unshift({
        id: product.id,
        title: product.title,
        slug: product.slug,
        basePrice: product.basePrice,
        discountPrice: product.discountPrice,
        thumbnail: product.thumbnail,
        featured: product.featured,
        flashSaleEndDate: product.flashSaleEndDate,
        variants: product.variants
      });
      
      // Keep only last 10
      viewedList = viewedList.slice(0, 10);
      localStorage.setItem("recently_viewed", JSON.stringify(viewedList));
    } catch (err) {
      console.error("Could not save recently viewed", err);
    }
  }, [product]);

  React.useEffect(() => {
    const fetchReviews = async () => {
      try {
        const res = await fetch(`/api/products/${product.id}/reviews`);
        if (res.ok) setReviews(await res.json());
      } catch (err) {} finally {
        setReviewsLoading(false);
      }
    };
    fetchReviews();
  }, [product.id]);

  const avgRating = reviews.length > 0 ? (reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1) : null;

  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingReview(true);
    try {
      const res = await fetch(`/api/products/${product.id}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newReview)
      });
      if (res.ok) {
        const { review } = await res.json();
        setReviews([review, ...reviews]);
        setNewReview({ name: "", rating: 5, comment: "" });
      }
    } catch (err) {} finally {
      setSubmittingReview(false);
    }
  };

  React.useEffect(() => {
    setWishlisted(isInWishlist(product.id));
    const handleUpdate = () => setWishlisted(isInWishlist(product.id));
    window.addEventListener("wishlist-updated", handleUpdate);
    return () => window.removeEventListener("wishlist-updated", handleUpdate);
  }, [product.id]);
  const [showSizeChart, setShowSizeChart] = useState<boolean>(false);
  /** Index into `lightboxImages`, or null when the viewer is closed. */
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  /** Which shot the scroller is currently sitting on, for the thumbnail rail. */
  const [lightboxActive, setLightboxActive] = useState<number>(0);
  const lightboxScrollRef = useRef<HTMLDivElement>(null);
  const lightboxPaneRefs = useRef<Array<HTMLDivElement | null>>([]);

  // ─── Gallery rail ──────────────────────────────────────────────────────────
  // The media wall is a two-up grid on a desktop and a swipeable rail below it,
  // which is one element with two layouts rather than two galleries. The index
  // is only ever read on the narrow layout — the wide one does not scroll — so
  // the handler being idle there costs nothing.
  const galleryRef = useRef<HTMLDivElement>(null);
  const [activeMedia, setActiveMedia] = useState(0);

  /** Width of one slide plus the 4px gutter, measured rather than assumed. */
  const gallerySlideStep = (el: HTMLDivElement): number => {
    const first = el.firstElementChild as HTMLElement | null;
    return first ? first.offsetWidth + 4 : el.clientWidth;
  };

  const handleGalleryScroll = () => {
    const el = galleryRef.current;
    if (!el) return;
    setActiveMedia(Math.round(el.scrollLeft / gallerySlideStep(el)));
  };

  const scrollGalleryTo = (index: number) => {
    const el = galleryRef.current;
    if (!el) return;
    el.scrollTo({ left: index * gallerySlideStep(el), behavior: "smooth" });
  };

  /** The reviews accordion, so the star rating beside the price can jump to it. */
  const reviewsRef = useRef<HTMLDivElement>(null);
  const [activeSizeTab, setActiveSizeTab] = useState<"heights" | "size-chart" | "measure">("heights");
  const [sizeUnit, setSizeUnit] = useState<"inches" | "cm">("inches");
  const [wizardStep, setWizardStep] = useState<"heights-list" | "wizard-input" | "wizard-scanning" | "wizard-result">("heights-list");
  const [scanZone, setScanZone] = useState<number>(1);
  const [scanProgress, setScanProgress] = useState<number>(0);
  const [isMetric, setIsMetric] = useState<boolean>(false);
  const [heightFt, setHeightFt] = useState<string>("6");
  const [heightIn, setHeightIn] = useState<string>("2");
  const [heightCm, setHeightCm] = useState<string>("188");
  const [weightLbs, setWeightLbs] = useState<string>("190");
  const [weightKg, setWeightKg] = useState<string>("86");
  const [waistIn, setWaistIn] = useState<string>("34");
  const [waistCm, setWaistCm] = useState<string>("86");
  const [age, setAge] = useState<string>("");

  // Which measurements this garment's chart actually compares on — a shirt
  // chart asks for chest and sleeve, trousers for waist and inseam, a bra for
  // bust and underbust. Empty when the category has no chart.
  const wizardPoints = React.useMemo(() => {
    const table = resolveSizeChart(product).table;
    // Height drives the length band, not a chart column, so it keeps its own box.
    return table ? chartPoints(table).filter((p) => p !== "waist") : [];
  }, [product]);

  // Raw strings keyed by body point, in whichever unit the toggle is showing.
  const [bodyInputs, setBodyInputs] = useState<Partial<Record<MeasurePoint, string>>>({});

  // Everything the wizard knows about the shopper, in inches — the unit the
  // chart comparison works in. Derived rather than stored so the imperial /
  // metric toggle cannot leave the two halves disagreeing.
  const wizardBody = React.useMemo(() => {
    const heightInches = isMetric
      ? (parseFloat(heightCm) || 188) / 2.54
      : (parseFloat(heightFt) || 6) * 12 + (parseFloat(heightIn) || 2);

    const waistInches = isMetric ? (parseFloat(waistCm) || 86) / 2.54 : parseFloat(waistIn) || 34;

    return { heightInches, waistInches };
  }, [isMetric, heightCm, heightFt, heightIn, waistCm, waistIn]);

  // The recommendation itself. Falls back to the old weight brackets only when
  // the category has no chart to compare against.
  const sizeSuggestion = React.useMemo(() => {
    const table = resolveSizeChart(product).table;

    // Values entered against this chart's own columns. The waist box predates
    // the dynamic fields and stays as a default for charts that have one.
    const body: BodyMeasurements = { waist: wizardBody.waistInches };
    for (const [point, raw] of Object.entries(bodyInputs)) {
      const value = parseFloat(raw);
      if (!Number.isFinite(value) || value <= 0) continue;
      body[point as MeasurePoint] = isMetric ? value / 2.54 : value;
    }

    const fromChart = table ? recommendSize(table, body, uniqueSizes) : null;
    const length = recommendLength(wizardBody.heightInches, uniqueLengths);

    if (fromChart) {
      return { size: fromChart.size, length, substituted: fromChart.substituted, fromChart: true };
    }

    const lbs = isMetric ? (parseFloat(weightKg) || 86) * 2.20462 : parseFloat(weightLbs) || 190;
    const bracket = lbs < 160 ? "S" : lbs < 190 ? "M" : lbs < 220 ? "L" : lbs < 250 ? "XL" : "2XL";
    const matched = uniqueSizes.find((s) => s.toLowerCase() === bracket.toLowerCase()) || bracket;

    return { size: matched, length, substituted: false, fromChart: false };
  }, [wizardBody, bodyInputs, product, uniqueSizes, uniqueLengths, isMetric, weightKg, weightLbs]);

  // Hold the page still while the size-chart overlay is up. Without this the
  // body keeps scrolling behind the modal, so closing it drops you somewhere
  // else on the page. Escape closes it too — backdrop click was the only way
  // out before. Mirrors the same handling in components/PromoDrawer.tsx.
  React.useEffect(() => {
    if (!showSizeChart) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowSizeChart(false);
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [showSizeChart]);

  /**
   * Jumps the scroller to one shot. `instant` is used for the opening jump —
   * a smooth scroll from the top of a seven-image wall would animate past every
   * photograph before settling, which reads as a glitch rather than a
   * transition.
   */
  const scrollToLightboxPane = React.useCallback((index: number, instant = false) => {
    const pane = lightboxPaneRefs.current[index];
    const scroller = lightboxScrollRef.current;
    if (!pane || !scroller) return;
    scroller.scrollTo({
      top: pane.offsetTop,
      behavior: instant ? "auto" : "smooth",
    });
  }, []);

  // Full-screen image viewer: Escape closes, arrows and Home/End move between
  // shots, and the page behind is frozen so closing does not drop you elsewhere.
  // Same handling as the size-chart modal above.
  React.useEffect(() => {
    if (lightboxIndex === null) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIndex(null);
      // The viewer is a scroller now, so the arrows move the scroller rather
      // than swapping the photo — and they stop at the ends instead of wrapping,
      // because wrapping a scroll position looks like the page jumped.
      if (e.key === "ArrowRight" || e.key === "ArrowDown") {
        e.preventDefault();
        setLightboxActive((i) => {
          // Counted off the panes rather than `lightboxImages`, which is
          // declared below this effect — same number, and a ref is readable
          // from here without reaching forward into the render body.
          const next = Math.min(i + 1, lightboxPaneRefs.current.length - 1);
          scrollToLightboxPane(next);
          return next;
        });
      }
      if (e.key === "ArrowLeft" || e.key === "ArrowUp") {
        e.preventDefault();
        setLightboxActive((i) => {
          const next = Math.max(i - 1, 0);
          scrollToLightboxPane(next);
          return next;
        });
      }
    };
    document.addEventListener("keydown", onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [lightboxIndex, scrollToLightboxPane]);

  // Open on the shot that was clicked, not at the top of the wall.
  //
  // Two frames, not one: the panes have no height until their images have laid
  // out, so a jump scheduled before that computes every offsetTop as zero and
  // leaves the viewer at the top whatever was clicked.
  React.useEffect(() => {
    if (lightboxIndex === null) return;
    const frame = requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        setLightboxActive(lightboxIndex);
        scrollToLightboxPane(lightboxIndex, true);
      })
    );
    return () => cancelAnimationFrame(frame);
  }, [lightboxIndex, scrollToLightboxPane]);

  /**
   * Keeps the rail in step with the scroller.
   *
   * The pane nearest the top of the viewport wins rather than the most-visible
   * one: these images are taller than the screen, so "most visible" stays on
   * the same photograph through a whole screen of scrolling and the rail sits
   * still while the picture changes.
   */
  const onLightboxScroll = React.useCallback(() => {
    const scroller = lightboxScrollRef.current;
    if (!scroller) return;
    const marker = scroller.scrollTop + scroller.clientHeight * 0.35;

    let nearest = 0;
    for (let i = 0; i < lightboxPaneRefs.current.length; i++) {
      const pane = lightboxPaneRefs.current[i];
      if (pane && pane.offsetTop <= marker) nearest = i;
    }
    setLightboxActive(nearest);
  }, []);

  // Related Products states
  const [activeRelatedTab, setActiveRelatedTab] = useState<"recommended" | "recently">("recommended");

  // The tab's own data. Excludes the product being looked at — offering to
  // re-visit the page you are on is the one thing it must not do.
  const allRecentlyViewed = React.useSyncExternalStore(
    noopSubscribe,
    readRecentlyViewed,
    () => NO_RECENT
  );
  const recentlyViewed = React.useMemo(
    () => allRecentlyViewed.filter((r: any) => r?.id !== product.id),
    [allRecentlyViewed, product.id]
  );
  const [hoveredRelatedProductId, setHoveredRelatedProductId] = useState<string | null>(null);
  const [selectedRelatedSizes, setSelectedRelatedSizes] = useState<Record<string, string>>({});
  const [selectedRelatedLengths, setSelectedRelatedLengths] = useState<Record<string, string>>({});
  const [relatedWishlisted, setRelatedWishlisted] = useState<Record<string, boolean>>({});

  // Accordions states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    description: true,
    fit: false,
    care: false,
    reviews: false,
  });

  const toggleAccordion = (section: string) => {
    setOpenAccordions(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Automated 3D scanning visualizer effect
  React.useEffect(() => {
    if (wizardStep !== "wizard-scanning") return;

    const interval = setInterval(() => {
      setScanProgress((prev) => {
        const next = prev + 1;
        if (next >= 100) {
          clearInterval(interval);
          setWizardStep("wizard-result");
          return 100;
        }

        if (next < 25) setScanZone(1);
        else if (next < 50) setScanZone(2);
        else if (next < 75) setScanZone(3);
        else setScanZone(4);

        return next;
      });
      // 12ms rather than 35: the comparison is instant, so this is just the
      // reveal animation and there is no reason to hold the answer back for
      // three and a half seconds.
    }, 12);

    return () => clearInterval(interval);
  }, [wizardStep]);

  // 1. Get the dynamic database-provided product images, filtered by selected color tag
  const dbImages = product.images || [];
  
  const colorSpecificDbImages = dbImages.filter(
    (img) => img.color && img.color.toLowerCase() === selectedColor.toLowerCase()
  ).map((img) => formatImageUrl(img.url));

  const generalDbImages = dbImages.filter((img) => !img.color).map((img) => formatImageUrl(img.url));

  // Find variant matching current active color, size, and length selection
  const activeVariant = product.variants.find(
    (v) =>
      v.color.toLowerCase() === selectedColor.toLowerCase() &&
      v.size.toLowerCase() === selectedSize.toLowerCase() &&
      (v.length ? v.length.toLowerCase() === selectedLength.toLowerCase() : true)
  );

  // Get ALL variants matching the selected color to ensure we harvest their variant-level images 
  // even if the exact size/length combo isn't selected yet.
  const colorMatchedVariants = product.variants.filter(
    (v) => v.color.toLowerCase() === selectedColor.toLowerCase()
  );

  // Variant shots, each kept alongside whatever SEO copy the admin wrote for it.
  const variantImageEntries = colorMatchedVariants.flatMap((v) =>
    readVariantImages(v.images).map((entry) => ({
      ...entry,
      url: formatImageUrl(entry.url),
    }))
  );

  const variantLevelImages = colorMatchedVariants.flatMap(v => [
    ...(v.image ? [formatImageUrl(v.image)] : []),
    ...readVariantImages(v.images).map((entry) => formatImageUrl(entry.url)),
  ]);

  // Specific images based on variant and color selection
  const specificImages = [...variantLevelImages, ...colorSpecificDbImages].filter(Boolean);
  const uniqueSpecificImages = Array.from(new Set(specificImages));
  const uniqueGeneralImages = Array.from(new Set(generalDbImages.filter(Boolean)));

  // Main collage shows specific variant images if available, otherwise falls back to general gallery or thumbnail.
  const mainCollageImages = uniqueSpecificImages.length > 0 
    ? uniqueSpecificImages 
    : (uniqueGeneralImages.length > 0 ? uniqueGeneralImages : (product.thumbnail ? [formatImageUrl(product.thumbnail)] : []));

  // Untagged gallery shots used to be appended after the colourway's own, on
  // the theory that an image with no colour on it applies to every colour. In
  // practice an untagged row is almost always a photograph of one particular
  // colourway that nobody tagged — so picking Oatmeal showed seven Oatmeal
  // shots and then, at the end, the Blue-and-Black one. They are the fallback
  // for a colourway with no photographs of its own (mainCollageImages already
  // falls back to them), never an addition to one that has them.
  //
  // Everything the full-screen viewer can page through, in the order the page
  // shows it, so the index a tile passes in lands on the shot that was clicked.
  const lightboxImages = mainCollageImages;

  // The wall renders that same list, so a tile's position in the grid IS its
  // lightbox index. Every entry is the selected colourway now, so each can name
  // it in its alt text.
  const mediaWall: Array<{ url: string; color?: string }> = mainCollageImages.map(
    (url: string) => ({ url, color: selectedColor })
  );

  // Alt text and captions live on the ProductImage row, but both galleries above
  // are flat URL lists — variant-level shots are JSON on the variant and have no
  // row at all — so the copy is looked up by formatted URL and simply falls back
  // where there is none.
  const imageCopyByUrl = new Map<
    string,
    { alt?: string | null; caption?: string | null; color?: string | null }
  >(
    dbImages.map((img) => [
      formatImageUrl(img.url),
      { alt: img.alt, caption: img.caption, color: img.color },
    ])
  );

  // Variant shots have no ProductImage row, so their copy is folded in here.
  // Added after the gallery rows and only when something was written, so a
  // blank variant field can never blank out a gallery row's alt for the same
  // photograph — the two lists overlap whenever a shot is used in both.
  for (const entry of variantImageEntries) {
    if (!entry.alt && !entry.caption) continue;
    const existing = imageCopyByUrl.get(entry.url);
    imageCopyByUrl.set(entry.url, {
      alt: entry.alt || existing?.alt,
      caption: entry.caption || existing?.caption,
      color: existing?.color ?? selectedColor,
    });
  }

  // ─── Colour-led Product Details panel ──────────────────────────────────────
  // Picking a colourway repaints the details block in that colour. Variants
  // store the colour as a plain name, so the real swatch has to be looked up in
  // the Color table; COLOR_HEX_MAP is the fallback for names with no row.
  const activeDbColor = dbColors.find(
    (c) => c.name.toLowerCase() === selectedColor.toLowerCase()
  );
  //
  // Every swatch type paints, IMAGE included: for a patterned colourway the
  // Color row's `value` is the flat tint that stands in for the pattern, which
  // is exactly what a panel needs — the weave itself would be noise at this
  // size. That does mean an unedited placeholder tint paints the panel too, so
  // a colourway that looks wrong here is a colour to fix in Admin → Colors
  // rather than a rule to add here.
  // A fabric swatch is a photograph, so the colour to paint with is the one the
  // photograph averages to — sampled from the image itself rather than trusted
  // from the row, where the flat `value` is only a stand-in and is easy to
  // leave at whatever the form was seeded with.
  const swatchImage =
    activeDbColor?.type === "IMAGE" ? activeDbColor.image?.trim() || null : null;
  const [imageTints, setImageTints] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (!swatchImage) return;
    let live = true;
    // Resolves from cache on a repeat visit, so flipping between two colourways
    // repaints immediately after the first look at each.
    sampleImageTint(swatchImage).then((tint) => {
      if (live && tint) setImageTints((prev) => (prev[swatchImage] ? prev : { ...prev, [swatchImage]: tint }));
    });
    return () => {
      live = false;
    };
  }, [swatchImage]);

  const sampledTint = swatchImage
    ? imageTints[swatchImage] ?? getCachedTint(swatchImage) ?? null
    : null;

  const panelColor: SwatchColor | null = swatchImage
    // Until the sample lands the panel stays neutral and fades in. Painting the
    // row's stored `value` in the meantime would flash a colour that is usually
    // nothing like the fabric.
    ? (sampledTint ? { value: sampledTint } : null)
    : activeDbColor ?? (COLOR_HEX_MAP[selectedColor] ? { value: COLOR_HEX_MAP[selectedColor] } : null);

  // White copy vanishes on Ivory and black copy vanishes on Navy, so the whole
  // foreground — text, rules, stars, inputs, buttons — is derived from the
  // painted colour instead of fixed. Everything inside the panel reads these
  // five custom properties, which is one place to change rather than forty
  // conditioned utilities. With no colour to paint, they resolve to the page's
  // ordinary palette and the panel stays white.
  // 0.179 — the point where a colour contrasts equally with black and white —
  // is the right cut-off for a 14px swatch. This panel carries paragraphs of
  // 13px copy at reduced opacity, which fails long before that: black on a
  // mid-tone indigo reads fine as a heading and not at all as body text. So the
  // panel flips to white type sooner, and falls back to the shared rule for
  // hand-entered values that are not hex at all.
  const panelLuminance = panelColor ? relativeLuminance(panelColor.value) : null;
  const panelIsLight =
    !panelColor
      ? true
      : panelLuminance === null
        ? isLightColor(panelColor.value)
        : panelLuminance > 0.42;

  // Only the flat colour is painted, never the swatch's texture: a fabric photo
  // or a check weave blown up to panel size is noise, and it puts the copy on a
  // background whose contrast nobody can predict. A gradient survives — it is
  // two of the garment's own colours and stays smooth at any size.
  const panelBackground: React.CSSProperties = !panelColor
    ? { backgroundColor: "#FFFFFF" }
    : panelColor.type === "GRADIENT" && panelColor.value2?.trim()
      ? {
          backgroundColor: panelColor.value,
          backgroundImage: `linear-gradient(${panelColor.angle ?? DEFAULT_ANGLE}deg, ${panelColor.value} 0%, ${panelColor.value2.trim()} 100%)`,
        }
      : { backgroundColor: panelColor.value };

  const panelVars = {
    ...panelBackground,
    // The panel's own foreground. Without this the accordion headers (which
    // carry no colour class of their own) keep the page's dark text and vanish
    // on a dark colourway like black. The container already transitions `color`.
    color: "var(--pk)",
    "--pk": panelIsLight ? "#101010" : "#FFFFFF",
    "--pk-muted": !panelColor
      ? "#717171"
      : panelIsLight
        ? "rgba(16,16,16,0.72)"
        : "rgba(255,255,255,0.82)",
    "--pk-rule": !panelColor
      ? "rgba(16,16,16,0.10)"
      : panelIsLight
        ? "rgba(16,16,16,0.18)"
        : "rgba(255,255,255,0.28)",
    "--pk-faint": !panelColor ? "#CBCBCB" : panelIsLight ? "rgba(16,16,16,0.35)" : "rgba(255,255,255,0.45)",
    "--pk-contrast": panelIsLight ? "#FFFFFF" : "#101010",
  } as React.CSSProperties;

  // The flat-lay under the copy mirrors the selected colourway. Last image
  // rather than first, so it is usually a different shot from the one heading
  // the gallery.
  const flatLayImage = formatImageUrl(mainCollageImages[mainCollageImages.length - 1] || product.thumbnail);

  // Dynamic price is now directly driven by the variant.
  // Fall back to product base/discount if the variant price is missing.
  const currentBasePrice = activeVariant?.price || product.basePrice;
  const currentDiscountPrice = product.discountPrice ? product.discountPrice : null;

  // ─── Made-to-measure ───────────────────────────────────────────────────────
  // Only offered when the admin enabled it AND the linked template is active
  // with at least one measurement defined.
  const measurementTemplate =
    product.customMeasurementEnabled &&
      product.measurementTemplate?.active &&
      product.measurementTemplate.fields.length > 0
      ? product.measurementTemplate
      : null;

  // The product's own chart, else the nearest one up its category tree, else
  // the built-in alpha-sizing table below.
  const sizeChart = resolveSizeChart(product);
  // Walked separately from the chart: a category can supply one without the other.
  const howToMeasure = resolveHowToMeasure(product);
  // Dots follow the measurement names the guide actually uses, numbered in the
  // order it lists them.
  const figureGender = figureGenderFor(product);
  const howToMeasureImage = resolveHowToMeasureImage(product);
  const activePoints = howToMeasure.html ? guidePoints(howToMeasure.html) : BUILT_IN_POINTS[figureGender];

  const customSurcharge = resolveSurcharge(product, product.measurementTemplate);
  // The price one custom unit is priced against — matches the checkout fallback.
  const customUnitPrice = currentDiscountPrice ?? currentBasePrice;

  // Report the product view once per product. Colour and size changes re-render
  // this component constantly, and GA4 counts every view_item, so the effect is
  // keyed on the id alone rather than on the selection or the live price.
  const viewPrice = currentDiscountPrice ?? currentBasePrice;
  const viewPriceRef = React.useRef(viewPrice);
  viewPriceRef.current = viewPrice;

  React.useEffect(() => {
    trackViewItem({
      item_id: product.id,
      item_name: product.title,
      price: viewPriceRef.current,
      item_brand: product.brand?.name || undefined,
      item_category: product.category?.name || undefined,
    });
  }, [product.id, product.title, product.brand?.name, product.category?.name]);

  // "Model is also wearing" — the curated cross-sell picked in Admin. No pick,
  // no section: an uncurated guess here was showing menswear on womenswear.
  const completeLookItem = modelWearsProduct
    ? {
      title: modelWearsProduct.title,
      slug: modelWearsProduct.slug,
      price: modelWearsProduct.basePrice,
      thumbnail: modelWearsProduct.thumbnail
    }
    : null;

  // Flash Sale Timer
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

  // Stock Alerts based on activeVariant
  const activeStock = activeVariant ? activeVariant.stock : 0;
  const isOutOfStock = activeStock === 0 && !!activeVariant;
  const isLowStock = activeStock > 0 && activeStock <= 5;

  /**
   * What the buy button is waiting for.
   *
   * The button used to read "Add To Bag" whatever was selected, and told you
   * only after the click — a popup saying the combination does not exist. Only
   * the choices this product actually offers count as missing, so a garment
   * that comes in one length is never blocked on a length nobody was asked for.
   */
  const missingChoices = [
    uniqueSizes.length > 0 && !selectedSize ? "Size" : null,
    uniqueLengths.length > 0 && !selectedLength ? "Length" : null,
  ].filter(Boolean) as string[];

  /** The variant the shopper has assembled, if this product is made in it. */
  const hasVariantForSelection = Boolean(activeVariant);
  const canAddToBag =
    missingChoices.length === 0 &&
    hasVariantForSelection &&
    !isOutOfStock &&
    customMeasurement.valid;

  const buyLabel = missingChoices.length > 0
    ? `Select ${missingChoices.join(" & ")}`
    : !hasVariantForSelection
      ? "Combination Unavailable"
      : isOutOfStock
        ? "Out of Stock"
        : !customMeasurement.valid
          ? "Complete Your Measurements"
          : "Add To Bag";

  const handleAddToBag = (overrideSize?: string, overrideLength?: string) => {
    const sizeToUse = overrideSize || selectedSize;
    const lengthToUse = overrideLength || selectedLength;

    // Find variant matching current active color, size, and length selection
    const variantToUse = product.variants.find(
      (v) =>
        v.color.toLowerCase() === selectedColor.toLowerCase() &&
        v.size.toLowerCase() === sizeToUse.toLowerCase() &&
        (v.length ? v.length.toLowerCase() === lengthToUse.toLowerCase() : true)
    );

    // No matching row means the shopper assembled a combination this product is
    // not made in. Falling through would add it at `basePrice` and only fail
    // later at checkout, where the variant lookup is authoritative.
    if (!variantToUse) {
      Swal.fire({
        text: `${product.title} is not available in ${sizeToUse}${lengthToUse ? ` / ${lengthToUse}` : ""}. Please choose another combination.`,
        icon: "warning",
        confirmButtonColor: "#18181b",
      });
      return;
    }

    // Stock is checked here rather than only on the button, because the size
    // wizard's "Apply To Product" calls straight into this function and never
    // sees the button's disabled state.
    //
    // Made-to-order garments are cut on demand, so they are exempt — the same
    // rule /api/checkout applies when it decrements stock.
    const wantsCustom = Boolean(measurementTemplate && customMeasurement.active);
    if (!wantsCustom) {
      if (variantToUse.stock <= 0) {
        Swal.fire({
          text: `${product.title} in ${sizeToUse}${lengthToUse ? ` / ${lengthToUse}` : ""} is out of stock.`,
          icon: "warning",
          confirmButtonColor: "#18181b",
        });
        return;
      }

      // addToCart stacks quantity onto an existing line, so the check has to
      // count what is already in the basket — otherwise pressing the button
      // repeatedly walks past the stock level and only fails at checkout.
      const lineId = `${product.id}-${selectedColor}-${sizeToUse}-${lengthToUse}`;
      const alreadyInCart = getCart().find((c) => c.id === lineId)?.quantity ?? 0;

      if (alreadyInCart + 1 > variantToUse.stock) {
        Swal.fire({
          text: `Only ${variantToUse.stock} left in stock, and you already have ${alreadyInCart} in your bag.`,
          icon: "warning",
          confirmButtonColor: "#18181b",
        });
        return;
      }
    }

    const basePrice = variantToUse.price || product.basePrice;
    const finalPrice = product.discountPrice ? product.discountPrice : basePrice;

    // Made-to-measure: block on invalid input, then carry the measurements and
    // the preview fee on the cart line. Checkout re-derives the real fee.
    const isCustom = Boolean(measurementTemplate && customMeasurement.active);
    if (isCustom && !customMeasurement.valid) {
      Swal.fire({
        text: customMeasurement.error || "Please complete your measurements.",
        icon: "warning",
        confirmButtonColor: "#18181b",
      });
      return;
    }

    addToCart({
      productId: product.id,
      slug: product.slug,
      title: product.title,
      thumbnail: product.thumbnail || "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",
      color: selectedColor,
      size: sizeToUse,
      length: lengthToUse,
      price: isCustom ? finalPrice + customMeasurement.fee : finalPrice,
      ...(isCustom && measurementTemplate
        ? {
          custom: {
            templateId: measurementTemplate.id,
            templateName: measurementTemplate.name,
            values: customMeasurement.values,
            fee: customMeasurement.fee,
            feeBreakdown: customMeasurement.feeBreakdown,
          },
        }
        : {}),
    });
    setAddedToBag(true);
    setTimeout(() => {
      router.push("/cart");
    }, 800);
  };

  // Category ancestry, rendered top-down above the title. Prisma hands the
  // chain back leaf-first (category → parent → parent), so walk it upward and
  // reverse. The tree is at most three levels deep — see the product query.
  const categoryPath = [
    product.category?.parent?.parent?.name,
    product.category?.parent?.name,
    product.category?.name,
  ].filter(Boolean) as string[];

  return (
    <div className="flex min-h-screen flex-col bg-white font-sans text-[#101010] antialiased selection:bg-[#101010] selection:text-white">

      <main className="w-full flex-1">

        {/* ── PRODUCT ────────────────────────────────────────────────────────
            Two sticky columns split by a hairline: photographs on the left,
            everything you read or press on the right. The buy column also
            carries the detail copy, so it always outruns the gallery — that
            height difference is what lets the gallery stay pinned.

            Split down the middle, matching the reference's
            `grid-template-columns: 1fr 1fr`. The buy side does not use the
            extra width — its contents stay capped below — it becomes margin,
            which is what stops a 1800px page from running the buy box out to
            900px of line length. */}
        <div className="mx-auto grid w-full max-w-[1800px] grid-cols-1 items-start lg:grid-cols-2">

          {/* LEFT COLUMN: one continuous media wall.
              A swipeable rail on a phone (one shot at a time, the next one
              peeking) and a two-up wall on a desktop, which is the same set of
              photographs laid out as a page rather than a slideshow. */}
          <div className="relative w-full lg:sticky lg:top-20 lg:self-start lg:border-r lg:border-[#101010]/[0.06]">
            <div
              ref={galleryRef}
              onScroll={handleGalleryScroll}
              className="flex snap-x snap-mandatory gap-1 overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] lg:grid lg:grid-cols-6 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
            >
              {mediaWall.map(({ url, color }, index) => {
                const copy = imageCopyByUrl.get(url);
                const caption = productImageCaption(copy?.caption);
                const span = mediaWallSpans(mediaWall.length)[index] ?? 3;

                return (
                  <figure
                    key={`media-${index}`}
                    className={`w-[92%] shrink-0 snap-center lg:w-auto ${
                      span === 6
                        ? "lg:col-span-6"
                        : span === 3
                          ? "lg:col-span-3"
                          : "lg:col-span-2"
                    }`}
                  >
                    <div
                      className="group relative aspect-[5/7] cursor-zoom-in overflow-hidden bg-[#FBFBFB]"
                      role="button"
                      tabIndex={0}
                      aria-label="Open image full screen"
                      onClick={() => setLightboxIndex(index)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          setLightboxIndex(index);
                        }
                      }}
                      onMouseMove={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect();
                        const x = ((e.clientX - rect.left) / rect.width) * 100;
                        const y = ((e.clientY - rect.top) / rect.height) * 100;
                        const img = e.currentTarget.querySelector("img");
                        if (img) {
                          img.style.transformOrigin = `${x}% ${y}%`;
                          img.style.transform = "scale(2)";
                        }
                      }}
                      onMouseLeave={(e) => {
                        const img = e.currentTarget.querySelector("img");
                        if (img) {
                          img.style.transform = "scale(1)";
                          setTimeout(() => {
                            if (img.style.transform === "scale(1)") {
                              img.style.transformOrigin = "center";
                            }
                          }, 300);
                        }
                      }}
                    >
                      <Image
                        src={formatImageUrl(url)}
                        alt={productImageAlt({
                          custom: copy?.alt,
                          title: product.title,
                          brand: product.brand?.name,
                          color,
                          index,
                          total: mediaWall.length,
                        })}
                        fill
                        sizes="(max-width: 640px) 92vw, (max-width: 1024px) 50vw, 25vw"
                        // The lead shot is this page's LCP element; without this
                        // it was lazy-loaded like the rest of the wall.
                        priority={index === 0}
                        className="select-none object-cover"
                        style={{
                          transition: "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                          transformOrigin: "center",
                        }}
                      />

                      {/* Caption sits on the photograph rather than under it.
                          On a tall store this line is usually "Model is 6'4",
                          wearing size L Tall" — the single most useful thing on
                          the page, and useless three inches below the shot it
                          describes. Frosted white glass, as the reference has it. */}
                      {caption && (
                        <figcaption className="pointer-events-none absolute bottom-[15px] left-[15px] right-[15px] line-clamp-2 bg-white/20 px-[15px] py-2.5 text-[13px] font-semibold leading-5 tracking-[0.02em] text-white backdrop-blur-[10px] sm:right-auto sm:max-w-[80%] lg:left-5">
                          {caption}
                        </figcaption>
                      )}

                      {/* Zoom affordance — the cursor already says it, but only
                          once the pointer is over the tile and never on touch. */}
                      <span className="pointer-events-none absolute right-4 top-4 hidden h-10 w-10 items-center justify-center rounded-full border border-[#101010]/10 bg-white/70 text-[#101010] opacity-0 backdrop-blur-[12px] transition-opacity duration-200 group-hover:opacity-100 sm:flex">
                        <Maximize2 className="h-3.5 w-3.5" />
                      </span>
                    </div>
                  </figure>
                );
              })}
            </div>

            {/* Thumbnail rail. Phone and tablet only — on a desktop every shot
                is already on screen in the wall above, so a second copy of the
                same list would be decoration. */}
            {mediaWall.length > 1 && (
              <div className="flex gap-2 overflow-x-auto px-1 pt-2 [-ms-overflow-style:none] [scrollbar-width:none] lg:hidden [&::-webkit-scrollbar]:hidden">
                {mediaWall.map(({ url }, index) => (
                  <button
                    key={`thumb-${index}`}
                    type="button"
                    onClick={() => scrollGalleryTo(index)}
                    aria-label={`Go to image ${index + 1}`}
                    aria-current={activeMedia === index}
                    className={`relative h-[84px] w-[62px] shrink-0 overflow-hidden bg-[#FBFBFB] transition-opacity ${
                      activeMedia === index
                        ? "opacity-100 outline outline-1 outline-[#101010]"
                        : "opacity-60"
                    }`}
                  >
                    <Image
                      src={formatImageUrl(url)}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="62px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: buy box, product copy, cross-sell. Capped at the
              reference's 500-ish px and centred, so the column can be wide
              without the line length going with it. */}
          <div className="w-full lg:sticky lg:top-20">

            <div className="mx-auto w-full max-w-[520px] px-5 pt-6 lg:pt-10">

              {/* Breadcrumb — the trail the shopper came down, last crumb greyed
                  because it names the page they are already on. */}
              <nav aria-label="Breadcrumb" className={`flex flex-wrap items-center gap-x-2 gap-y-1 ${AT_TITLE}`}>
                <Link href="/" className="hover:underline hover:underline-offset-4">
                  Home
                </Link>
                {categoryPath.map((crumb, i) => (
                  <React.Fragment key={crumb}>
                    <span aria-hidden="true" className="text-[#CBCBCB]">/</span>
                    <span className={i === categoryPath.length - 1 ? "text-[#717171]" : ""}>
                      {crumb}
                    </span>
                  </React.Fragment>
                ))}
              </nav>

              {/* Title */}
              <h1 className={`mt-3 ${AT_SUBHEAD}`}>{product.title}</h1>

              {/* Price, rating and the sale clock share one line — each of them
                  changes what the number beside it means. */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
                <div className={`flex items-baseline gap-2 ${AT_BASE_LARGE}`}>
                  {currentDiscountPrice && currentDiscountPrice < currentBasePrice ? (
                    <>
                      <span className="text-[#B40C00]">{formatPrice(currentDiscountPrice)}</span>
                      <span className="line-through">{formatPrice(currentBasePrice)}</span>
                    </>
                  ) : (
                    <span>{formatPrice(currentBasePrice)}</span>
                  )}
                </div>

                {/* Reviews arrive from a client fetch, so this is absent on
                    first paint by design — rendering an empty five-star row
                    would misreport an unrated product as zero-rated. */}
                {reviews.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setOpenAccordions((prev) => ({ ...prev, reviews: true }));
                      reviewsRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
                    }}
                    className="flex cursor-pointer items-center gap-1.5"
                    aria-label={`Rated ${avgRating} out of 5 from ${reviews.length} review${reviews.length === 1 ? "" : "s"}`}
                  >
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <Star
                          key={star}
                          className={`h-3.5 w-3.5 ${
                            star <= Math.round(Number(avgRating))
                              ? "fill-[#101010] text-[#101010]"
                              : "fill-transparent text-[#CBCBCB]"
                          }`}
                        />
                      ))}
                    </span>
                    <span className={`${AT_LABEL} text-[#717171]`}>({reviews.length})</span>
                  </button>
                )}

                {timeLeft && (
                  <span className={`flex items-center gap-2 bg-[#F0F0F0] px-2 py-1 text-[#B40C00] ${AT_TITLE}`}>
                    <span className="h-1.5 w-1.5 rounded-full bg-[#B40C00]" />
                    Ends in {timeLeft}
                  </span>
                )}
              </div>

              {/* Read from Settings → Shipping rather than hardcoded: the number is a
                  promise, and a stale one is worse than none. Hidden entirely when
                  no threshold is configured — there is nothing honest to say. */}
              {freeShippingThreshold !== null && (
                <p className={`mt-2 ${AT_LABEL} font-normal text-[#717171]`}>
                  Free shipping on orders over {formatPrice(freeShippingThreshold)}
                </p>
              )}

              {product.tags && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {product.tags
                    .split(",")
                    .map((t) => t.trim())
                    .filter(Boolean)
                    .map((tag) => (
                      <span
                        key={tag}
                        className="bg-[#F0F0F0] px-1.5 py-0.5 text-[10px] font-normal uppercase leading-[14px] tracking-[0.05em] text-[#717171]"
                      >
                        {tag}
                      </span>
                    ))}
                </div>
              )}

              {/* COLOUR — 14px dots that stretch into a pill when chosen, which
                  is how the reference marks the active colourway. */}
              {uniqueColors.length > 0 && (
                <div className="mt-7">
                  <div className={`${AT_TITLE} text-[#717171]`}>
                    Color<span className="text-[#101010]"> {selectedColor}</span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-3">
                    {uniqueColors.map((color) => {
                      const dbColor = dbColors.find((c) => c.name.toLowerCase() === color.toLowerCase());
                      const style = swatchStyle(dbColor ?? { value: COLOR_HEX_MAP[color] || "#71717a" });
                      const isSelected = selectedColor === color;
                      return (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setSelectedColor(color)}
                          title={color}
                          aria-label={color}
                          aria-pressed={isSelected}
                          className={`h-[14px] cursor-pointer bg-cover bg-center ring-1 ring-inset ring-[#101010]/15 transition-[width,border-radius] duration-300 ${
                            isSelected ? "w-[26px] rounded-[14px]" : "w-[14px] rounded-full hover:opacity-80"
                          }`}
                          style={style}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SIZE — square-cornered label swatches, with the two size aids
                  sat on the same line as the legend. */}
              {uniqueSizes.length > 0 && (
                <div className="mt-6">
                  <div className="flex w-full flex-row flex-wrap items-center justify-between gap-2">
                    <div className={`${AT_TITLE} text-[#717171]`}>
                      Size{selectedSize && <span className="text-[#101010]"> {selectedSize}</span>}
                    </div>
                    <div className="flex items-center gap-4">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSizeTab("size-chart");
                          setShowSizeChart(true);
                        }}
                        className={`${AT_LABEL} cursor-pointer underline decoration-[1.5px] underline-offset-[3px] hover:text-[#717171]`}
                      >
                        Size Chart
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSizeTab("heights");
                          setWizardStep("wizard-input");
                          setShowSizeChart(true);
                        }}
                        className={`${AT_LABEL} cursor-pointer underline decoration-[1.5px] underline-offset-[3px] hover:text-[#717171]`}
                      >
                        Find My Size
                      </button>
                    </div>
                  </div>
                  <ul className="mt-3 flex flex-wrap items-start gap-2">
                    {uniqueSizes.map((size) => {
                      const isSelected = selectedSize === size;
                      const available = isSizeAvailable(size);
                      return (
                        <li key={size}>
                          <button
                            type="button"
                            onClick={() => setSelectedSize(size)}
                            disabled={!available}
                            title={available ? undefined : `Not available in ${selectedLength || selectedColor}`}
                            className={`min-w-[52px] rounded-[2px] border px-5 py-4 text-center ${AT_LABEL} transition-all ${
                              !available
                                ? "cursor-not-allowed border-[#E8E8E8] text-[#CBCBCB] line-through"
                                : isSelected
                                  ? "cursor-pointer border-[#101010] text-[#101010] shadow-[0_0_0_1px_#101010]"
                                  : "cursor-pointer border-[#CBCBCB] text-[#717171] hover:border-[#101010] hover:text-[#101010]"
                            }`}
                          >
                            {size}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* LENGTH */}
              {uniqueLengths.length > 0 && (
                <div className="mt-6">
                  <div className={`${AT_TITLE} text-[#717171]`}>
                    Length{selectedLength && <span className="text-[#101010]"> {selectedLength}</span>}
                  </div>
                  <ul className="mt-3 flex flex-wrap items-start gap-2">
                    {uniqueLengths.map((len) => {
                      const isSelected = selectedLength === len;
                      // Lengths stay clickable even when the current size is not
                      // made in them: the effect above moves the shopper to a
                      // size that is, which beats dead-ending the control they
                      // came to the page to use.
                      const available = isLengthAvailable(len);
                      return (
                        <li key={len}>
                          <button
                            type="button"
                            onClick={() => setSelectedLength(len)}
                            className={`cursor-pointer rounded-[2px] border px-5 py-4 text-center ${AT_LABEL} transition-all ${
                              isSelected
                                ? "border-[#101010] text-[#101010] shadow-[0_0_0_1px_#101010]"
                                : available
                                  ? "border-[#CBCBCB] text-[#717171] hover:border-[#101010] hover:text-[#101010]"
                                  : "border-[#E8E8E8] text-[#CBCBCB]"
                            }`}
                          >
                            {len}
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {/* MADE-TO-MEASURE */}
              {measurementTemplate && (
                <div className="mt-6">
                  <CustomMeasurementForm
                    template={measurementTemplate}
                    surcharge={customSurcharge}
                    unitPrice={customUnitPrice}
                    onChange={setCustomMeasurement}
                  />
                </div>
              )}

              {/* DYNAMIC ACTION BUTTON.
                  The label names what is still missing rather than always
                  reading "Add To Bag" and explaining itself in a popup after
                  the click. */}
              <div className="mt-6 flex gap-2">
                <button
                  onClick={() => handleAddToBag()}
                  disabled={addedToBag || !canAddToBag}
                  className={`flex h-[54px] flex-1 items-center justify-center gap-2 rounded-[2px] px-4 text-[14px] font-semibold leading-[14px] tracking-[0.02em] transition-colors ${
                    !canAddToBag
                      ? "cursor-not-allowed bg-[#CBCBCB] text-white"
                      : addedToBag
                        ? "cursor-pointer bg-[#101010] text-white"
                        : "cursor-pointer bg-[#101010] text-white hover:bg-[#2B2B2B]"
                  }`}
                >
                  {addedToBag ? (
                    <><Check className="h-4 w-4" /> Added! Going to Cart…</>
                  ) : canAddToBag ? (
                    <><ShoppingBag className="h-4 w-4" /> {buyLabel}</>
                  ) : (
                    <>{buyLabel}</>
                  )}
                </button>

                <button
                  onClick={(e) => {
                    e.preventDefault();
                    toggleWishlist({
                      productId: product.id,
                      slug: product.slug,
                      title: product.title,
                      thumbnail: product.thumbnail || "https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image",
                      basePrice: product.basePrice,
                      discountPrice: product.discountPrice
                    });
                  }}
                  aria-label={wishlisted ? "Remove from wishlist" : "Save to wishlist"}
                  className={`flex h-[54px] w-[54px] shrink-0 cursor-pointer items-center justify-center rounded-[2px] border transition-colors ${
                    wishlisted
                      ? "border-[#101010] text-[#101010]"
                      : "border-[#CBCBCB] text-[#717171] hover:border-[#101010] hover:text-[#101010]"
                  }`}
                >
                  <Heart className="h-5 w-5" strokeWidth={1.5} fill={wishlisted ? "currentColor" : "none"} />
                </button>
              </div>

              {/* Stock. Sat under the button rather than above the swatches: it
                  is a fact about the combination the shopper just assembled,
                  and about the button it disables. */}
              {(isOutOfStock || isLowStock) && (
                <div className="mt-4">
                  {isOutOfStock ? (
                    <div>
                      <span className={`${AT_TITLE} bg-[#F0F0F0] px-2 py-1 text-[#717171]`}>Out of Stock</span>
                      {!notifySuccess ? (
                        <div className="mt-3 flex items-center gap-2">
                          <input
                            type="email"
                            placeholder="Email address for restock alert"
                            value={notifyEmail}
                            onChange={(e) => setNotifyEmail(e.target.value)}
                            className="h-10 flex-1 rounded-[2px] border border-[#CBCBCB] px-3 text-[13px] placeholder:text-[#717171] focus:border-[#101010] focus:outline-none"
                          />
                          <button
                            disabled={notifyLoading || !notifyEmail}
                            onClick={async () => {
                              if (!notifyEmail) return;
                              setNotifyLoading(true);
                              try {
                                const res = await fetch("/api/stock-alert", {
                                  method: "POST",
                                  headers: { "Content-Type": "application/json" },
                                  body: JSON.stringify({ email: notifyEmail, variantId: activeVariant?.id })
                                });
                                if (res.ok) {
                                  setNotifySuccess(true);
                                  Swal.fire({ title: "Subscribed!", text: "We'll email you when it's back in stock.", icon: "success", confirmButtonColor: "#101010" });
                                } else {
                                  const data = await res.json();
                                  Swal.fire({ title: "Oops!", text: data.error || "Failed to subscribe.", icon: "error", confirmButtonColor: "#101010" });
                                }
                              } finally {
                                setNotifyLoading(false);
                              }
                            }}
                            className={`h-10 shrink-0 cursor-pointer rounded-[2px] bg-[#101010] px-4 ${AT_LABEL} text-white transition-colors hover:bg-[#2B2B2B] disabled:cursor-not-allowed disabled:bg-[#CBCBCB]`}
                          >
                            {notifyLoading ? "…" : "Notify Me"}
                          </button>
                        </div>
                      ) : (
                        <p className={`mt-3 flex items-center gap-1.5 ${AT_LABEL}`}>
                          <Check className="h-4 w-4" /> You&rsquo;re on the list!
                        </p>
                      )}
                    </div>
                  ) : (
                    <p className={`${AT_LABEL} text-[#B40C00]`}>
                      Only {activeStock} left — order soon
                    </p>
                  )}
                </div>
              )}

              {/* Brand promises. Two claims on one grey band, each a link to the
                  policy that backs it — the reference opens a drawer, we send
                  them to the page that already holds the same copy rather than
                  duplicating it somewhere that can fall out of date. */}
              <div className={`mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 bg-[#F0F0F0] p-2.5 ${AT_LABEL} text-[#717171]`}>
                <Link href="/pages/shipping-policy" className="group flex items-center gap-3 transition-colors hover:text-[#101010]">
                  <Truck className="h-5 w-5" strokeWidth={1.25} />
                  <span className="underline-offset-4 group-hover:underline">Free Delivery</span>
                </Link>
                <Link href="/pages/returns-exchanges" className="group flex items-center gap-3 transition-colors hover:text-[#101010]">
                  <RotateCcw className="h-5 w-5" strokeWidth={1.25} />
                  <span className="underline-offset-4 group-hover:underline">30-Day Returns</span>
                </Link>
              </div>
            </div>

            {/* ── PRODUCT DETAILS ──────────────────────────────────────────
                A one-line summary of the garment, then everything else folded
                away behind it. The summary is the meta description, which is
                already written to be exactly that sentence — no second field to
                keep in step. */}
            {/* Not capped at the buy form's 520px. On the reference this block
                is a *sibling* of the form, not a child, so it keeps the whole
                half-page while the controls above stay narrow — which is what
                leaves room for the panel and the photograph to sit side by side. */}
            <div className="mt-[50px] w-full px-5">
              <div className="flex flex-col md:flex-row md:items-stretch">
              {/* Painted in the shopper's colourway — the block is the one place
                  on the page big enough to show a colour at any size, and it
                  changes with the swatch above. */}
              <div
                data-color-panel={panelColor ? (panelIsLight ? "light" : "dark") : undefined}
                style={panelVars}
                className="w-full px-6 py-8 transition-[background-color,color] duration-500 md:w-1/2 md:px-8"
              >
              <div className={`flex flex-col items-center gap-2 ${AT_LABEL} text-[var(--pk-muted)]`}>
                <ChevronDown className="h-4 w-4" />
                <span>Product Details</span>
              </div>

              <div className="mt-6">
                <div className="w-full">
                  {product.metaDescription && (
                    <h2 className={AT_SUBHEAD}>{product.metaDescription}</h2>
                  )}

                  <div className="mt-6 divide-y divide-[var(--pk-rule)] border-y border-[var(--pk-rule)]">

                    {/* 1. PRODUCT DESCRIPTION */}
                    <div>
                      <button
                        onClick={() => toggleAccordion("description")}
                        aria-expanded={!!openAccordions.description}
                        className={`flex w-full cursor-pointer items-center justify-between gap-2 py-4 text-left ${AT_BASE_LARGE}`}
                      >
                        <span>Product Description</span>
                        <Plus className={`h-4 w-4 shrink-0 transition-transform duration-500 ${openAccordions.description ? "rotate-45" : ""}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-500 ${openAccordions.description ? "max-h-[40rem] opacity-100" : "max-h-0 opacity-0"}`}>
                        <div
                          className={`max-w-none pb-5 ${AT_PROSE}`}
                          dangerouslySetInnerHTML={{ __html: stripScriptTags(product.description ?? "") }}
                        />
                      </div>
                    </div>

                    {/* 2. SIZE & FIT */}
                    {(product as any).sizeAndFit && (
                      <div>
                        <button
                          onClick={() => toggleAccordion("fit")}
                          aria-expanded={!!openAccordions.fit}
                          className={`flex w-full cursor-pointer items-center justify-between gap-2 py-4 text-left ${AT_BASE_LARGE}`}
                        >
                          <span>Size &amp; Fit</span>
                          <Plus className={`h-4 w-4 shrink-0 transition-transform duration-500 ${openAccordions.fit ? "rotate-45" : ""}`} />
                        </button>
                        <div className={`overflow-hidden transition-all duration-500 ${openAccordions.fit ? "max-h-[40rem] opacity-100" : "max-h-0 opacity-0"}`}>
                          <div
                            className={`max-w-none pb-5 ${AT_PROSE}`}
                            dangerouslySetInnerHTML={{ __html: stripScriptTags((product as any).sizeAndFit) }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 3. FABRIC & CARE. "Material", not "Fabric": the same
                        field carries care notes for footwear and accessories,
                        where fabric reads wrong. */}
                    {(product as any).fabricAndCare && (
                      <div>
                        <button
                          onClick={() => toggleAccordion("care")}
                          aria-expanded={!!openAccordions.care}
                          className={`flex w-full cursor-pointer items-center justify-between gap-2 py-4 text-left ${AT_BASE_LARGE}`}
                        >
                          <span>Material &amp; Care</span>
                          <Plus className={`h-4 w-4 shrink-0 transition-transform duration-500 ${openAccordions.care ? "rotate-45" : ""}`} />
                        </button>
                        <div className={`overflow-hidden transition-all duration-500 ${openAccordions.care ? "max-h-[40rem] opacity-100" : "max-h-0 opacity-0"}`}>
                          <div
                            className={`max-w-none pb-5 ${AT_PROSE}`}
                            dangerouslySetInnerHTML={{ __html: stripScriptTags((product as any).fabricAndCare) }}
                          />
                        </div>
                      </div>
                    )}

                    {/* 4. REVIEWS */}
                    <div ref={reviewsRef}>
                      <button
                        onClick={() => toggleAccordion("reviews")}
                        aria-expanded={!!openAccordions.reviews}
                        className={`flex w-full cursor-pointer items-center justify-between gap-2 py-4 text-left ${AT_BASE_LARGE}`}
                      >
                        {/* Score, stars and count beside the label behind a rule,
                            the way the reference stacks them — the number is the
                            reason to open this row, so it earns the space. */}
                        <span className="flex items-center gap-3">
                          Reviews
                          {reviews.length > 0 && (
                            <span className="flex flex-col gap-0.5 border-l border-[var(--pk-rule)] pl-3">
                              <span className="flex items-center gap-1.5">
                                <span className={AT_LABEL}>{avgRating}</span>
                                <span className="flex items-center gap-px" aria-hidden="true">
                                  {[1, 2, 3, 4, 5].map((star) => (
                                    <Star
                                      key={star}
                                      className={`h-3 w-3 ${
                                        star <= Math.round(Number(avgRating))
                                          ? "fill-current text-[var(--pk)]"
                                          : "fill-transparent text-[var(--pk-faint)]"
                                      }`}
                                    />
                                  ))}
                                </span>
                              </span>
                              <span className={`${AT_LABEL} font-normal text-[var(--pk-muted)]`}>
                                Based on {reviews.length} review{reviews.length === 1 ? "" : "s"}
                              </span>
                            </span>
                          )}
                        </span>
                        <Plus className={`h-4 w-4 shrink-0 transition-transform duration-500 ${openAccordions.reviews ? "rotate-45" : ""}`} />
                      </button>
                      <div className={`overflow-hidden transition-all duration-500 ${openAccordions.reviews ? "max-h-[1400px] opacity-100" : "max-h-0 opacity-0"}`}>
                        <div className={`pb-6 ${AT_LABEL} font-normal text-[var(--pk-muted)]`}>
                          {reviewsLoading ? (
                            <p>Loading reviews…</p>
                          ) : reviews.length === 0 ? (
                            <p>No reviews yet. Be the first to review this piece.</p>
                          ) : (
                            <ul className="divide-y divide-[var(--pk-rule)]">
                              {reviews.map((r) => (
                                <li key={r.id} className="py-4 first:pt-0">
                                  <div className="flex items-center gap-2">
                                    <span className="flex items-center gap-0.5">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <Star
                                          key={star}
                                          className={`h-3 w-3 ${star <= r.rating ? "fill-[var(--pk)] text-[var(--pk)]" : "fill-transparent text-[var(--pk-faint)]"}`}
                                        />
                                      ))}
                                    </span>
                                    <span className={`${AT_TITLE} text-[var(--pk)]`}>{r.user?.name || "Guest"}</span>
                                  </div>
                                  <p className="mt-2">{r.comment}</p>
                                </li>
                              ))}
                            </ul>
                          )}

                          <div className="mt-6 border-t border-[var(--pk-rule)] pt-5">
                            <h4 className={`${AT_TITLE} text-[var(--pk)]`}>Write a Review</h4>
                            <form onSubmit={handleReviewSubmit} className="mt-3 space-y-3">
                              <input
                                type="text"
                                placeholder="Your name (optional)"
                                value={newReview.name}
                                onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                                className="h-10 w-full rounded-[2px] border border-[var(--pk-faint)] bg-transparent px-3 text-[13px] text-[var(--pk)] placeholder:text-[var(--pk-muted)] focus:border-[var(--pk)] focus:outline-none"
                              />
                              <div className="flex items-center gap-3">
                                <label htmlFor="review-rating" className={`${AT_TITLE} text-[var(--pk-muted)]`}>Rating</label>
                                <select
                                  id="review-rating"
                                  value={newReview.rating}
                                  onChange={(e) => setNewReview({ ...newReview, rating: Number(e.target.value) })}
                                  // A native select cannot be trusted to render its own value legibly on a
                                  // painted background, so it keeps a white surface whatever the panel does.
                                  className="h-10 rounded-[2px] border border-[var(--pk-faint)] bg-white px-3 text-[13px] text-[#101010] focus:border-[var(--pk)] focus:outline-none"
                                >
                                  <option value="5">5 Stars</option>
                                  <option value="4">4 Stars</option>
                                  <option value="3">3 Stars</option>
                                  <option value="2">2 Stars</option>
                                  <option value="1">1 Star</option>
                                </select>
                              </div>
                              <textarea
                                required
                                placeholder="Your review"
                                value={newReview.comment}
                                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                                className="min-h-[90px] w-full rounded-[2px] border border-[var(--pk-faint)] bg-transparent p-3 text-[13px] text-[var(--pk)] placeholder:text-[var(--pk-muted)] focus:border-[var(--pk)] focus:outline-none"
                              />
                              <button
                                type="submit"
                                disabled={submittingReview}
                                className={`h-10 cursor-pointer rounded-[2px] border border-[var(--pk)] px-5 ${AT_LABEL} text-[var(--pk)] transition-colors hover:bg-[var(--pk)] hover:text-[var(--pk-contrast)] disabled:cursor-not-allowed disabled:opacity-50`}
                              >
                                {submittingReview ? "Submitting…" : "Submit Review"}
                              </button>
                            </form>
                          </div>
                        </div>
                      </div>
                    </div>

                  </div>
                </div>

              </div>
              </div>

              {/* Flat-lay of the selected colourway, beside the panel and the
                  same height as it — the panel decides how tall the pair is,
                  which is why this is a stretched flex item with an absolutely
                  positioned photograph rather than a fixed aspect box.
                  `object-contain`: the reference floats the whole garment on a
                  pale ground, and cropping a flat-lay to fill would cut the
                  hem off. Dropped below md, where two halves would leave the
                  copy about 160px wide. */}
              <div className="relative hidden w-1/2 bg-[#E8E8E8] md:block">
                <Image
                  key={flatLayImage}
                  src={formatImageUrl(flatLayImage)}
                  alt={`${product.title} in ${selectedColor}`}
                  fill
                  sizes="(max-width: 1280px) 25vw, 22vw"
                  className="select-none object-contain p-6"
                />
              </div>
              </div>
            </div>

            {/* Model cross-sell — what the model has on with it. */}
            {completeLookItem && (
              <div className="mx-auto mt-12 w-full max-w-[520px] px-5 pb-12">
                <div className={`${AT_LABEL} text-[#717171] md:text-[24px] md:leading-[33px]`}>
                  Model is also wearing
                </div>
                <Link href={`/product/${completeLookItem.slug}`} className="group mt-4 block w-[62%] max-w-[240px]">
                  <div className="relative aspect-[5/7] overflow-hidden bg-[#FBFBFB]">
                    <Image
                      src={formatImageUrl(completeLookItem.thumbnail)}
                      alt={completeLookItem.title}
                      fill
                      sizes="240px"
                      className="object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                    />
                  </div>
                  <p className={`mt-3 ${AT_LABEL} text-[#717171] group-hover:text-[#101010]`}>
                    {completeLookItem.title}
                  </p>
                  <p className={`mt-1 ${AT_LABEL}`}>{formatPrice(completeLookItem.price)}</p>
                </Link>
              </div>
            )}

          </div>
        </div>

        {/* ── YOU MAY ALSO LIKE ──────────────────────────────────────────── */}
        <section className="mx-auto mt-16 w-full max-w-[1800px] overflow-hidden border-t border-[#101010]/10 px-5 py-12">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-[24px] font-semibold leading-[28px] tracking-[0.01em] sm:text-[35px] sm:leading-[42px] sm:tracking-[-0.01em]">
              You may also like
            </h2>
            <div className="flex items-center gap-6">
              <button
                onClick={() => setActiveRelatedTab("recommended")}
                className={`${AT_LABEL} cursor-pointer pb-1 transition-colors ${
                  activeRelatedTab === "recommended"
                    ? "border-b border-[#101010] text-[#101010]"
                    : "border-b border-transparent text-[#717171] hover:text-[#101010]"
                }`}
              >
                Recommended
              </button>
              <button
                onClick={() => setActiveRelatedTab("recently")}
                className={`${AT_LABEL} cursor-pointer pb-1 transition-colors ${
                  activeRelatedTab === "recently"
                    ? "border-b border-[#101010] text-[#101010]"
                    : "border-b border-transparent text-[#717171] hover:text-[#101010]"
                }`}
              >
                Recently Viewed
              </button>
            </div>
          </div>

          {activeRelatedTab === "recently" && recentlyViewed.length === 0 ? (
            <p className={`mt-8 ${AT_LABEL} font-normal text-[#717171]`}>
              Nothing here yet — the pieces you open will collect on this tab.
            </p>
          ) : (
          <div
            className="no-scrollbar mt-8 flex w-full gap-5 overflow-x-auto pb-2"
            style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
          >
            {(activeRelatedTab === "recommended" ? relatedProducts : recentlyViewed)
              .slice(0, 5)
              .map((prod) => (
                <div key={prod.id} className="w-[260px] min-w-[260px] flex-shrink-0 sm:w-[300px] sm:min-w-[300px]">
                  <ProductCard product={prod} idPrefix="related" />
                </div>
              ))}
          </div>
          )}
        </section>

        {/* The footer already carries the newsletter, with a form that is
            actually wired to /api/subscribe. The copy of it that used to sit
            here had a bare <input> and a <button> with no handler — a sign-up
            box that silently did nothing, printed directly above a working one. */}

      </main>



      {/* Premium Tabbed Size Chart Modal Overlay (Matches Zar Tall Layout perfectly) */}
      {/* ─── Full-screen image viewer ─────────────────────────────────────────
          Only the current shot is mounted, so opening the viewer fetches one
          image and each arrow fetches the next — a product with twenty photos
          does not pay for nineteen it may never show. */}
      {/* FULL-SCREEN IMAGE VIEWER
          A scrolling wall rather than one photo at a time: every shot is laid
          out at the full width of the frame and you scroll through them, with a
          thumbnail rail down the left to jump. Rendering at full width is what
          replaces the old click-to-zoom — the photograph is already larger than
          the screen, so there is nothing left to magnify into. */}
      {lightboxIndex !== null && lightboxImages.length > 0 && (
        <div
          className="fixed inset-0 z-[110] flex bg-white animate-in fade-in duration-200"
          role="dialog"
          aria-modal="true"
          aria-label="Product image viewer"
        >
          {/* Thumbnail rail. Hidden on a phone, where it would take a third of
              the width to save a scroll the visitor is already doing. */}
          {lightboxImages.length > 1 && (
            <div className="hidden w-[104px] shrink-0 overflow-y-auto overscroll-contain border-r border-zinc-200 bg-white p-3 sm:block">
              <div className="flex flex-col gap-2">
                {lightboxImages.map((thumbUrl, i) => (
                  <button
                    key={`thumb-${i}`}
                    type="button"
                    onClick={() => {
                      setLightboxActive(i);
                      scrollToLightboxPane(i);
                    }}
                    aria-label={`Go to image ${i + 1}`}
                    aria-current={i === lightboxActive}
                    className={`relative aspect-[3/4] w-full overflow-hidden bg-zinc-100 transition-opacity ${
                      i === lightboxActive
                        ? "outline outline-2 outline-offset-[-2px] outline-zinc-900"
                        : "opacity-60 hover:opacity-100"
                    }`}
                  >
                    <Image
                      src={formatImageUrl(thumbUrl)}
                      alt=""
                      aria-hidden="true"
                      fill
                      sizes="104px"
                      className="object-cover"
                    />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* The wall itself. */}
          <div
            ref={lightboxScrollRef}
            onScroll={onLightboxScroll}
            className="relative flex-1 overflow-y-auto overscroll-contain bg-zinc-100"
          >
            {lightboxImages.map((imgUrl, i) => {
              const copy = imageCopyByUrl.get(imgUrl);
              const caption = productImageCaption(copy?.caption);
              return (
                <div
                  key={`pane-${i}`}
                  ref={(node) => {
                    lightboxPaneRefs.current[i] = node;
                  }}
                  className="relative w-full"
                >
                  {/* width/height are the intrinsic ratio only — `w-full h-auto`
                      is what actually sizes it. Given to next/image so the space
                      is reserved before the file arrives and the wall does not
                      reflow under the scroll position. */}
                  <Image
                    src={formatImageUrl(imgUrl)}
                    alt={productImageAlt({
                      custom: copy?.alt,
                      title: product.title,
                      brand: product.brand?.name,
                      color: copy?.color || selectedColor,
                      index: i,
                      total: lightboxImages.length,
                    })}
                    width={1500}
                    height={2000}
                    sizes="(max-width: 640px) 100vw, calc(100vw - 104px)"
                    // Only the shot being opened is worth blocking on; the rest
                    // load as the visitor reaches them.
                    priority={i === lightboxIndex}
                    className="h-auto w-full select-none"
                  />

                  {caption && (
                    <p className="pointer-events-none absolute bottom-4 left-4 right-4 line-clamp-2 rounded-sm bg-black/45 px-3 py-2 text-[11px] font-medium leading-snug text-white backdrop-blur-md sm:right-auto sm:max-w-[60%]">
                      {caption}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Counter and close float over the wall. Solid white rather than a
              translucent pill: they sit over photography of unknown brightness
              and have to stay findable through the whole scroll. */}
          <span className="pointer-events-none absolute left-1/2 top-5 z-20 -translate-x-1/2 bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-widest text-zinc-900 shadow-sm sm:left-auto sm:right-24 sm:translate-x-0">
            {lightboxActive + 1} / {lightboxImages.length}
          </span>

          <button
            type="button"
            onClick={() => setLightboxIndex(null)}
            aria-label="Close"
            className="absolute right-4 top-4 z-20 flex h-12 w-12 cursor-pointer items-center justify-center bg-white text-zinc-900 shadow-sm transition-colors hover:bg-zinc-100 sm:right-6 sm:top-6"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      )}

      {showSizeChart && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-sm transition-all duration-300"
          onClick={() => setShowSizeChart(false)}
        >
          <div
            className={`relative w-full bg-white border border-zinc-200 rounded-sm shadow-2xl p-6 sm:p-8 flex flex-col max-h-[95vh] overflow-y-auto overscroll-contain transition-all duration-300 animate-in fade-in zoom-in-95 ${
              activeSizeTab === "heights" && wizardStep === "wizard-input" ? "max-w-[480px]" : "max-w-2xl"
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Navigation Tabs */}
            {activeSizeTab === "heights" && wizardStep === "wizard-input" ? (
              <div className="flex items-center justify-between mb-8 -mt-2 -mx-2">
                {/* Store Logo */}
                <div className="flex items-center">
                  {settings.brand_logo_url ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={settings.brand_logo_url}
                      alt={storeName}
                      className="h-8 w-auto max-w-[140px] object-contain object-left"
                    />
                  ) : (
                    <span className="text-sm font-black uppercase tracking-widest text-zinc-950">
                      {storeName}
                    </span>
                  )}
                </div>
                {/* Close Button */}
                <button
                  onClick={() => setShowSizeChart(false)}
                  className="p-1 text-zinc-955 hover:text-zinc-600 transition-colors cursor-pointer focus:outline-none"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <div className="flex items-stretch border-b border-zinc-150 -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-8 bg-zinc-50">
                <button
                  onClick={() => {
                    setActiveSizeTab("heights");
                    setWizardStep("heights-list");
                  }}
                  className={`flex-1 py-4 text-center text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all cursor-pointer border-r border-b border-zinc-150 ${activeSizeTab === "heights"
                      ? "bg-white text-zinc-955 border-b-transparent"
                      : "text-zinc-400 hover:text-zinc-700 bg-zinc-50/50"
                    }`}
                >
                  Our Heights & Fit
                </button>
                <button
                  onClick={() => setActiveSizeTab("size-chart")}
                  className={`flex-1 py-4 text-center text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all cursor-pointer border-r border-b border-zinc-150 ${activeSizeTab === "size-chart"
                      ? "bg-white text-zinc-955 border-b-transparent"
                      : "text-zinc-400 hover:text-zinc-700 bg-zinc-50/50"
                    }`}
                >
                  Size Chart
                </button>
                <button
                  onClick={() => setActiveSizeTab("measure")}
                  className={`flex-1 py-4 text-center text-[10px] sm:text-xs font-bold tracking-widest uppercase transition-all cursor-pointer border-b border-zinc-150 ${activeSizeTab === "measure"
                      ? "bg-white text-zinc-955 border-b-transparent"
                      : "text-zinc-400 hover:text-zinc-700 bg-zinc-50/50"
                    }`}
                >
                  How To Measure
                </button>
                <button
                  onClick={() => setShowSizeChart(false)}
                  className="px-5 border-l border-b border-zinc-150 text-zinc-400 hover:text-zinc-800 transition-colors bg-zinc-50/50 hover:bg-zinc-100 flex items-center justify-center cursor-pointer"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* TAB 1: OUR HEIGHTS & FIT - HEIGHTS LIST VIEW */}
            {activeSizeTab === "heights" && wizardStep === "heights-list" && (
              <div className="flex flex-col animate-in fade-in duration-250">
                <div className="text-center mb-8">
                  <h2 className="text-2xl font-black uppercase tracking-wider text-zinc-900 mb-2">
                    {heightsGuide.heading}
                  </h2>
                  <p className="text-[10px] sm:text-xs text-zinc-500 font-bold uppercase tracking-widest leading-relaxed max-w-md mx-auto">
                    {heightsGuide.subtitle}
                  </p>
                </div>

                {heightsRows.length > 0 && heightsGuide.columns.length > 0 && (
                  <div className="border border-zinc-150 rounded-sm overflow-x-auto mb-8 shadow-sm">
                    <table className="w-full text-center border-collapse text-xs">
                      <thead>
                        <tr className="bg-zinc-50 border-b border-zinc-150 text-[10px] uppercase tracking-wider font-extrabold text-zinc-700">
                          {heightsGuide.columns.map((column, idx) => (
                            <th key={idx} className={`p-3.5 ${headingCellAlign(idx, heightsGuide.columns.length)}`}>
                              {column}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-100 text-zinc-600 font-bold">
                        {heightsRows.map((row, rowIdx) => (
                          <tr key={rowIdx} className="hover:bg-zinc-50/50 transition-colors">
                            {heightsGuide.columns.map((_, colIdx) => (
                              <td
                                key={colIdx}
                                className={`p-4 ${headingCellAlign(colIdx, heightsGuide.columns.length)} ${
                                  colIdx === 0 ? "text-zinc-950 font-black" : ""
                                }`}
                              >
                                {row[colIdx] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Model Heights Collage. Hidden until at least one photo is
                    set in Settings → Branding: three empty tiles read as a
                    broken page to a shopper, and the heading and table above
                    already stand on their own without them. */}
                {heightsModels.length > 0 && (
                  <div className="bg-zinc-50 p-6 rounded-sm border border-zinc-100">
                    <div
                      className="grid gap-4"
                      style={{ gridTemplateColumns: `repeat(${heightsModels.length}, minmax(0, 1fr))` }}
                    >
                      {heightsModels.map((model, idx) => (
                        <div
                          key={idx}
                          className="relative overflow-hidden aspect-[3/4] bg-zinc-200 border border-zinc-200 rounded-xs shadow-xs group"
                        >
                          {/* Decorative: the table above carries the actual
                              height-to-length mapping, so an invented alt here
                              would only repeat it to a screen reader. */}
                          <Image
                            src={model.image.trim()}
                            alt=""
                            fill
                            className="object-cover grayscale contrast-[1.05] brightness-95 group-hover:scale-105 transition-transform duration-300"
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Footer Controls with Interactive Wizard Button */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-150">
                  <div className="w-10 h-10" />

                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 text-indigo-600 fill-indigo-600" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                  </div>

                  <button
                    onClick={() => setWizardStep("wizard-input")}
                    className="bg-zinc-950 hover:bg-zinc-800 text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-colors rounded-sm cursor-pointer shadow-md"
                  >
                    Input Measurements
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: OUR HEIGHTS & FIT - INTERACTIVE WIZARD INPUT (Matches Screenshots exactly) */}
            {activeSizeTab === "heights" && wizardStep === "wizard-input" && (() => {
              // Every chart-driven box counts too — a blank one is a measurement
              // the comparison silently loses, which is how you get a confident
              // answer built on one number.
              const chartBoxesFilled = wizardPoints.every((p) => {
                const v = parseFloat(bodyInputs[p] ?? "");
                return Number.isFinite(v) && v > 0;
              });

              const isFormValid = Boolean(
                (!isMetric
                  ? heightFt && heightIn && weightLbs && age && waistIn
                  : heightCm && weightKg && age && waistIn) && chartBoxesFilled
              );
              
              return (
                <div className="flex flex-col animate-in fade-in duration-250">
                  {/* Title Header */}
                  <h2 className="text-xl sm:text-2xl font-light text-zinc-900 text-center mb-2 font-sans">
                    Input your <span className="font-extrabold text-zinc-950">measurements.</span>
                  </h2>

                  {/* Imperial / Metric Toggle switch control */}
                  <div className="flex items-center justify-center gap-3 mb-8">
                    <span className={`text-[10px] sm:text-xs uppercase tracking-wider font-semibold transition-colors ${!isMetric ? 'text-zinc-955' : 'text-zinc-400'}`}>
                      imperial
                    </span>
                    <button
                      onClick={() => setIsMetric(!isMetric)}
                      className="relative w-11 h-6 rounded-full bg-zinc-200 transition-colors p-0.5 flex items-center cursor-pointer focus:outline-none"
                      aria-label="Toggle imperial or metric units"
                    >
                      <div className={`w-5 h-5 rounded-full bg-zinc-700 shadow-sm transform transition-transform duration-200 ${isMetric ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-[10px] sm:text-xs uppercase tracking-wider font-semibold transition-colors ${isMetric ? 'text-zinc-955' : 'text-zinc-400'}`}>
                      metric
                    </span>
                  </div>

                  {/* Input Swatch Boxes */}
                  <div className="space-y-4 max-w-md w-full mx-auto">
                    {/* Height Box */}
                    <div className="border border-zinc-150 p-5 rounded-xs flex items-center justify-between bg-white shadow-sm transition-all">
                      <span className="text-sm font-semibold text-zinc-800">Height</span>
                      <div className="flex items-center gap-3 font-semibold text-zinc-800">
                        {!isMetric ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={heightFt}
                                onChange={(e) => setHeightFt(e.target.value)}
                                className="w-12 text-center border-b border-zinc-200 py-0.5 text-sm font-bold focus:border-zinc-955 focus:outline-none placeholder-zinc-350"
                                placeholder="-"
                              />
                              <span className="text-xs text-zinc-400 font-bold uppercase">ft</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={heightIn}
                                onChange={(e) => setHeightIn(e.target.value)}
                                className="w-12 text-center border-b border-zinc-200 py-0.5 text-sm font-bold focus:border-zinc-955 focus:outline-none placeholder-zinc-350"
                                placeholder="-"
                              />
                              <span className="text-xs text-zinc-400 font-bold uppercase">in</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={heightCm}
                              onChange={(e) => setHeightCm(e.target.value)}
                              className="w-16 text-center border-b border-zinc-200 py-0.5 text-sm font-bold focus:border-zinc-955 focus:outline-none placeholder-zinc-350"
                              placeholder="cm"
                            />
                            <span className="text-xs text-zinc-400 font-bold uppercase">cm</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Weight Box */}
                    <div className="border border-zinc-150 p-5 rounded-xs flex items-center justify-between bg-white shadow-sm transition-all">
                      <span className="text-sm font-semibold text-zinc-800">Weight</span>
                      <div className="flex items-center gap-2 font-semibold text-zinc-800">
                        {!isMetric ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={weightLbs}
                              onChange={(e) => setWeightLbs(e.target.value)}
                              className="w-16 text-center border-b border-zinc-200 py-0.5 text-sm font-bold focus:border-zinc-955 focus:outline-none placeholder-zinc-350"
                              placeholder="lbs"
                            />
                            <span className="text-xs text-zinc-400 font-bold uppercase">lbs</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={weightKg}
                              onChange={(e) => setWeightKg(e.target.value)}
                              className="w-16 text-center border-b border-zinc-200 py-0.5 text-sm font-bold focus:border-zinc-955 focus:outline-none placeholder-zinc-350"
                              placeholder="kg"
                            />
                            <span className="text-xs text-zinc-400 font-bold uppercase">kg</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Age Box */}
                    <div className="relative w-full">
                      {/* Circle Info Tooltip above input box */}
                      <button 
                        type="button"
                        className="absolute -top-3.5 right-1 text-zinc-400 hover:text-zinc-600 focus:outline-none" 
                        title="Age helps refine body mass distribution calculations"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </button>
                      
                      <div className="border border-zinc-150 p-5 rounded-xs flex items-center justify-between bg-white shadow-sm transition-all">
                        <span className="text-sm font-semibold text-zinc-800">Age</span>
                        <div className="flex items-center gap-2 font-semibold text-zinc-800">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={age}
                              onChange={(e) => setAge(e.target.value)}
                              className="w-16 text-center border-b border-zinc-200 py-0.5 text-sm font-bold focus:border-zinc-955 focus:outline-none placeholder-zinc-350"
                              placeholder="years"
                            />
                            <span className="text-xs text-zinc-400 font-bold uppercase">years</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pant Waist Box */}
                    <div className="relative w-full">
                      {/* Circle Info Tooltip above input box */}
                      <button 
                        type="button"
                        className="absolute -top-3.5 right-1 text-zinc-400 hover:text-zinc-600 focus:outline-none" 
                        title="Standard waist size of your pants"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </button>
                      
                      <div className="border border-zinc-150 p-5 rounded-xs flex items-center justify-between bg-white shadow-sm transition-all">
                        <span className="text-sm font-semibold text-zinc-800">Pant Waist</span>
                        <div className="flex items-center gap-2 font-semibold text-zinc-800">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={waistIn}
                              onChange={(e) => setWaistIn(e.target.value)}
                              className="w-16 text-center border-b border-zinc-200 py-0.5 text-sm font-bold focus:border-zinc-955 focus:outline-none placeholder-zinc-350"
                              placeholder="inches"
                            />
                            <span className="text-xs text-zinc-400 font-bold uppercase">inches</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Whatever else this garment's size chart compares on —
                        chest and sleeve for a shirt, inseam for trousers, bust
                        and underbust for a bra. Driven by the chart's columns,
                        so adding a column to the chart adds the box here. */}
                    {wizardPoints.map((point) => (
                      <div
                        key={point}
                        className="border border-zinc-150 p-5 rounded-xs flex items-center justify-between bg-white shadow-sm transition-all"
                      >
                        <span className="text-sm font-semibold text-zinc-800" title={POINT_LABELS[point].hint}>
                          {POINT_LABELS[point].label}
                        </span>
                        <div className="flex items-center gap-1.5 font-semibold text-zinc-800">
                          <input
                            type="number"
                            value={bodyInputs[point] ?? ""}
                            onChange={(e) =>
                              setBodyInputs((prev) => ({ ...prev, [point]: e.target.value }))
                            }
                            className="w-16 text-center border-b border-zinc-200 py-0.5 text-sm font-bold focus:border-zinc-955 focus:outline-none placeholder-zinc-350"
                            placeholder="-"
                          />
                          <span className="text-xs text-zinc-400 font-bold uppercase">
                            {isMetric ? "cm" : "in"}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Footer Controls */}
                  <div className="max-w-md w-full mx-auto flex items-center justify-end mt-10 pt-4 border-t border-zinc-100">
                    {/* Right CONTINUE button */}
                    <button
                      onClick={() => {
                        if (!isFormValid) return;
                        setScanProgress(0);
                        setScanZone(1);
                        setWizardStep("wizard-scanning");
                      }}
                      disabled={!isFormValid}
                      className={`px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-all rounded-xs border shadow-xs cursor-pointer ${
                        isFormValid
                          ? "bg-zinc-950 text-white border-zinc-950 hover:bg-zinc-800"
                          : "bg-zinc-100 text-zinc-400 border-zinc-200 cursor-not-allowed"
                      }`}
                      title={isFormValid ? undefined : "Fill in every measurement to continue"}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              );
            })()}

            {/* TAB 1: OUR HEIGHTS & FIT - WIZARD SCANNING */}
            {activeSizeTab === "heights" && wizardStep === "wizard-scanning" && (
              <div className="flex flex-col animate-in fade-in duration-250 items-center justify-center text-center py-4">

                {/* Claimed "Machine Learning and Artificial Intelligence" while
                    a timer counted to 100. The work is a size-chart comparison,
                    so it says that instead. */}
                <h2 className="text-sm sm:text-base font-medium text-zinc-800 max-w-md mx-auto leading-relaxed mb-6 font-sans">
                  Matching your measurements against our{" "}
                  <span className="font-extrabold text-zinc-950">size chart</span>.
                </h2>

                {/* 3D Mannequin Body scanning visualization */}
                <div className="relative w-full max-w-[280px] h-[340px] flex items-center justify-center mb-4">
                  <MannequinSVG scanZone={scanZone} />

                  {/* Scanning info panel overlay */}
                  <div className="absolute bottom-4 left-0 right-0 text-center bg-white/85 backdrop-blur-xs py-1.5 px-4 rounded-full border border-zinc-150 shadow-md max-w-[200px] mx-auto transition-all">
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 block animate-pulse">
                      {scanZone === 1 && "Reading measurements..."}
                      {scanZone === 2 && "Loading size chart..."}
                      {scanZone === 3 && "Comparing fit..."}
                      {scanZone === 4 && "Finalizing fit..."}
                    </span>
                    <span className="text-[10px] font-bold text-zinc-600 mt-0.5 block">
                      {scanProgress}% Completed
                    </span>
                  </div>
                </div>

                {/* Subtle progress progress-bar */}
                <div className="w-full max-w-[240px] bg-zinc-100 h-1.5 rounded-full overflow-hidden mb-6 shadow-inner">
                  <div
                    className="bg-indigo-600 h-full rounded-full transition-all duration-75"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* TAB 1: OUR HEIGHTS & FIT - WIZARD RESULT */}
            {activeSizeTab === "heights" && wizardStep === "wizard-result" && (
              <div className="flex flex-col animate-in fade-in duration-250 items-center text-center">
                <h2 className="text-3xl font-black uppercase tracking-wider text-zinc-900 mb-2">
                  Your Recommended Fit
                </h2>
                <p className="text-xs text-zinc-500 font-light mb-8 max-w-sm">
                  {sizeSuggestion.fromChart
                    ? "Matched against this garment's size chart, from the sizes we have in stock:"
                    : "This garment has no size chart yet, so this is a general estimate from your height and weight:"}
                </p>

                {/* Recommendation Shield */}
                <div className="bg-zinc-950 text-white px-10 py-8 rounded-sm shadow-xl max-w-sm w-full mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl transform translate-x-8 -translate-y-8" />
                  <span className="text-zinc-400 block mb-1">Recommended Size</span>
                  <div className="text-4xl font-black uppercase tracking-wide mb-4">
                    {sizeSuggestion.length
                      ? `${sizeSuggestion.size} - ${sizeSuggestion.length}`
                      : sizeSuggestion.size}
                  </div>
                  <div className="border-t border-white/10 pt-4 text-left">
                    <div className="flex justify-between text-xs font-light text-zinc-300">
                      <span>Height:</span>
                      <span className="font-bold text-white">
                        {!isMetric ? `${heightFt}' ${heightIn}"` : `${heightCm} cm`}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-light text-zinc-300 mt-2">
                      <span>Waist:</span>
                      <span className="font-bold text-white">
                        {!isMetric ? `${waistIn} in` : `${waistCm} cm`}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-light text-zinc-300 mt-2">
                      <span>Weight:</span>
                      <span className="font-bold text-white">
                        {!isMetric ? `${weightLbs} lbs` : `${weightKg} kg`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* The chart's closest row was a size this product does not
                    stock, so the shopper is told rather than quietly handed a
                    different one. */}
                {sizeSuggestion.substituted && (
                  <p className="-mt-5 mb-6 max-w-sm text-[11px] text-amber-600">
                    Your exact match is out of stock — this is the closest size we have.
                  </p>
                )}

                {/* Apply recommendation button */}
                <button
                  onClick={() => {
                    // Same figures the panel above shows — one source, so what
                    // gets added to the bag can never differ from what was read.
                    const { size, length } = sizeSuggestion;

                    // Normalize comparison (e.g. "Semi-Tall" -> "Semi Tall")
                    const matchedSize = uniqueSizes.find(s => s.toLowerCase() === size.toLowerCase()) || size;
                    const matchedLength = length
                      ? uniqueLengths.find(l => l.toLowerCase().replace("-", " ") === length.toLowerCase().replace("-", " ")) || length
                      : selectedLength;

                    // Update UI state
                    setSelectedSize(matchedSize);
                    setSelectedLength(matchedLength);
                    setShowSizeChart(false);

                    // Add to cart directly
                    handleAddToBag(matchedSize, matchedLength);
                  }}
                  className="bg-zinc-950 hover:bg-zinc-800 text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-colors rounded-sm cursor-pointer shadow-md mb-4"
                >
                  Apply To Product
                </button>

                {/* Re-calculate */}
                <button
                  onClick={() => setWizardStep("wizard-input")}
                  className="text-xs text-zinc-500 hover:text-zinc-955 underline font-semibold tracking-wider uppercase cursor-pointer"
                >
                  Re-enter measurements
                </button>
              </div>
            )}

            {/* TAB 2: SIZE CHART */}
            {activeSizeTab === "size-chart" && (
              <div className="flex flex-col animate-in fade-in duration-200">
                <h2 className="text-3xl font-black uppercase tracking-wider text-center text-zinc-900 mb-6">
                  Size Chart
                </h2>

                {sizeChart.table ? (
                  <div>
                    {/* The chart this product names, with the unit toggle
                        converting from whatever unit it was typed in. */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                      <span className="text-[10px] sm:text-xs font-black tracking-widest uppercase text-zinc-905">
                        {sizeChart.table.title}
                      </span>
                      <div className="flex items-center gap-1.5 border border-zinc-200 p-0.5 rounded-sm bg-zinc-50 self-start sm:self-auto">
                        <button
                          onClick={() => setSizeUnit("inches")}
                          className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all rounded-sm cursor-pointer ${sizeUnit === "inches" ? "bg-white text-zinc-950 shadow-sm font-black" : "text-zinc-400 hover:text-zinc-700"
                            }`}
                        >
                          Inches
                        </button>
                        <span className="text-[9px] text-zinc-300 font-light">/</span>
                        <button
                          onClick={() => setSizeUnit("cm")}
                          className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest transition-all rounded-sm cursor-pointer ${sizeUnit === "cm" ? "bg-white text-zinc-955 shadow-sm font-black" : "text-zinc-400 hover:text-zinc-700"
                            }`}
                        >
                          Centimeters
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto border border-zinc-150 rounded-sm shadow-sm">
                      <table className="w-full text-center border-collapse text-xs">
                        <thead>
                          <tr className="bg-zinc-50 border-b border-zinc-150 text-[10px] uppercase tracking-wider font-extrabold text-zinc-700">
                            {sizeChart.table.columns.map((col, i) => (
                              <th
                                key={i}
                                className={`p-3 ${i === 0 ? "text-left pl-6" : ""} ${i === sizeChart.table!.columns.length - 1 ? "text-right pr-6" : ""}`}
                              >
                                {col}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-100 text-zinc-600 font-medium">
                          {tableInUnit(sizeChart.table, sizeUnit === "cm" ? "cm" : "in").map((row, rowIdx) => (
                            <tr key={rowIdx} className="hover:bg-zinc-50/50 transition-colors">
                              {row.map((cell, i) => (
                                <td
                                  key={i}
                                  className={`p-3 ${i === 0 ? "text-left pl-6 font-bold text-zinc-950" : ""} ${i === row.length - 1 ? "text-right pr-6" : ""}`}
                                >
                                  {cell}
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {sizeChart.chartName && (
                      <p className="mt-3 text-right text-[10px] font-bold uppercase tracking-widest text-zinc-400">
                        {sizeChart.chartName} sizing
                      </p>
                    )}
                  </div>
                ) : (
                  /* No chart is picked on this product. Saying so beats
                     showing someone else's measurements, which is what the
                     hardcoded fallback table used to do. */
                  <p className="py-12 text-center text-xs font-medium uppercase tracking-widest text-zinc-400">
                    No size chart available for this product.
                  </p>
                )}
              </div>
            )}

            {/* TAB 3: HOW TO MEASURE */}
            {activeSizeTab === "measure" && (
              <div className="flex flex-col animate-in fade-in duration-200">
                <h2 className="text-3xl font-black uppercase tracking-wider text-center text-zinc-900 mb-8">
                  How To Measure
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  {/* Body outline with numbered measurement points */}
                  <div className="md:col-span-5 bg-zinc-50/50 p-6 border border-zinc-150 rounded-sm flex items-center justify-center">
                    <MeasureFigure
                      gender={figureGender}
                      points={activePoints}
                      imageSrc={howToMeasureImage ? formatImageUrl(howToMeasureImage) : null}
                      className="w-full max-w-[260px] h-auto"
                    />
                  </div>

                  {/* Measuring Descriptions */}
                  <div className="md:col-span-7 space-y-5">
                    <span className="text-[11px] font-black uppercase tracking-wider text-zinc-900 block border-b border-zinc-100 pb-2">
                      {howToMeasure.html && howToMeasure.categoryName
                        ? `${howToMeasure.categoryName} Measurement Guide:`
                        : `${figureGender === "women" ? "Women's" : "Men's"} Measurement Guide:`}
                    </span>

                    {howToMeasure.html ? (
                      // .custom-html is the project's own admin-HTML stylesheet
                      // (app/globals.css) — the `prose` plugin is not installed.
                      <div
                        className="custom-html size-guide-html"
                        dangerouslySetInnerHTML={{ __html: stripScriptTags(howToMeasure.html) }}
                      />
                    ) : (
                      <ol className="space-y-4 text-xs text-zinc-600 font-light leading-relaxed">
                        {BUILT_IN_GUIDE[figureGender].map((step, i) => (
                          <li key={step.title}>
                            <strong className="text-zinc-955 font-bold block mb-0.5">{i + 1}. {step.title}</strong>
                            {step.text}
                          </li>
                        ))}
                      </ol>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="mt-8 pt-4 border-t border-zinc-100 flex justify-end">
              <button
                onClick={() => setShowSizeChart(false)}
                className="bg-zinc-950 hover:bg-zinc-800 text-white px-8 py-3 text-[10px] font-black uppercase tracking-widest transition-colors rounded-sm cursor-pointer shadow-md"
              >
                Close Size Guide
              </button>
            </div>
          </div>
        </div>
      )}

      {/* The "Recently Viewed" tab above is fed from the same localStorage
          list, so a second section of it here was the same row printed twice. */}
      <Footer categories={categories} />

    </div>
  );
}
