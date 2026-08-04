"use client";

import React, { useState } from "react";
import { Star, ChevronLeft, ChevronRight, Plus, Minus, Heart, Check, ShoppingBag, X, ChevronDown } from "lucide-react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useCurrency } from "@/providers/CurrencyProvider";
import { addToCart } from "@/lib/cart";
import { toggleWishlist, isInWishlist } from "@/lib/wishlist";
import { useSettings } from "@/providers/SettingsProvider";
import ProductCard from "./ProductCard";
import Footer from "./Footer";
import RecentlyViewed from "./RecentlyViewed";
import ProductQA from "./ProductQA";
import CustomMeasurementForm, { type CustomMeasurementState } from "./CustomMeasurementForm";
import { resolveSurcharge } from "@/lib/measurement";
import { swatchStyle, type SwatchColor } from "@/lib/colorStyle";
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
}

interface Product {
  id: string;
  title: string;
  slug: string;
  /** Present on the main product; related products are fetched card-shaped. */
  description?: string;
  thumbnail: string;
  sizeChart?: string | null;
  basePrice: number;
  discountPrice: number | null;
  featured: boolean;
  brand?: { name: string } | null;
  category?: { name: string; slug: string } | null;
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
  dbColors?: ({ name: string } & SwatchColor)[];
}

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
          <ellipse cx="85" cy="290" rx="16" ry="4" fill="none" stroke="#1BA9B6" strokeWidth="2.5" filter="url(#glow)" className="animate-pulse" />
          <ellipse cx="115" cy="290" rx="16" ry="4" fill="none" stroke="#1BA9B6" strokeWidth="2.5" filter="url(#glow)" className="animate-pulse" />
          <ellipse cx="85" cy="290" rx="16" ry="4" fill="none" stroke="#A0EDF1" strokeWidth="1" />
          <ellipse cx="115" cy="290" rx="16" ry="4" fill="none" stroke="#A0EDF1" strokeWidth="1" />
        </>
      )}

      {scanZone === 2 && (
        <>
          <ellipse cx="100" cy="180" rx="36" ry="7" fill="none" stroke="#1BA9B6" strokeWidth="2.5" filter="url(#glow)" className="animate-pulse" />
          <ellipse cx="100" cy="180" rx="36" ry="7" fill="none" stroke="#A0EDF1" strokeWidth="1" />
        </>
      )}

      {scanZone === 3 && (
        <>
          <ellipse cx="100" cy="110" rx="38" ry="8" fill="none" stroke="#1BA9B6" strokeWidth="2.5" filter="url(#glow)" className="animate-pulse" />
          <ellipse cx="100" cy="110" rx="38" ry="8" fill="none" stroke="#A0EDF1" strokeWidth="1" />
        </>
      )}

      {scanZone === 4 && (
        <>
          <ellipse cx="100" cy="68" rx="18" ry="4" fill="none" stroke="#1BA9B6" strokeWidth="2.5" filter="url(#glow)" className="animate-pulse" />
          <ellipse cx="100" cy="68" rx="18" ry="4" fill="none" stroke="#A0EDF1" strokeWidth="1" />
        </>
      )}
    </svg>
  );
};

export default function ProductDetailsClient({ product, categories, relatedProducts, dbColors = [] }: ProductDetailsClientProps) {
  const { formatPrice } = useCurrency();
  const { storeName, settings } = useSettings();
  const router = useRouter();
  // Extract unique variants properties dynamically
  const uniqueColors = Array.from(new Set(product.variants.map(v => v.color))).filter(Boolean);
  const uniqueSizes = Array.from(new Set(product.variants.map(v => v.size))).filter(Boolean);
  const uniqueLengths = Array.from(new Set(product.variants.filter(v => v.length).map(v => v.length))) as string[];

  // Active selections
  const [selectedColor, setSelectedColor] = useState<string>(uniqueColors[0] || "Black");
  const [selectedSize, setSelectedSize] = useState<string>(uniqueSizes[0] || "M");
  const [selectedLength, setSelectedLength] = useState<string>(uniqueLengths[0] || "");
  const [wishlisted, setWishlisted] = useState<boolean>(false);
  const [customMeasurement, setCustomMeasurement] = useState<CustomMeasurementState>({
    active: false,
    valid: true,
    fee: 0,
    values: [],
    error: null,
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

  // Related Products states
  const [activeRelatedTab, setActiveRelatedTab] = useState<"recommended" | "recently">("recommended");
  const [hoveredRelatedProductId, setHoveredRelatedProductId] = useState<string | null>(null);
  const [selectedRelatedSizes, setSelectedRelatedSizes] = useState<Record<string, string>>({});
  const [selectedRelatedLengths, setSelectedRelatedLengths] = useState<Record<string, string>>({});
  const [relatedWishlisted, setRelatedWishlisted] = useState<Record<string, boolean>>({});

  // Accordions states
  const [openAccordions, setOpenAccordions] = useState<Record<string, boolean>>({
    description: true,
    fit: false,
    care: false,
    reviews: false
  });
  const [expandedAccordion, setExpandedAccordion] = useState<string | null>(null);

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
    }, 35);

    return () => clearInterval(interval);
  }, [wizardStep]);

  // 1. Get the dynamic database-provided product images, filtered by selected color tag
  const dbImages = product.images || [];
  
  const colorSpecificDbImages = dbImages.filter(
    (img) => img.color && img.color.toLowerCase() === selectedColor.toLowerCase()
  ).map((img) => img.url);

  const generalDbImages = dbImages.filter((img) => !img.color).map((img) => img.url);

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

  const variantLevelImages = colorMatchedVariants.flatMap(v => [
    ...(v.image ? [v.image] : []),
    ...(v.images || [])
  ]);

  // Specific images based on variant and color selection
  const specificImages = [...variantLevelImages, ...colorSpecificDbImages].filter(Boolean);
  const uniqueSpecificImages = Array.from(new Set(specificImages));
  const uniqueGeneralImages = Array.from(new Set(generalDbImages.filter(Boolean)));

  // Main collage shows specific variant images if available, otherwise falls back to general gallery or thumbnail.
  const mainCollageImages = uniqueSpecificImages.length > 0 
    ? uniqueSpecificImages 
    : (uniqueGeneralImages.length > 0 ? uniqueGeneralImages : (product.thumbnail ? [product.thumbnail] : []));

  // Secondary gallery shows the global gallery images ONLY if the main collage is occupied by variant-specific images.
  const secondaryGalleryImages = uniqueSpecificImages.length > 0 ? uniqueGeneralImages : [];

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

  const customSurcharge = resolveSurcharge(product, product.measurementTemplate);
  // The price one custom unit is priced against — matches the checkout fallback.
  const customUnitPrice = currentDiscountPrice ?? currentBasePrice;

  // Complete The Look Logic (Cross-selling matching bottom item dynamically from relatedProducts[0])
  const completeLookItemRaw = relatedProducts && relatedProducts.length > 0 ? relatedProducts[0] : null;
  const completeLookItem = completeLookItemRaw
    ? {
      title: completeLookItemRaw.title,
      slug: completeLookItemRaw.slug,
      price: completeLookItemRaw.basePrice,
      thumbnail: completeLookItemRaw.thumbnail
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

    const basePrice = variantToUse?.price || product.basePrice;
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
          },
        }
        : {}),
    });
    setAddedToBag(true);
    setTimeout(() => {
      router.push("/cart");
    }, 800);
  };

  return (
    <div className="flex flex-col min-h-screen selection:bg-brand-200 selection:text-brand-950">

      {/* 3. PRODUCT CORE MAIN PANEL */}
      <main className="max-w-[1400px] mx-auto px-5 sm:px-7 py-8 lg:py-10 flex-1 w-full">

        {/* Breadcrumb */}
        <nav className="text-[13px] text-soft mb-6 flex items-center gap-2" aria-label="Breadcrumb">
          <Link href="/" className="hover:text-brand-700 transition-colors">Home</Link>
          <span className="text-faint" aria-hidden="true">/</span>
          <Link href="/shop" className="hover:text-brand-700 transition-colors">Shop</Link>
          <span className="text-faint" aria-hidden="true">/</span>
          <span className="text-foreground font-semibold">{product.category?.name || "Apparel"}</span>
        </nav>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 mb-14">

          {/* LEFT COLUMN: Image Galleries */}
          <div className="lg:col-span-7 flex flex-col gap-10">
            
            {/* Main Variant/Default Collage */}
            <div className={`grid gap-4 ${
              mainCollageImages.length === 1 
                ? "grid-cols-1" 
                : "grid-cols-1 sm:grid-cols-2"
            }`}>
              {mainCollageImages.map((imgUrl, index) => {
                const isLastOdd = mainCollageImages.length > 1 && mainCollageImages.length % 2 !== 0 && index === mainCollageImages.length - 1;
                return (
                  <div
                    key={index}
                    className={`relative aspect-[4/5] bg-cream overflow-hidden rounded-sg cursor-zoom-in ${
                      isLastOdd ? "sm:col-span-2" : ""
                    }`}
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
                      src={imgUrl}
                      alt={`${product.title} view ${index + 1}`}
                      fill
                      sizes="(max-width: 768px) 100vw, 50vw"
                      // The lead shot of the collage is this page's LCP element;
                      // without this it was lazy-loaded like the rest of the gallery.
                      priority={index === 0}
                      className="object-cover select-none"
                      style={{
                        transition: "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                        transformOrigin: "center",
                      }}
                    />
                  </div>
                );
              })}
            </div>

            {/* Secondary Global Gallery (Only if main collage is variant-specific) */}
            {secondaryGalleryImages.length > 0 && (
              <div className="flex flex-col gap-6">
                <h3 className="sg-kicker">Product gallery</h3>
                <div className={`grid gap-4 ${
                  secondaryGalleryImages.length === 1 
                    ? "grid-cols-1" 
                    : "grid-cols-1 sm:grid-cols-2"
                }`}>
                  {secondaryGalleryImages.map((imgUrl, index) => {
                    const isLastOdd = secondaryGalleryImages.length > 1 && secondaryGalleryImages.length % 2 !== 0 && index === secondaryGalleryImages.length - 1;
                    return (
                      <div
                        key={`gallery-${index}`}
                        className={`relative aspect-[4/5] bg-cream overflow-hidden rounded-sg cursor-zoom-in ${
                          isLastOdd ? "sm:col-span-2" : ""
                        }`}
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
                          src={imgUrl}
                          alt={`${product.title} gallery view ${index + 1}`}
                          fill
                          sizes="(max-width: 768px) 100vw, 50vw"
                          className="object-cover select-none"
                          style={{
                            transition: "transform 0.3s cubic-bezier(0.25, 0.46, 0.45, 0.94)",
                            transformOrigin: "center",
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT COLUMN: Buy Box Panel */}
          <div className="lg:col-span-5 sg-card sg-raise p-7 sm:p-9 flex flex-col justify-start lg:sticky lg:top-[92px] h-fit">

            {/* Category Brand Path & Tags */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 mb-2 block">
              <span className="text-[10.5px] text-aqua-700 font-extrabold uppercase tracking-[0.16em]">
                {product.category?.name || product.brand?.name || storeName}
              </span>
              {product.tags && (
                <div className="inline-flex flex-wrap gap-1 ml-1.5">
                  {product.tags.split(",")
                    .map(t => t.trim())
                    .filter(Boolean)
                    .map((tag, idx) => (
                      <span
                        key={idx}
                        className="bg-cream hover:bg-brand-50 text-soft text-[10px] font-bold px-2.5 py-1 rounded-full transition-colors"
                      >
                        #{tag}
                      </span>
                    ))
                  }
                </div>
              )}
            </div>

            {/* Title */}
            <h1 className="text-[26px] sm:text-[32px] font-extrabold text-foreground leading-tight mb-3">
              {product.title}
            </h1>

            {/* Pricing Section */}
            <div className="flex items-center gap-4 mb-1">
              <div className="flex items-baseline gap-3">
                {currentDiscountPrice && currentDiscountPrice < currentBasePrice ? (
                  <div className="flex items-center gap-3">
                    <span className="text-[30px] font-extrabold text-brand-700 tracking-tight">
                      {formatPrice(currentDiscountPrice)}
                    </span>
                    <span className="text-[18px] text-faint line-through font-medium">
                      {formatPrice(currentBasePrice)}
                    </span>
                  </div>
                ) : (
                  <span className="text-[30px] font-extrabold text-foreground tracking-tight">
                    {formatPrice(currentBasePrice)}
                  </span>
                )}
              </div>

              {/* Flash Sale Timer */}
              {timeLeft && (
                <div className="sg-chip bg-brand-50 text-brand-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-brand-500 animate-pulse"></span>
                  Ends in {timeLeft}
                </div>
              )}
            </div>

            {/* Stock Alerts */}
            {(isOutOfStock || isLowStock) && (
              <div className="mb-4">
                {isOutOfStock ? (
                  <div className="space-y-3">
                    <span className="inline-block bg-cream text-soft text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl">
                      Out of Stock
                    </span>
                    {!notifySuccess ? (
                      <div className="flex items-center gap-2 max-w-sm mt-2">
                        <input 
                          type="email" 
                          placeholder="Email address for restock alert"
                          value={notifyEmail}
                          onChange={(e) => setNotifyEmail(e.target.value)}
                          className="flex-1 text-xs border border-line px-3 py-2 bg-white focus:outline-none focus:border-aqua-400 focus:ring-0"
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
                                Swal.fire({ title: "Subscribed!", text: "We'll email you when it's back in stock.", icon: "success", confirmButtonColor: "#09090b" });
                              } else {
                                const data = await res.json();
                                Swal.fire({ title: "Oops!", text: data.error || "Failed to subscribe.", icon: "error", confirmButtonColor: "#09090b" });
                              }
                            } finally {
                              setNotifyLoading(false);
                            }
                          }}
                          className="bg-brand-600 rounded-full text-white text-[12.5px] font-bold uppercase tracking-[0.12em] px-4 py-2 hover:bg-brand-700 disabled:opacity-50 transition-colors"
                        >
                          {notifyLoading ? "..." : "Notify Me"}
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs font-bold text-green-600 flex items-center gap-1.5 mt-2">
                        <Check className="w-4 h-4" /> You're on the list!
                      </div>
                    )}
                  </div>
                ) : (
                  <span className="inline-block bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-xl">
                    Only {activeStock} left in stock - order soon!
                  </span>
                )}
              </div>
            )}



            {/* COLOR SWATCH SELECTOR */}
            {uniqueColors.length > 0 && (
              <div className="mb-6">
                <span className="text-[13px] font-bold text-foreground block mb-3">
                  Colour <span className="text-soft font-medium">— {selectedColor}</span>
                </span>
                <div className="flex gap-3">
                  {uniqueColors.map((color) => {
                    const dbColor = dbColors.find(c => c.name.toLowerCase() === color.toLowerCase());
                    const style = swatchStyle(dbColor ?? { value: COLOR_HEX_MAP[color] || "#71717a" });
                    const isSelected = selectedColor === color;
                    return (
                      <button
                        key={color}
                        onClick={() => setSelectedColor(color)}
                        className={`h-9 p-[3px] rounded-full border-[1.5px] flex items-center justify-center transition-all duration-200 cursor-pointer ${isSelected ? "w-14 border-brand-600" : "w-9 border-line hover:border-brand-300 hover:scale-105"
                          }`}
                        title={color}
                      >
                        <span
                          className="w-full h-full rounded-full border border-line shadow-inner flex items-center justify-center"
                          style={style}
                        >
                          {isSelected && (
                            <Check className={`w-3.5 h-3.5 stroke-[2.5] ${color === "White" ? "text-foreground" : "text-white"
                              }`} />
                          )}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* SIZE SWATCH SELECTOR */}
            {uniqueSizes.length > 0 && (
              <div className="mb-6">
                <div className="flex justify-between items-center mb-3">
                  <span className="text-[13px] font-bold text-foreground">Size</span>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => {
                        setActiveSizeTab("size-chart");
                        setShowSizeChart(true);
                      }}
                      className="text-[13px] font-semibold text-soft hover:text-brand-700 underline underline-offset-4 decoration-line cursor-pointer transition-colors"
                    >
                      Size Chart
                    </button>
                    <button
                      onClick={() => {
                        setActiveSizeTab("heights");
                        setWizardStep("wizard-input");
                        setShowSizeChart(true);
                      }}
                      className="sg-btn sg-btn-sm sg-btn-primary !py-2 !px-4 !text-[12px]"
                    >
                      Find My Size
                    </button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2.5">
                  {uniqueSizes.map((size) => {
                    const isSelected = selectedSize === size;
                    return (
                      <button
                        key={size}
                        onClick={() => setSelectedSize(size)}
                        className={`min-w-[54px] px-5 py-2.5 text-[13px] font-bold uppercase transition-all border rounded-full cursor-pointer ${isSelected
                            ? "bg-brand-600 text-white border-brand-600"
                            : "bg-white text-soft border-line hover:border-brand-400 hover:text-brand-700"
                          }`}
                      >
                        {size}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* LENGTH SWATCH SELECTOR */}
            {uniqueLengths.length > 0 && (
              <div className="mb-8">
                <span className="text-[13px] font-bold text-foreground block mb-3">Length</span>
                <div className="flex gap-2.5">
                  {uniqueLengths.map((len) => {
                    const isSelected = selectedLength === len;
                    return (
                      <button
                        key={len}
                        onClick={() => setSelectedLength(len)}
                        className={`px-6 py-2.5 text-[13px] font-bold transition-all border rounded-full cursor-pointer ${isSelected
                            ? "bg-brand-600 text-white border-brand-600"
                            : "bg-white text-soft border-line hover:border-brand-400 hover:text-brand-700"
                          }`}
                      >
                        {len}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* MADE-TO-MEASURE */}
            {measurementTemplate && (
              <CustomMeasurementForm
                template={measurementTemplate}
                surcharge={customSurcharge}
                unitPrice={customUnitPrice}
                onChange={setCustomMeasurement}
              />
            )}

            {/* DYNAMIC ACTION BUTTON */}
            <div className="flex gap-3 mb-6 mt-6">
              <button
                onClick={() => handleAddToBag()}
                disabled={addedToBag || isOutOfStock || !customMeasurement.valid}
                className={`sg-btn flex-1 !py-[18px] !text-[14px] ${
                  isOutOfStock || !customMeasurement.valid
                    ? "bg-cream text-faint border-line cursor-not-allowed"
                    : addedToBag
                      ? "bg-emerald-600 text-white scale-[0.99] cursor-pointer"
                      : "sg-btn-primary cursor-pointer"
                }`}
              >
                {isOutOfStock ? (
                  <>Out of Stock</>
                ) : !customMeasurement.valid ? (
                  <>Complete Your Measurements</>
                ) : addedToBag ? (
                  <><Check className="w-4 h-4" /> Added! Going to Cart…</>
                ) : (
                  <><ShoppingBag className="w-4 h-4" /> Add To Bag</>
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
                className={`w-[54px] shrink-0 border rounded-full transition-colors cursor-pointer flex items-center justify-center ${wishlisted
                    ? "bg-brand-50 border-brand-600 text-brand-700"
                    : "border-line hover:border-brand-400 text-soft hover:text-brand-700"
                  }`}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill={wishlisted ? "currentColor" : "none"}
                  stroke="currentColor"
                  strokeWidth="1.5"
                  className="w-5 h-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0 1 11.186 0Z"
                  />
                </svg>
              </button>
            </div>

            {/* Quality assurance shipping lines */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-[12.5px] text-soft font-medium pt-5 border-t border-line">
              <span className="flex items-center gap-1.5"><span className="text-aqua-700 font-extrabold">✓</span> Free shipping over ৳5,000</span>
              <span className="flex items-center gap-1.5"><span className="text-aqua-700 font-extrabold">↺</span> 30-day returns</span>
            </div>

          </div>

        </div>

        {/* 4. MID SECTION: DESCRIPTION, ACCORDION & MODEL CROSS-SELL */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 py-6 mb-10">

          {/* LEFT Accordions with Dark Panel Aesthetic */}
          <div className="lg:col-span-8 bg-brand-ink text-white p-8 sm:p-12 rounded-sg-lg flex flex-col justify-between">
            <div>
              <h2 className="text-xl sm:text-2xl font-light tracking-wide uppercase mb-8 max-w-lg leading-relaxed">
                <span className="font-extrabold text-white">{product.title}</span> - Premium modern apparel.
              </h2>

              <div className="divide-y divide-brand-ink-line">

                {/* 1. PRODUCT DESCRIPTION ACCORDION */}
                <div className="py-5">
                  <button
                    onClick={() => toggleAccordion("description")}
                    className="w-full flex justify-between items-center text-[15px] font-bold text-left cursor-pointer focus:outline-none hover:text-brand-200 transition-colors"
                  >
                    <span>Product Description</span>
                    <Plus className={`w-4 h-4 transition-transform duration-300 ${openAccordions.description ? "rotate-45" : ""
                      }`} />
                  </button>
                  <div className={`transition-all duration-500 overflow-hidden ${openAccordions.description ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
                    }`}>
                    <div 
                      className="text-[14px] text-white/70 leading-[1.75] prose prose-sm prose-invert max-w-none"
                      dangerouslySetInnerHTML={{ __html: product.description ?? "" }}
                    />
                  </div>
                </div>

                {/* 2. SIZE & FIT ACCORDION */}
                {(product as any).sizeAndFit && (
                  <div className="py-5">
                    <button
                      onClick={() => toggleAccordion("fit")}
                      className="w-full flex justify-between items-center text-[15px] font-bold text-left cursor-pointer focus:outline-none hover:text-brand-200 transition-colors"
                    >
                      <span>Size & Fit</span>
                      <Plus className={`w-4 h-4 transition-transform duration-300 ${openAccordions.fit ? "rotate-45" : ""
                        }`} />
                    </button>
                    <div className={`transition-all duration-500 overflow-hidden ${openAccordions.fit ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
                      }`}>
                      <div 
                        className="text-[14px] text-white/70 leading-[1.75] prose prose-sm prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: (product as any).sizeAndFit }} 
                      />
                    </div>
                  </div>
                )}

                {/* 3. FABRIC & CARE ACCORDION */}
                {(product as any).fabricAndCare && (
                  <div className="py-5">
                    <button
                      onClick={() => toggleAccordion("care")}
                      className="w-full flex justify-between items-center text-[15px] font-bold text-left cursor-pointer focus:outline-none hover:text-brand-200 transition-colors"
                    >
                      <span>Fabric & Care</span>
                      <Plus className={`w-4 h-4 transition-transform duration-300 ${openAccordions.care ? "rotate-45" : ""
                        }`} />
                    </button>
                    <div className={`transition-all duration-500 overflow-hidden ${openAccordions.care ? "max-h-96 opacity-100 mt-4" : "max-h-0 opacity-0"
                      }`}>
                      <div 
                        className="text-[14px] text-white/70 leading-[1.75] prose prose-sm prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: (product as any).fabricAndCare }} 
                      />
                    </div>
                  </div>
                )}

                {/* 4. REVIEWS SUMMARY ACCORDION */}
                <div className="border-t border-brand-ink-line">
              <button
                onClick={() => setExpandedAccordion(expandedAccordion === "reviews" ? null : "reviews")}
                className="w-full flex items-center justify-between py-5 text-left group cursor-pointer"
              >
                <span className="text-[15px] font-bold text-white group-hover:text-brand-200 transition-colors">
                  Reviews ({reviews.length})
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-faint transition-transform duration-300 ${
                    expandedAccordion === "reviews" ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  expandedAccordion === "reviews" ? "max-h-[800px] opacity-100 pb-5 overflow-y-auto" : "max-h-0 opacity-0"
                }`}
              >
                <div className="text-white/70 text-[14px] leading-[1.75] space-y-6">
                  {reviewsLoading ? (
                    <p>Loading reviews...</p>
                  ) : reviews.length === 0 ? (
                    <p>No reviews available for this product yet. Be the first to review!</p>
                  ) : (
                    <div className="space-y-4">
                      {reviews.map(r => (
                        <div key={r.id} className="border-b border-brand-ink-line pb-4">
                          <div className="flex items-center gap-2 mb-1">
                            <div className="flex text-white">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star key={star} className={`w-3 h-3 ${star <= r.rating ? "fill-white" : "fill-transparent"}`} />
                              ))}
                            </div>
                            <span className="text-[10px] font-bold uppercase tracking-wider text-white/80">{r.user?.name || "Guest"}</span>
                          </div>
                          <p className="text-xs text-faint mt-2">{r.comment}</p>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-8 pt-6 border-t border-brand-ink-line">
                    <h4 className="text-[12px] font-bold uppercase tracking-[0.14em] text-white mb-4">Write a Review</h4>
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      <div>
                        <input type="text" placeholder="Your Name (Optional)" value={newReview.name} onChange={e => setNewReview({...newReview, name: e.target.value})} className="w-full text-xs p-3 bg-transparent text-white placeholder:text-soft border border-brand-ink-line focus:outline-none focus:border-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-faint">Rating:</label>
                        <select value={newReview.rating} onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})} className="text-xs p-2 bg-brand-ink text-white border border-brand-ink-line focus:outline-none focus:border-brand-400">
                          <option value="5">5 Stars</option>
                          <option value="4">4 Stars</option>
                          <option value="3">3 Stars</option>
                          <option value="2">2 Stars</option>
                          <option value="1">1 Star</option>
                        </select>
                      </div>
                      <div>
                        <textarea required placeholder="Your Review" value={newReview.comment} onChange={e => setNewReview({...newReview, comment: e.target.value})} className="w-full text-xs p-3 bg-transparent text-white placeholder:text-soft border border-brand-ink-line focus:outline-none focus:border-white min-h-[80px]" />
                      </div>
                      <button type="submit" disabled={submittingReview} className="bg-white text-foreground text-[11px] font-bold uppercase tracking-[0.14em] px-6 py-3 hover:bg-line transition-colors cursor-pointer disabled:opacity-50">
                        {submittingReview ? "Submitting..." : "Submit Review"}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>

            {/* 5. PRODUCT Q&A ACCORDION */}
            <div className="border-t border-b border-brand-ink-line">
              <button
                onClick={() => setExpandedAccordion(expandedAccordion === "qa" ? null : "qa")}
                className="w-full flex items-center justify-between py-5 text-left group cursor-pointer"
              >
                <span className="text-[15px] font-bold text-white group-hover:text-brand-200 transition-colors">
                  Product Q&A
                </span>
                <ChevronDown
                  className={`w-4 h-4 text-faint transition-transform duration-300 ${
                    expandedAccordion === "qa" ? "rotate-180" : ""
                  }`}
                />
              </button>
              <div
                className={`overflow-hidden transition-all duration-500 ease-in-out ${
                  expandedAccordion === "qa" ? "max-h-[1200px] opacity-100 pb-5 overflow-y-auto" : "max-h-0 opacity-0"
                }`}
              >
                <ProductQA productId={product.id} />
              </div>
            </div>

              </div>
            </div>

            {/* Model completes the look cross-sell placement */}
            {completeLookItem && (
              <div className="mt-12 pt-8 border-t border-brand-ink-line">
                <span className="text-[10px] text-soft font-extrabold tracking-[0.14em] uppercase block mb-4">
                  Model is also wearing
                </span>
                <Link
                  href={`/product/${completeLookItem.slug}`}
                  className="flex items-center gap-4 bg-brand-ink-soft hover:bg-brand-ink transition-colors p-4 rounded-xl border border-brand-ink-line group"
                >
                  <div className="relative w-12 h-16 bg-brand-ink-soft rounded-xl overflow-hidden shrink-0">
                    <Image
                      src={completeLookItem.thumbnail}
                      alt={completeLookItem.title}
                      fill
                      className="object-cover"
                    />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-[11px] text-faint font-bold group-hover:text-white transition-colors uppercase tracking-wide">
                      {completeLookItem.title}
                    </span>
                    <span className="text-[10px] text-soft font-medium mt-1">
                      {formatPrice(completeLookItem.price)}
                    </span>
                  </div>
                </Link>
              </div>
            )}

          </div>

          {/* RIGHT Flat-Lay Product Banner on Grey Card */}
          <div className="lg:col-span-4 sg-card bg-cream flex items-center justify-center p-8 sm:p-12 relative aspect-[4/5] sm:aspect-auto overflow-hidden">
            <div className="relative w-full h-full min-h-[300px]">
              <Image
                src={product.thumbnail}
                alt={product.title}
                fill
                className="object-contain hover:scale-102 transition-transform duration-500 select-none drop-shadow-md"
              />
            </div>
          </div>

        </div>

        {/* 5. "YOU MAY ALSO LIKE" RELATED PRODUCTS CAROUSEL */}
        <section className="w-full py-8 overflow-hidden mb-10">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-xl sm:text-2xl font-light tracking-tight text-foreground uppercase">
              You <span className="font-extrabold text-foreground">May Also Like</span>
            </h2>
            <div className="flex border border-line rounded-xl overflow-hidden shadow-sm">
              <button
                onClick={() => setActiveRelatedTab("recommended")}
                className={`px-6 py-2.5 text-[10px] font-bold tracking-[0.14em] uppercase cursor-pointer transition-all duration-300 ${activeRelatedTab === "recommended"
                    ? "bg-brand-600 rounded-full text-white"
                    : "bg-white text-faint hover:text-brand-700"
                  }`}
              >
                Recommended
              </button>
              <button
                onClick={() => setActiveRelatedTab("recently")}
                className={`px-6 py-2.5 text-[10px] font-bold tracking-[0.14em] uppercase cursor-pointer transition-all duration-300 border-l border-line ${activeRelatedTab === "recently"
                    ? "bg-brand-600 rounded-full text-white"
                    : "bg-white text-faint hover:text-brand-700"
                  }`}
              >
                Recently Viewed
              </button>
            </div>
          </div>

          {/* Scroller Row */}
          <div className="flex gap-6 overflow-x-auto w-full py-2 no-scrollbar" style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
            {(activeRelatedTab === "recommended" ? relatedProducts : [...relatedProducts].reverse()).slice(0, 5).map((prod) => {
              return (
                <div key={prod.id} className="min-w-[290px] sm:min-w-[320px] max-w-[320px] flex-shrink-0">
                  <ProductCard product={prod} idPrefix="related" />
                </div>
              );
            })}
          </div>
        </section>



        {/* 7. NEWSLETTER EMAIL SIGN UP */}
        <section className="w-full sg-card sg-card-lg sg-raise py-12 px-8 sm:px-12 flex flex-col md:flex-row justify-between items-center gap-8 mb-12">
          <div className="max-w-md">
            <h3 className="text-lg font-extrabold uppercase tracking-wider text-foreground mb-1">
              Sign up for our emails
            </h3>
            <p className="text-xs text-soft font-light leading-relaxed">
              Subscribe to unlock early access, seasonal catalog launches, and get 15% off your first luxury apparel order.
            </p>
          </div>
          <div className="flex w-full md:w-auto max-w-sm flex-col gap-2">
            <div className="flex border border-line rounded-xl overflow-hidden bg-white shadow-sm">
              <input
                type="email"
                placeholder="Enter your email address"
                className="px-4 py-3 text-xs w-full outline-none text-foreground placeholder-faint"
              />
              <button className="bg-brand-600 rounded-full hover:bg-brand-700 text-white px-6 text-[12.5px] font-extrabold uppercase tracking-[0.12em] transition-colors cursor-pointer">
                Subscribe
              </button>
            </div>
            <span className="text-[8px] text-faint text-center md:text-left leading-normal font-medium block">
              By subscribing, you agree to our Privacy Policy. You can unsubscribe at any time.
            </span>
          </div>
        </section>

      </main>



      {/* Size chart modal — height→length table, fit models and measurements */}
      {showSizeChart && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-brand-ink/80 backdrop-blur-sm transition-all duration-300"
          onClick={() => setShowSizeChart(false)}
        >
          <div
            className={`relative w-full bg-white border border-line rounded-sg shadow-2xl p-6 sm:p-8 flex flex-col max-h-[95vh] overflow-y-auto transition-all duration-300 animate-in fade-in zoom-in-95 ${
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
                    <span className="text-sm font-extrabold uppercase tracking-[0.14em] text-foreground">
                      {storeName}
                    </span>
                  )}
                </div>
                {/* Close Button */}
                <button
                  onClick={() => setShowSizeChart(false)}
                  className="p-1 text-foreground hover:text-soft transition-colors cursor-pointer focus:outline-none"
                  aria-label="Close"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            ) : (
              <div className="flex items-stretch border-b border-line -mx-6 -mt-6 sm:-mx-8 sm:-mt-8 mb-8 bg-cream">
                <button
                  onClick={() => {
                    setActiveSizeTab("heights");
                    setWizardStep("heights-list");
                  }}
                  className={`flex-1 py-4 text-center text-[10px] sm:text-xs font-bold tracking-[0.14em] uppercase transition-all cursor-pointer border-r border-b border-line ${activeSizeTab === "heights"
                      ? "bg-white text-foreground border-b-transparent"
                      : "text-faint hover:text-soft bg-cream/60"
                    }`}
                >
                  Our Heights & Fit
                </button>
                <button
                  onClick={() => setActiveSizeTab("size-chart")}
                  className={`flex-1 py-4 text-center text-[10px] sm:text-xs font-bold tracking-[0.14em] uppercase transition-all cursor-pointer border-r border-b border-line ${activeSizeTab === "size-chart"
                      ? "bg-white text-foreground border-b-transparent"
                      : "text-faint hover:text-soft bg-cream/60"
                    }`}
                >
                  Size Chart
                </button>
                <button
                  onClick={() => setActiveSizeTab("measure")}
                  className={`flex-1 py-4 text-center text-[10px] sm:text-xs font-bold tracking-[0.14em] uppercase transition-all cursor-pointer border-b border-line ${activeSizeTab === "measure"
                      ? "bg-white text-foreground border-b-transparent"
                      : "text-faint hover:text-soft bg-cream/60"
                    }`}
                >
                  How To Measure
                </button>
                <button
                  onClick={() => setShowSizeChart(false)}
                  className="px-5 border-l border-b border-line text-faint hover:text-foreground transition-colors bg-cream/60 hover:bg-cream flex items-center justify-center cursor-pointer"
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
                  <h2 className="text-2xl font-extrabold uppercase tracking-wider text-foreground mb-2">
                    Our Heights
                  </h2>
                  <p className="text-[10px] sm:text-xs text-soft font-bold uppercase tracking-[0.14em] leading-relaxed max-w-md mx-auto">
                    Most of our customers use their height as a starting point when selecting a length.
                  </p>
                </div>

                <div className="border border-line rounded-xl overflow-hidden mb-8 shadow-sm">
                  <table className="w-full text-center border-collapse text-xs">
                    <thead>
                      <tr className="bg-cream border-b border-line text-[10px] uppercase tracking-wider font-extrabold text-soft">
                        <th className="p-3.5 text-left pl-6">Your Height</th>
                        <th className="p-3.5">Recommended Length</th>
                        <th className="p-3.5 text-right pr-6">Equivalent Inseam</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line text-soft font-bold">
                      <tr className="hover:bg-cream/60 transition-colors">
                        <td className="p-4 text-left pl-6 text-foreground font-extrabold">5&apos;4&quot; - 5&apos;7&quot;</td>
                        <td className="p-4">Short</td>
                        <td className="p-4 text-right pr-6">30&quot;</td>
                      </tr>
                      <tr className="hover:bg-cream/60 transition-colors">
                        <td className="p-4 text-left pl-6 text-foreground font-extrabold">5&apos;8&quot; - 6&apos;0&quot;</td>
                        <td className="p-4">Regular</td>
                        <td className="p-4 text-right pr-6">32&quot;</td>
                      </tr>
                      <tr className="hover:bg-cream/60 transition-colors">
                        <td className="p-4 text-left pl-6 text-foreground font-extrabold">6&apos;1&quot; - 6&apos;5&quot;</td>
                        <td className="p-4">Long</td>
                        <td className="p-4 text-right pr-6">34&quot;</td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Model Heights Collage */}
                <div className="bg-cream p-6 rounded-xl border border-line">
                  <div className="grid grid-cols-3 gap-4">
                    {/* Short Model */}
                    <div className="flex flex-col">
                      <div className="relative overflow-hidden aspect-[3/4] bg-line border border-line rounded-lg shadow-xs group">
                        <Image
                          src="https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
                          alt="Short fit, 5ft 4in to 5ft 7in"
                          fill
                          className="object-cover grayscale contrast-[1.05] brightness-95 group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="mt-3 text-center">
                        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-foreground block">
                          Short
                        </span>
                        <span className="text-[9px] font-bold text-faint mt-0.5 block">
                          6&apos;0&quot; - 6&apos;3&quot;
                        </span>
                      </div>
                    </div>

                    {/* Regular Model */}
                    <div className="flex flex-col">
                      <div className="relative overflow-hidden aspect-[3/4] bg-line border border-line rounded-lg shadow-xs group">
                        <Image
                          src="https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
                          alt="Regular fit, 5ft 8in to 6ft"
                          fill
                          className="object-cover grayscale contrast-[1.05] brightness-95 group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="mt-3 text-center">
                        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-foreground block">
                          Regular
                        </span>
                        <span className="text-[9px] font-bold text-faint mt-0.5 block">
                          6&apos;3&quot; - 6&apos;7&quot;
                        </span>
                      </div>
                    </div>

                    {/* Long Model */}
                    <div className="flex flex-col">
                      <div className="relative overflow-hidden aspect-[3/4] bg-line border border-line rounded-lg shadow-xs group">
                        <Image
                          src="https://placehold.co/600x800/e2e8f0/64748b.png?text=Store+Image"
                          alt="Long fit, 6ft 1in to 6ft 5in"
                          fill
                          className="object-cover grayscale contrast-[1.05] brightness-95 group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <div className="mt-3 text-center">
                        <span className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-foreground block">
                          Long
                        </span>
                        <span className="text-[9px] font-bold text-faint mt-0.5 block">
                          6&apos;8&quot; - 7&apos;1&quot;
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Controls with Interactive Wizard Button */}
                <div className="flex items-center justify-between mt-8 pt-6 border-t border-line">
                  <div className="w-10 h-10" />

                  <div className="flex items-center justify-center">
                    <svg className="w-5 h-5 text-aqua-600 fill-aqua-600" viewBox="0 0 24 24">
                      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z" />
                    </svg>
                  </div>

                  <button
                    onClick={() => setWizardStep("wizard-input")}
                    className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em] transition-colors rounded-full cursor-pointer shadow-md"
                  >
                    Input Measurements
                  </button>
                </div>
              </div>
            )}

            {/* TAB 1: OUR HEIGHTS & FIT - INTERACTIVE WIZARD INPUT (Matches Screenshots exactly) */}
            {activeSizeTab === "heights" && wizardStep === "wizard-input" && (() => {
              const isFormValid = !isMetric
                ? (heightFt && heightIn && weightLbs && age && waistIn)
                : (heightCm && weightKg && age && waistIn);
              
              return (
                <div className="flex flex-col animate-in fade-in duration-250">
                  {/* Title Header */}
                  <h2 className="text-xl sm:text-2xl font-light text-foreground text-center mb-2 font-sans">
                    Input your <span className="font-extrabold text-foreground">measurements.</span>
                  </h2>

                  {/* Imperial / Metric Toggle switch control */}
                  <div className="flex items-center justify-center gap-3 mb-8">
                    <span className={`text-[10px] sm:text-xs uppercase tracking-wider font-semibold transition-colors ${!isMetric ? 'text-foreground' : 'text-faint'}`}>
                      imperial
                    </span>
                    <button
                      onClick={() => setIsMetric(!isMetric)}
                      className="relative w-11 h-6 rounded-full bg-line transition-colors p-0.5 flex items-center cursor-pointer focus:outline-none"
                      aria-label="Toggle imperial or metric units"
                    >
                      <div className={`w-5 h-5 rounded-full bg-brand-ink-line shadow-sm transform transition-transform duration-200 ${isMetric ? 'translate-x-5' : 'translate-x-0'}`} />
                    </button>
                    <span className={`text-[10px] sm:text-xs uppercase tracking-wider font-semibold transition-colors ${isMetric ? 'text-foreground' : 'text-faint'}`}>
                      metric
                    </span>
                  </div>

                  {/* Input Swatch Boxes */}
                  <div className="space-y-4 max-w-md w-full mx-auto">
                    {/* Height Box */}
                    <div className="border border-line p-5 rounded-lg flex items-center justify-between bg-white shadow-sm transition-all">
                      <span className="text-sm font-semibold text-foreground">Height</span>
                      <div className="flex items-center gap-3 font-semibold text-foreground">
                        {!isMetric ? (
                          <>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={heightFt}
                                onChange={(e) => setHeightFt(e.target.value)}
                                className="w-12 text-center border-b border-line py-0.5 text-sm font-bold focus:border-aqua-400 focus:outline-none placeholder-faint"
                                placeholder="-"
                              />
                              <span className="text-xs text-faint font-bold uppercase">ft</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <input
                                type="number"
                                value={heightIn}
                                onChange={(e) => setHeightIn(e.target.value)}
                                className="w-12 text-center border-b border-line py-0.5 text-sm font-bold focus:border-aqua-400 focus:outline-none placeholder-faint"
                                placeholder="-"
                              />
                              <span className="text-xs text-faint font-bold uppercase">in</span>
                            </div>
                          </>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={heightCm}
                              onChange={(e) => setHeightCm(e.target.value)}
                              className="w-16 text-center border-b border-line py-0.5 text-sm font-bold focus:border-aqua-400 focus:outline-none placeholder-faint"
                              placeholder="cm"
                            />
                            <span className="text-xs text-faint font-bold uppercase">cm</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Weight Box */}
                    <div className="border border-line p-5 rounded-lg flex items-center justify-between bg-white shadow-sm transition-all">
                      <span className="text-sm font-semibold text-foreground">Weight</span>
                      <div className="flex items-center gap-2 font-semibold text-foreground">
                        {!isMetric ? (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={weightLbs}
                              onChange={(e) => setWeightLbs(e.target.value)}
                              className="w-16 text-center border-b border-line py-0.5 text-sm font-bold focus:border-aqua-400 focus:outline-none placeholder-faint"
                              placeholder="lbs"
                            />
                            <span className="text-xs text-faint font-bold uppercase">lbs</span>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={weightKg}
                              onChange={(e) => setWeightKg(e.target.value)}
                              className="w-16 text-center border-b border-line py-0.5 text-sm font-bold focus:border-aqua-400 focus:outline-none placeholder-faint"
                              placeholder="kg"
                            />
                            <span className="text-xs text-faint font-bold uppercase">kg</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Age Box */}
                    <div className="relative w-full">
                      {/* Circle Info Tooltip above input box */}
                      <button 
                        type="button"
                        className="absolute -top-3.5 right-1 text-faint hover:text-soft focus:outline-none" 
                        title="Age helps refine body mass distribution calculations"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </button>
                      
                      <div className="border border-line p-5 rounded-lg flex items-center justify-between bg-white shadow-sm transition-all">
                        <span className="text-sm font-semibold text-foreground">Age</span>
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={age}
                              onChange={(e) => setAge(e.target.value)}
                              className="w-16 text-center border-b border-line py-0.5 text-sm font-bold focus:border-aqua-400 focus:outline-none placeholder-faint"
                              placeholder="years"
                            />
                            <span className="text-xs text-faint font-bold uppercase">years</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Pant Waist Box */}
                    <div className="relative w-full">
                      {/* Circle Info Tooltip above input box */}
                      <button 
                        type="button"
                        className="absolute -top-3.5 right-1 text-faint hover:text-soft focus:outline-none" 
                        title="Standard waist size of your pants"
                      >
                        <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <circle cx="12" cy="12" r="10" />
                          <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
                          <line x1="12" y1="17" x2="12.01" y2="17" />
                        </svg>
                      </button>
                      
                      <div className="border border-line p-5 rounded-lg flex items-center justify-between bg-white shadow-sm transition-all">
                        <span className="text-sm font-semibold text-foreground">Pant Waist</span>
                        <div className="flex items-center gap-2 font-semibold text-foreground">
                          <div className="flex items-center gap-1.5">
                            <input
                              type="number"
                              value={waistIn}
                              onChange={(e) => setWaistIn(e.target.value)}
                              className="w-16 text-center border-b border-line py-0.5 text-sm font-bold focus:border-aqua-400 focus:outline-none placeholder-faint"
                              placeholder="inches"
                            />
                            <span className="text-xs text-faint font-bold uppercase">inches</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Footer Controls */}
                  <div className="max-w-md w-full mx-auto flex items-center justify-end mt-10 pt-4 border-t border-line">
                    {/* Right CONTINUE button */}
                    <button
                      onClick={() => {
                        if (!isFormValid) return;
                        setScanProgress(0);
                        setScanZone(1);
                        setWizardStep("wizard-scanning");
                      }}
                      disabled={!isFormValid}
                      className={`px-8 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em] transition-all rounded-lg border shadow-xs cursor-pointer ${
                        isFormValid
                          ? "bg-brand-600 rounded-full text-white border-brand-600 hover:bg-brand-700"
                          : "bg-cream text-faint border-line cursor-not-allowed"
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

                {/* Machine Learning / AI heading matching screenshort */}
                <h2 className="text-sm sm:text-base font-medium text-foreground max-w-md mx-auto leading-relaxed mb-6 font-sans">
                  Using <span className="font-extrabold text-foreground">Machine Learning</span> and <span className="font-extrabold text-foreground">Artificial Intelligence</span> to find your best fit.
                </h2>

                {/* 3D Mannequin Body scanning visualization */}
                <div className="relative w-full max-w-[280px] h-[340px] flex items-center justify-center mb-4">
                  <MannequinSVG scanZone={scanZone} />

                  {/* Scanning info panel overlay */}
                  <div className="absolute bottom-4 left-0 right-0 text-center bg-white/85 backdrop-blur-xs py-1.5 px-4 rounded-full border border-line shadow-md max-w-[200px] mx-auto transition-all">
                    <span className="text-[10px] font-extrabold uppercase tracking-[0.14em] text-aqua-600 block animate-pulse">
                      {scanZone === 1 && "Scanning Legs..."}
                      {scanZone === 2 && "Measuring Hips..."}
                      {scanZone === 3 && "Analyzing Torso..."}
                      {scanZone === 4 && "Finalizing Fit..."}
                    </span>
                    <span className="text-[10px] font-bold text-soft mt-0.5 block">
                      {scanProgress}% Completed
                    </span>
                  </div>
                </div>

                {/* Subtle progress progress-bar */}
                <div className="w-full max-w-[240px] bg-cream h-1.5 rounded-full overflow-hidden mb-6 shadow-inner">
                  <div
                    className="bg-aqua-600 h-full rounded-full transition-all duration-75"
                    style={{ width: `${scanProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* TAB 1: OUR HEIGHTS & FIT - WIZARD RESULT */}
            {activeSizeTab === "heights" && wizardStep === "wizard-result" && (
              <div className="flex flex-col animate-in fade-in duration-250 items-center text-center">
                <h2 className="text-3xl font-extrabold uppercase tracking-wider text-foreground mb-2">
                  Your Recommended Fit
                </h2>
                <p className="text-xs text-soft font-light mb-8 max-w-sm">
                  Based on your custom body metrics, we have calculated your optimal tailored fit for this garment:
                </p>

                {/* Recommendation Shield */}
                <div className="bg-brand-ink text-white px-10 py-8 rounded-xl shadow-xl max-w-sm w-full mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-24 h-24 bg-white/5 rounded-full blur-xl transform translate-x-8 -translate-y-8" />
                  <span className="text-brand-300 block mb-1">Recommended Size</span>
                  <div className="text-4xl font-extrabold uppercase tracking-wide mb-4">
                    {/* Dynamic calculation logic */}
                    {(() => {
                      let length = "Regular";
                      if (isMetric) {
                        const cm = parseFloat(heightCm) || 175;
                        if (cm >= 185) length = "Long";
                        else if (cm < 170) length = "Short";
                      } else {
                        const ft = parseFloat(heightFt) || 5;
                        const inch = parseFloat(heightIn) || 9;
                        const totalInches = ft * 12 + inch;
                        if (totalInches >= 73) length = "Long";
                        else if (totalInches < 67) length = "Short";
                      }

                      let size = "L";
                      const lbs = !isMetric ? (parseFloat(weightLbs) || 190) : ((parseFloat(weightKg) || 86) * 2.20462);
                      if (lbs < 160) size = "S";
                      else if (lbs < 190) size = "M";
                      else if (lbs < 220) size = "L";
                      else if (lbs < 250) size = "XL";
                      else size = "2XL";

                      return `${size} - ${length}`;
                    })()}
                  </div>
                  <div className="border-t border-white/10 pt-4 text-left">
                    <div className="flex justify-between text-xs font-light text-faint">
                      <span>Height:</span>
                      <span className="font-bold text-white">
                        {!isMetric ? `${heightFt}' ${heightIn}"` : `${heightCm} cm`}
                      </span>
                    </div>
                    <div className="flex justify-between text-xs font-light text-faint mt-2">
                      <span>Weight:</span>
                      <span className="font-bold text-white">
                        {!isMetric ? `${weightLbs} lbs` : `${weightKg} kg`}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Apply recommendation button */}
                <button
                  onClick={() => {
                    let length = "Regular";
                    if (isMetric) {
                      const cm = parseFloat(heightCm) || 175;
                      if (cm >= 185) length = "Long";
                      else if (cm < 170) length = "Short";
                    } else {
                      const ft = parseFloat(heightFt) || 5;
                      const inch = parseFloat(heightIn) || 9;
                      const totalInches = ft * 12 + inch;
                      if (totalInches >= 73) length = "Long";
                      else if (totalInches < 67) length = "Short";
                    }

                    let size = "L";
                    const lbs = !isMetric ? (parseFloat(weightLbs) || 190) : ((parseFloat(weightKg) || 86) * 2.20462);
                    if (lbs < 160) size = "S";
                    else if (lbs < 190) size = "M";
                    else if (lbs < 220) size = "L";
                    else if (lbs < 250) size = "XL";
                    else size = "2XL";

                    // Normalize comparison so a hyphenated variant name still matches
                    const matchedSize = uniqueSizes.find(s => s.toLowerCase() === size.toLowerCase()) || size;
                    const matchedLength = uniqueLengths.find(l => l.toLowerCase().replace("-", " ") === length.toLowerCase().replace("-", " ")) || length;

                    // Update UI state
                    setSelectedSize(matchedSize);
                    setSelectedLength(matchedLength);
                    setShowSizeChart(false);

                    // Add to cart directly
                    handleAddToBag(matchedSize, matchedLength);
                  }}
                  className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em] transition-colors rounded-full cursor-pointer shadow-md mb-4"
                >
                  Apply To Product
                </button>

                {/* Re-calculate */}
                <button
                  onClick={() => setWizardStep("wizard-input")}
                  className="text-xs text-soft hover:text-brand-700 underline font-semibold tracking-wider uppercase cursor-pointer"
                >
                  Re-enter measurements
                </button>
              </div>
            )}

            {/* TAB 2: SIZE CHART */}
            {activeSizeTab === "size-chart" && (
              <div className="flex flex-col animate-in fade-in duration-200">
                <h2 className="text-3xl font-extrabold uppercase tracking-wider text-center text-foreground mb-6">
                  Size Chart
                </h2>

                {product.sizeChart ? (
                  <div className="relative w-full min-h-[500px] overflow-hidden bg-cream border border-line rounded-xl flex items-center justify-center p-2">
                    <Image
                      src={product.sizeChart}
                      alt="Size Chart Guide"
                      fill
                      className="object-contain"
                    />
                  </div>
                ) : (
                  <div>
                    {/* Measurements Table Header Selector */}
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                      <span className="text-[10px] sm:text-xs font-extrabold tracking-[0.14em] uppercase text-foreground">
                        Tops: Your Body Measurements (Alpha Sizing)
                      </span>
                      <div className="flex items-center gap-1.5 border border-line p-0.5 rounded-xl bg-cream self-start sm:self-auto">
                        <button
                          onClick={() => setSizeUnit("inches")}
                          className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all rounded-xl cursor-pointer ${sizeUnit === "inches" ? "bg-white text-foreground shadow-sm font-extrabold" : "text-faint hover:text-soft"
                            }`}
                        >
                          Inches
                        </button>
                        <span className="text-[9px] text-faint font-light">/</span>
                        <button
                          onClick={() => setSizeUnit("cm")}
                          className={`px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.14em] transition-all rounded-xl cursor-pointer ${sizeUnit === "cm" ? "bg-white text-foreground shadow-sm font-extrabold" : "text-faint hover:text-soft"
                            }`}
                        >
                          Centimeters
                        </button>
                      </div>
                    </div>

                    {/* Sizing measurements Table */}
                    <div className="overflow-x-auto border border-line rounded-xl shadow-sm">
                      <table className="w-full text-center border-collapse text-xs">
                        <thead>
                          <tr className="bg-cream border-b border-line text-[10px] uppercase tracking-wider font-extrabold text-soft">
                            <th className="p-3 text-left pl-6">Size</th>
                            <th className="p-3">Your Chest</th>
                            <th className="p-3">Your Neck</th>
                            <th className="p-3">Your Sleeve Length</th>
                            <th className="p-3 text-right pr-6">Your Waist</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-line text-soft font-medium">
                          {(sizeUnit === "inches"
                            ? [
                              { size: "S", chest: "35-37", neck: "14-14.5", sleeve: "35", waist: "29-31" },
                              { size: "M", chest: "38-40", neck: "15-15.5", sleeve: "35.5", waist: "32-34" },
                              { size: "L", chest: "42-44", neck: "16-16.5", sleeve: "36", waist: "35-37" },
                              { size: "XL", chest: "46-48", neck: "17-17.5", sleeve: "36.5", waist: "38-40" },
                              { size: "2XL", chest: "50-52", neck: "18-18.5", sleeve: "37", waist: "41-43" },
                            ]
                            : [
                              { size: "S", chest: "89-94", neck: "35.5-37", sleeve: "89", waist: "74-79" },
                              { size: "M", chest: "96-101", neck: "38-39", sleeve: "90", waist: "81-86" },
                              { size: "L", chest: "106-112", neck: "40.5-42", sleeve: "91.5", waist: "89-94" },
                              { size: "XL", chest: "117-122", neck: "43-44.5", sleeve: "93", waist: "96-101" },
                              { size: "2XL", chest: "127-132", neck: "45.5-47", sleeve: "94", waist: "104-109" },
                            ]
                          ).map((row, idx) => (
                            <tr key={idx} className="hover:bg-cream/60 transition-colors">
                              <td className="p-3 text-left pl-6 font-bold text-foreground">{row.size}</td>
                              <td className="p-3">{row.chest}</td>
                              <td className="p-3">{row.neck}</td>
                              <td className="p-3">{row.sleeve}</td>
                              <td className="p-3 text-right pr-6">{row.waist}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: HOW TO MEASURE */}
            {activeSizeTab === "measure" && (
              <div className="flex flex-col animate-in fade-in duration-200">
                <h2 className="text-3xl font-extrabold uppercase tracking-wider text-center text-foreground mb-8">
                  How To Measure
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
                  {/* Graphic Outline SVG */}
                  <div className="md:col-span-5 bg-cream/60 p-6 border border-line rounded-xl flex items-center justify-center">
                    <svg className="w-full max-w-[180px] h-[320px] text-faint" viewBox="0 0 200 350" fill="none" stroke="currentColor" strokeWidth="1.5">
                      {/* Head */}
                      <circle cx="100" cy="45" r="22" className="text-white/80" />
                      {/* Neck */}
                      <path d="M92 67v10h16V67" className="text-white/80" />
                      {/* Shoulders & Torso */}
                      <path d="M70 85h60c10 0 15 15 15 25v90c0 10-5 15-15 15H70c-10 0-15-5-15-15v-90c0-10 5-25 15-25z" className="text-white/80" />
                      {/* Arms */}
                      <path d="M55 85C45 95 38 120 38 150v60c0 10 5 15 10 15s10-5 10-15v-50" className="text-white/80" />
                      <path d="M145 85c10 0 17 25 17 55v60c0 10-5 15-10 15s-10-5-10-15v-50" className="text-white/80" />
                      {/* Legs */}
                      <path d="M75 215v100c0 10 5 15 10 15s10-5 10-15v-100" className="text-white/80" />
                      <path d="M125 215v100c0 10-5 15-10 15s-10-5-10-15v-100" className="text-white/80" />

                      {/* Annotation Dot 1 */}
                      <circle cx="100" cy="72" r="8" className="fill-brand-500 stroke-brand-500" />
                      <text x="100" y="75" textAnchor="middle" className="fill-white text-[8px] font-extrabold font-sans stroke-none">1</text>

                      {/* Annotation Dot 2 */}
                      <circle cx="100" cy="115" r="8" className="fill-brand-500 stroke-brand-500" />
                      <text x="100" y="118" textAnchor="middle" className="fill-white text-[8px] font-extrabold font-sans stroke-none">2</text>

                      {/* Annotation Dot 3 */}
                      <circle cx="100" cy="90" r="8" className="fill-brand-500 stroke-brand-500" />
                      <text x="100" y="93" textAnchor="middle" className="fill-white text-[8px] font-extrabold font-sans stroke-none">3</text>

                      {/* Annotation Dot 4 */}
                      <circle cx="100" cy="155" r="8" className="fill-brand-500 stroke-brand-500" />
                      <text x="100" y="158" textAnchor="middle" className="fill-white text-[8px] font-extrabold font-sans stroke-none">4</text>

                      {/* Annotation Dot 5 */}
                      <circle cx="100" cy="205" r="8" className="fill-brand-500 stroke-brand-500" />
                      <text x="100" y="208" textAnchor="middle" className="fill-white text-[8px] font-extrabold font-sans stroke-none">5</text>

                      {/* Annotation Dot 6 */}
                      <circle cx="85" cy="265" r="8" className="fill-brand-500 stroke-brand-500" />
                      <text x="85" y="268" textAnchor="middle" className="fill-white text-[8px] font-extrabold font-sans stroke-none">6</text>
                    </svg>
                  </div>

                  {/* Measuring Descriptions */}
                  <div className="md:col-span-7 space-y-5">
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-foreground block border-b border-line pb-2">
                      Men&apos;s Measurement Guide:
                    </span>
                    <ol className="space-y-4 text-xs text-soft font-light leading-relaxed">
                      <li>
                        <strong className="text-foreground font-bold block mb-0.5">1. Neck</strong>
                        Measure around your neck at Adam&apos;s apple height, keeping some slack in the tape for comfortable breathing.
                      </li>
                      <li>
                        <strong className="text-foreground font-bold block mb-0.5">2. Chest</strong>
                        Measure around the fullest part of your chest, keeping the tape horizontal under your arms and flat across the back.
                      </li>
                      <li>
                        <strong className="text-foreground font-bold block mb-0.5">3. Sleeve Length</strong>
                        Measure from the center back of the neck at your collar seam, along the top of your shoulder, and down to your wrist.
                      </li>
                      <li>
                        <strong className="text-foreground font-bold block mb-0.5">4. Waist</strong>
                        Measure around your natural waistline (where you normally wear your pants), keeping some slack in the measuring tape.
                      </li>
                      <li>
                        <strong className="text-foreground font-bold block mb-0.5">5. Hips</strong>
                        Measure around the fullest part of your hips/seat, keeping the tape horizontal all the way around.
                      </li>
                      <li>
                        <strong className="text-foreground font-bold block mb-0.5">6. Inseam</strong>
                        Measure from the inner crotch seam straight down along the inside of your leg to the bottom of the ankle bone.
                      </li>
                    </ol>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Footer */}
            <div className="mt-8 pt-4 border-t border-line flex justify-end">
              <button
                onClick={() => setShowSizeChart(false)}
                className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 text-[11px] font-extrabold uppercase tracking-[0.14em] transition-colors rounded-full cursor-pointer shadow-md"
              >
                Close Size Guide
              </button>
            </div>
          </div>
        </div>
      )}

      <RecentlyViewed currentProductId={product.id} />
      <Footer categories={categories} />

    </div>
  );
}
