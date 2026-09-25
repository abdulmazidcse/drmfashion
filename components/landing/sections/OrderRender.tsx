"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, ChevronRight, Loader2, MapPin, Plus, Shield, Truck } from "lucide-react";
import StripeCheckout from "@/components/StripeCheckout";
import SquareCheckout from "@/components/SquareCheckout";
import { useCurrency } from "@/providers/CurrencyProvider";
import { addToCart, cartCount, cartTotal, clearCart, getCart, type CartItem } from "@/lib/cart";
import { sortLengths, sortSizes } from "@/lib/variants";
import { trackPurchase, storeCurrency } from "@/lib/analytics";
import { COUNTRIES } from "@/lib/countries";
import { regionLabelFor } from "@/lib/regions";
import { useRegions } from "@/lib/useRegions";
import { resolveTax, taxLineLabel, type TaxSettings } from "@/lib/tax";
import Swal from "@/lib/swal";
import { startBkashCheckout } from "@/lib/bkashCheckoutClient";
import {
  applyBkashFreeShipping,
  applyFreeShippingThreshold,
  defaultShippingMethod,
  shippableMethodsForDestination,
  shippingPriceForCountry,
  type ShippingMethod,
} from "@/lib/shipping";

const COUNTRY_METADATA = COUNTRIES.reduce((acc, c) => {
  acc[c.code] = c;
  return acc;
}, {} as Record<string, (typeof COUNTRIES)[0]>);

export interface Variant {
  id: string;
  color: string;
  size: string;
  length: string | null;
  stock: number;
  price: number | null;
}

export interface LandingProduct {
  id: string;
  title: string;
  slug: string;
  thumbnail: string;
  basePrice: number;
  discountPrice: number | null;
  images: string[];
  variants: Variant[];
}

export interface PaymentSettings {
  cod: boolean;
  codCountry: string;
  stripe: boolean;
  bkash: boolean;
  nagad: boolean;
  square: boolean;
}

export interface ShippingSettings {
  enabled: boolean;
  methods: ShippingMethod[];
  /** Base-currency subtotal above which shipping is free, or null. */
  freeThreshold: number | null;
  /** Base-currency subtotal at or below which a bKash order ships free, or null. */
  bkashFreeShippingMax: number | null;
}

interface OrderRenderProps {
  heading: string;
  subheading: string;
  buttonText: string;
  products: LandingProduct[];
  showLowStockNotice: boolean;
  payments: PaymentSettings;
  shipping: ShippingSettings;
  tax: TaxSettings;
}

interface Selection {
  color: string;
  size: string;
  length: string;
  quantity: number;
}

const uniq = (values: (string | null)[]) =>
  Array.from(new Set(values.filter((v): v is string => Boolean(v))));

function defaultSelection(p: LandingProduct): Selection {
  const colors = uniq(p.variants.map((v) => v.color));
  const color = colors[0] || "";
  const sizes = sortSizes(uniq(p.variants.filter((v) => v.color === color).map((v) => v.size)));
  const size = sizes[0] || "";
  const lengths = sortLengths(uniq(p.variants.filter((v) => v.color === color && v.size === size).map((v) => v.length)));
  const length = lengths[0] || "";
  return { color, size, length, quantity: 1 };
}

/**
 * The order/checkout unit of a landing page: a curated product picker feeding
 * the site's normal cart (`lib/cart.ts`), plus the inline delivery + payment
 * form. Extracted out of the old fixed `LandingPageBuy` page so both it and
 * the section-based builder's "order" section share one checkout
 * implementation instead of two copies of the bKash/Stripe/Square wiring.
 */
export default function OrderRender({
  heading,
  subheading,
  buttonText,
  products,
  showLowStockNotice,
  payments,
  shipping,
  tax: taxSettings,
}: OrderRenderProps) {
  const { formatPrice, selectedCurrency } = useCurrency();

  const [selections, setSelections] = useState<Record<string, Selection>>(() =>
    Object.fromEntries(products.map((p) => [p.id, defaultSelection(p)]))
  );
  const [productErrors, setProductErrors] = useState<Record<string, string>>({});
  const [justAdded, setJustAdded] = useState<Record<string, boolean>>({});

  const [placed, setPlaced] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const checkoutRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => setCartItems(getCart());
    sync();
    window.addEventListener("cart-updated", sync);
    return () => window.removeEventListener("cart-updated", sync);
  }, []);

  const cartQty = cartCount(cartItems);
  const cartSubtotal = cartTotal(cartItems);

  function updateSelection(productId: string, patch: Partial<Selection>) {
    setSelections((prev) => ({ ...prev, [productId]: { ...prev[productId], ...patch } }));
  }

  /** Colours/sizes/lengths available for a product, narrowed by what's already picked. */
  function optionsFor(p: LandingProduct) {
    const sel = selections[p.id];
    const colors = uniq(p.variants.map((v) => v.color));
    const sizes = sortSizes(uniq(p.variants.filter((v) => v.color === sel.color).map((v) => v.size)));
    const lengths = sortLengths(uniq(p.variants.filter((v) => v.color === sel.color && v.size === sel.size).map((v) => v.length)));
    const variant = p.variants.find(
      (v) => v.color === sel.color && v.size === sel.size && (v.length || "") === (sel.length || "")
    );
    return { colors, sizes, lengths, variant };
  }

  function handleAddToCart(p: LandingProduct) {
    const sel = selections[p.id];
    const { variant } = optionsFor(p);

    if (!variant) {
      setProductErrors((prev) => ({ ...prev, [p.id]: "This combination is unavailable" }));
      return;
    }
    if (variant.stock < sel.quantity) {
      setProductErrors((prev) => ({ ...prev, [p.id]: `Only ${variant.stock} left` }));
      return;
    }
    setProductErrors((prev) => {
      const next = { ...prev };
      delete next[p.id];
      return next;
    });

    const unitPrice = variant.price ?? p.discountPrice ?? p.basePrice;
    addToCart(
      {
        productId: p.id,
        slug: p.slug,
        title: p.title,
        thumbnail: p.thumbnail,
        color: sel.color,
        size: sel.size,
        length: sel.length,
        price: unitPrice,
      },
      sel.quantity
    );

    setJustAdded((prev) => ({ ...prev, [p.id]: true }));
    setTimeout(() => setJustAdded((prev) => ({ ...prev, [p.id]: false })), 1500);
  }

  const chip = (active: boolean) =>
    `px-3.5 py-2 text-xs font-semibold border transition-colors ${
      active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
    }`;

  // ---------------------------------------------------------------------
  // Inline checkout (mirrors components/QuickBuy.tsx, built from the cart
  // instead of a single product/variant selection)
  // ---------------------------------------------------------------------

  const firstPaymentMethod = payments.cod
    ? "cod"
    : payments.stripe
      ? "card"
      : payments.bkash
        ? "bkash"
        : payments.nagad
          ? "nagad"
          : "square";

  const [form, setForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    country: COUNTRIES[0]?.code || "US",
    address: "",
    area: "",
    city: "",
    postalCode: "",
    paymentMethod: firstPaymentMethod,
    nagadNumber: "",
  });
  const [selectedMethodId, setSelectedMethodId] = useState(
    () => defaultShippingMethod(shipping.methods)?.id ?? ""
  );
  const [placing, setPlacing] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [checkoutErrors, setCheckoutErrors] = useState<Record<string, string>>({});
  const [squareKeys, setSquareKeys] = useState({ appId: "", locationId: "" });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const { regions: countryRegions, loading: regionsLoading } = useRegions(form.country);

  // Display only — the server re-resolves every figure in /api/checkout.
  const shippingOptions = shippableMethodsForDestination(shipping.methods, {
    countryCode: form.country,
    regionCode: form.area,
  });
  const selectedMethod =
    shippingOptions.find((m) => m.id === selectedMethodId) ??
    defaultShippingMethod(shipping.methods, form.country, form.area);
  const shippingFee = applyBkashFreeShipping(
    applyFreeShippingThreshold(
      shipping.enabled && selectedMethod
        ? shippingPriceForCountry(selectedMethod, form.country)
        : 0,
      cartSubtotal,
      shipping.freeThreshold
    ),
    cartSubtotal,
    form.paymentMethod,
    shipping.bkashFreeShippingMax
  );

  const resolvedTax = resolveTax(taxSettings, {
    country: form.country,
    state: form.area,
    taxableAmount: cartSubtotal,
    shippingFee,
  });
  const taxAmount = resolvedTax.amount;
  const total = cartSubtotal + taxAmount + shippingFee;

  async function loadSquareKeys() {
    if (squareKeys.appId) return;
    try {
      const res = await fetch("/api/settings");
      const data = await res.json();
      setSquareKeys({ appId: data.square_app_id || "", locationId: data.square_location_id || "" });
    } catch {
      /* SquareCheckout renders its own "unavailable" state without keys */
    }
  }

  function validateCheckout() {
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = "Required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = "Enter a valid email";
    if (!form.phone.trim()) next.phone = "Required";
    if (!form.address.trim()) next.address = "Required";
    if (!form.city.trim()) next.city = "Required";
    if (form.paymentMethod === "nagad" && !form.nagadNumber.trim()) next.nagadNumber = "Required";
    setCheckoutErrors(next);
    return Object.keys(next).length === 0;
  }

  function buildCheckoutPayload(paymentIntentId?: string) {
    const dialCode = COUNTRY_METADATA[form.country]?.dialCode || "";
    return {
      fullName: form.fullName,
      email: form.email,
      phone: `${dialCode} ${form.phone}`.trim(),
      address: `${form.address}, ${form.area}, ${form.city} ${form.postalCode}`,
      paymentMethod: form.paymentMethod,
      totalAmount: total,
      tax: taxAmount,
      shipping: shippingFee,
      shippingMethodId: selectedMethod?.id || "",
      shippingDestination: {
        city: form.city,
        postalCode: form.postalCode,
        countryCode: form.country,
        state: form.area,
        addressLine: form.address,
      },
      currencyCode: selectedCurrency?.code || "USD",
      currencySymbol: selectedCurrency?.symbol || "$",
      exchangeRate: selectedCurrency?.rate || 1.0,
      items: cartItems.map((item) => ({
        productId: item.productId,
        color: item.color,
        size: item.size,
        length: item.length,
        price: item.price,
        quantity: item.quantity,
        title: item.title,
        custom: item.custom ? { values: item.custom.values } : undefined,
      })),
      paymentDetails: {
        nagadNumber: form.nagadNumber,
        cardNumber: form.paymentMethod === "card" ? "Stripe Payment" : "",
        paymentIntentId: paymentIntentId || undefined,
      },
      pointsRedeemed: 0,
    };
  }

  async function handleBkashCheckout() {
    if (!validateCheckout()) return;
    setPlacing(true);
    try {
      await startBkashCheckout(buildCheckoutPayload());
      // On success the browser navigates away to bKash.
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to start bKash payment.";
      Swal.fire({ text: message, confirmButtonColor: "#18181b", icon: "error" });
      setPlacing(false);
    }
  }

  async function placeOrder(paymentIntentId?: string) {
    if (!validateCheckout()) return;
    setPlacing(true);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCheckoutPayload(paymentIntentId)),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.message || "Failed to place order");
      }

      const result = await res.json();
      trackPurchase({
        transaction_id: result.orderId,
        value: result.analytics?.value ?? total,
        currency: result.analytics?.currency ?? storeCurrency(),
        shipping: result.analytics?.shipping,
        items: cartItems.map((i) => ({
          item_id: i.productId,
          item_name: i.title,
          price: i.price,
          quantity: i.quantity,
          item_variant: [i.color, i.size, i.length].filter(Boolean).join(" / ") || undefined,
        })),
      });

      clearCart();
      setOrderId(result.orderId || "");
      setPlaced(true);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to place your order.";
      Swal.fire({ text: message, confirmButtonColor: "#18181b", icon: "error" });
    } finally {
      setPlacing(false);
    }
  }

  const fieldCls = (key?: keyof typeof checkoutErrors) =>
    `w-full px-4 py-3 text-sm border bg-zinc-50 focus:bg-white focus:outline-none transition-all ${
      key && checkoutErrors[key]
        ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
        : "border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
    }`;
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2";

  const paymentMethodOptions = [
    { key: "cod", label: "Cash on Delivery", on: payments.cod },
    { key: "card", label: "Card", on: payments.stripe },
    { key: "bkash", label: "bKash", on: payments.bkash },
    { key: "nagad", label: "Nagad", on: payments.nagad },
    { key: "square", label: "Square", on: payments.square },
  ].filter((m) => m.on);

  if (placed) {
    return (
      <div id="order" className="flex flex-col items-center justify-center gap-8 px-6 py-20 text-center bg-zinc-50">
        <div className="w-20 h-20 rounded-full bg-zinc-950 flex items-center justify-center ring-8 ring-zinc-100">
          <Check className="w-9 h-9 text-white" />
        </div>
        <div>
          <h2 className="text-3xl font-extrabold uppercase tracking-tight mb-3">Order Confirmed</h2>
          <p className="text-sm font-light text-zinc-500 max-w-md">
            Thank you, <strong className="text-zinc-700">{form.fullName}</strong>. A confirmation is on its way to{" "}
            <strong className="text-zinc-700">{form.email}</strong>.
          </p>
          {orderId && <p className="mt-3 text-xs uppercase tracking-widest text-zinc-400">Order #{orderId}</p>}
        </div>
        <Link
          href="/shop"
          className="bg-zinc-950 text-white px-10 py-4 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors"
        >
          Continue Shopping
        </Link>
      </div>
    );
  }

  return (
    <div id="order" className="w-full max-w-[1100px] mx-auto px-5 py-10 lg:py-16">
      {(heading || subheading) && (
        <div className="mb-10">
          {heading && <h1 className="text-3xl md:text-4xl font-extrabold uppercase tracking-tight leading-tight">{heading}</h1>}
          {subheading && <p className="mt-3 text-sm md:text-base text-zinc-500 max-w-2xl">{subheading}</p>}
        </div>
      )}

      <section className="space-y-6">
        {products.map((p) => {
          const sel = selections[p.id];
          const { colors, sizes, lengths, variant } = optionsFor(p);
          const unitPrice = variant?.price ?? p.discountPrice ?? p.basePrice;

          return (
            <div key={p.id} className="flex flex-col sm:flex-row gap-5 border border-zinc-100 p-5 sm:p-6">
              <div className="relative w-full sm:w-32 md:w-36 h-48 sm:h-40 shrink-0 bg-zinc-100">
                <Image src={p.thumbnail} alt={p.title} fill sizes="144px" className="object-cover" />
              </div>
              <div className="flex-1 min-w-0 space-y-4">
                <div>
                  <h2 className="text-base font-bold leading-snug">{p.title}</h2>
                  <p className="mt-1 text-lg font-black">{formatPrice(unitPrice)}</p>
                  {p.discountPrice && p.discountPrice < p.basePrice && (
                    <p className="text-xs text-zinc-400 line-through">{formatPrice(p.basePrice)}</p>
                  )}
                  <Link href={`/product/${p.slug}`} className="mt-1 inline-block text-[10px] uppercase tracking-widest text-zinc-500 underline">
                    View full details
                  </Link>
                </div>

                <div className="flex flex-wrap gap-5">
                  {colors.length > 0 && (
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Colour</span>
                      <div className="flex flex-wrap gap-1.5">
                        {colors.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => {
                              const nextSizes = sortSizes(uniq(p.variants.filter((v) => v.color === c).map((v) => v.size)));
                              const nextLengths = sortLengths(
                                uniq(p.variants.filter((v) => v.color === c && v.size === nextSizes[0]).map((v) => v.length))
                              );
                              updateSelection(p.id, { color: c, size: nextSizes[0] || "", length: nextLengths[0] || "" });
                            }}
                            className={chip(sel.color === c)}
                          >
                            {c}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {sizes.length > 0 && (
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Size</span>
                      <div className="flex flex-wrap gap-1.5">
                        {sizes.map((s) => (
                          <button
                            key={s}
                            type="button"
                            onClick={() => {
                              const nextLengths = sortLengths(
                                uniq(p.variants.filter((v) => v.color === sel.color && v.size === s).map((v) => v.length))
                              );
                              updateSelection(p.id, { size: s, length: nextLengths[0] || "" });
                            }}
                            className={chip(sel.size === s)}
                          >
                            {s}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {lengths.length > 0 && (
                    <div>
                      <span className="block text-[9px] font-bold uppercase tracking-widest text-zinc-400 mb-1.5">Length</span>
                      <div className="flex flex-wrap gap-1.5">
                        {lengths.map((l) => (
                          <button key={l} type="button" onClick={() => updateSelection(p.id, { length: l })} className={chip(sel.length === l)}>
                            {l}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center border border-zinc-200 w-fit">
                    <button type="button" onClick={() => updateSelection(p.id, { quantity: Math.max(1, sel.quantity - 1) })} className="px-3 py-2 text-base hover:bg-zinc-100 transition-colors">
                      −
                    </button>
                    <span className="px-4 text-sm font-bold">{sel.quantity}</span>
                    <button
                      type="button"
                      onClick={() => updateSelection(p.id, { quantity: Math.min(variant?.stock || 99, sel.quantity + 1) })}
                      className="px-3 py-2 text-base hover:bg-zinc-100 transition-colors"
                    >
                      +
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAddToCart(p)}
                    className="inline-flex items-center gap-1.5 bg-zinc-950 text-white px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest hover:bg-zinc-800 transition-colors disabled:opacity-60"
                    disabled={justAdded[p.id]}
                  >
                    {justAdded[p.id] ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Added
                      </>
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5" /> Add to Cart
                      </>
                    )}
                  </button>
                </div>

                {productErrors[p.id] && <p className="text-xs text-red-600">{productErrors[p.id]}</p>}
                {showLowStockNotice && variant && variant.stock > 0 && variant.stock <= 5 && (
                  <p className="text-xs text-amber-600">Only {variant.stock} left in stock</p>
                )}
              </div>
            </div>
          );
        })}
      </section>

      {cartQty > 0 && (
        <div className="mt-10 border border-zinc-200 bg-zinc-50">
          <div className="px-6 py-5 flex items-center justify-between gap-4">
            <span className="text-xs sm:text-sm text-zinc-600">
              <strong className="text-zinc-950">{cartQty}</strong> item{cartQty === 1 ? "" : "s"} in cart · <strong className="text-zinc-950">{formatPrice(cartSubtotal)}</strong>
            </span>
            <button
              onClick={() => checkoutRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
              className="inline-flex items-center gap-1.5 bg-zinc-950 text-white px-6 py-3 text-xs font-black tracking-widest uppercase hover:bg-zinc-800 transition-colors shrink-0"
            >
              Proceed to Checkout <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {cartQty > 0 && (
        <div ref={checkoutRef} className="mt-12 pt-10 border-t-2 border-zinc-950">
          <h2 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight mb-8">Complete Your Order</h2>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12">
            {/* LEFT — cart items + delivery + payment */}
            <div className="space-y-8">
              <section>
                <h3 className="text-xs font-black uppercase tracking-widest mb-4">Your Items</h3>
                <div className="space-y-3">
                  {cartItems.map((item) => (
                    <div key={item.id} className="flex items-center gap-3 border border-zinc-100 p-3">
                      <div className="relative w-14 h-16 shrink-0 bg-zinc-100">
                        <Image src={item.thumbnail} alt={item.title} fill sizes="56px" className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{item.title}</p>
                        <p className="text-[10px] text-zinc-500">
                          {[item.color, item.size, item.length].filter(Boolean).join(" / ")} · Qty {item.quantity}
                        </p>
                      </div>
                      <p className="text-xs font-black shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>
              </section>

              <section className="space-y-4 pt-2 border-t border-zinc-100">
                <div className="flex items-center gap-2 pt-6">
                  <MapPin className="w-4 h-4 text-zinc-400" />
                  <h3 className="text-xs font-black uppercase tracking-widest">Shipping Information</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Full Name</label>
                    <input value={form.fullName} onChange={set("fullName")} className={fieldCls("fullName")} placeholder="John Doe" />
                    {checkoutErrors.fullName && <p className="mt-1 text-xs text-red-600">{checkoutErrors.fullName}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Email Address</label>
                    <input value={form.email} onChange={set("email")} className={fieldCls("email")} placeholder="you@example.com" />
                    {checkoutErrors.email && <p className="mt-1 text-xs text-red-600">{checkoutErrors.email}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Phone Number</label>
                    <div className={`flex items-stretch border bg-zinc-50 focus-within:bg-white transition-all ${
                      checkoutErrors.phone
                        ? "border-red-500 focus-within:border-red-500 focus-within:ring-1 focus-within:ring-red-500"
                        : "border-zinc-200 focus-within:border-zinc-950 focus-within:ring-1 focus-within:ring-zinc-950"
                    }`}>
                      <div className="relative flex items-center bg-zinc-100 border-r border-zinc-200 px-3 cursor-pointer hover:bg-zinc-200 transition-colors">
                        <img
                          src={`https://flagcdn.com/w20/${form.country.toLowerCase()}.png`}
                          alt={form.country}
                          width="20"
                          height="15"
                          className="mr-1.5 object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = "none";
                          }}
                        />
                        <span className="text-xs font-bold text-zinc-600 mr-1.5">{COUNTRY_METADATA[form.country]?.dialCode}</span>
                        <span className="text-[7px] text-zinc-400">▼</span>
                        <select
                          value={form.country}
                          onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, area: "" }))}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name} ({c.dialCode})
                            </option>
                          ))}
                        </select>
                      </div>
                      <input
                        value={form.phone}
                        onChange={set("phone")}
                        placeholder={COUNTRY_METADATA[form.country]?.phonePlaceholder || "1712345678"}
                        className="w-full px-4 py-3 text-sm bg-transparent focus:outline-none"
                      />
                    </div>
                    {checkoutErrors.phone && <p className="mt-1 text-xs text-red-600">{checkoutErrors.phone}</p>}
                  </div>
                  <div className="sm:col-span-2">
                    <label className={labelClass}>Street Address</label>
                    <input value={form.address} onChange={set("address")} className={fieldCls("address")} placeholder="123 Main St, Apt 4B" />
                    {checkoutErrors.address && <p className="mt-1 text-xs text-red-600">{checkoutErrors.address}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>Country</label>
                    <select
                      value={form.country}
                      onChange={(e) => setForm((f) => ({ ...f, country: e.target.value, area: "" }))}
                      className={fieldCls()}
                    >
                      {COUNTRIES.map((c) => (
                        <option key={c.code} value={c.code}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>City</label>
                    <input value={form.city} onChange={set("city")} className={fieldCls("city")} placeholder="New York" />
                    {checkoutErrors.city && <p className="mt-1 text-xs text-red-600">{checkoutErrors.city}</p>}
                  </div>
                  <div>
                    <label className={labelClass}>{regionLabelFor(form.country)}</label>
                    {countryRegions.length > 0 || regionsLoading ? (
                      <select value={form.area} onChange={set("area")} disabled={regionsLoading} className={fieldCls()}>
                        <option value="">
                          {regionsLoading ? "Loading…" : `Select ${regionLabelFor(form.country).toLowerCase()}…`}
                        </option>
                        {countryRegions.map((r) => (
                          <option key={r.code} value={r.code}>{r.name}</option>
                        ))}
                      </select>
                    ) : (
                      <input value={form.area} onChange={set("area")} className={fieldCls()} placeholder="Optional" />
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Postal Code</label>
                    <input value={form.postalCode} onChange={set("postalCode")} className={fieldCls()} placeholder="10001" />
                  </div>
                </div>

                {shippingOptions.length > 0 && (
                  <div className="pt-4 border-t border-zinc-100 space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-widest">Select Shipping Method</h3>
                    <div className="space-y-2">
                      {shippingOptions.map((method) => {
                        const price = shipping.enabled ? shippingPriceForCountry(method, form.country) : 0;
                        return (
                          <label
                            key={method.id}
                            className={`flex items-start gap-4 p-4 border cursor-pointer transition-all ${
                              selectedMethod?.id === method.id
                                ? "border-zinc-950 bg-zinc-50"
                                : "border-zinc-200 hover:border-zinc-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="landing-shipping"
                              checked={selectedMethod?.id === method.id}
                              onChange={() => setSelectedMethodId(method.id)}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-black uppercase tracking-wider text-zinc-900">{method.name}</p>
                              {method.deliveryTime && (
                                <p className="text-[10px] text-zinc-400 font-light mt-0.5">Estimated delivery: {method.deliveryTime}</p>
                              )}
                            </div>
                            <span className={`text-xs font-black ${price === 0 ? "text-emerald-600" : "text-zinc-950"}`}>
                              {price === 0 ? "FREE" : formatPrice(price)}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-4 pt-2 border-t border-zinc-100">
                <h3 className="pt-6 text-xs font-black uppercase tracking-widest">Payment</h3>

                <div className="flex flex-wrap gap-2">
                  {paymentMethodOptions.map((m) => (
                    <button
                      key={m.key}
                      type="button"
                      onClick={() => {
                        setForm((f) => ({ ...f, paymentMethod: m.key }));
                        if (m.key === "square") loadSquareKeys();
                      }}
                      className={chip(form.paymentMethod === m.key)}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {form.paymentMethod === "cod" && payments.codCountry && (
                  <p className="text-xs text-zinc-500">Cash on delivery is available in {payments.codCountry}.</p>
                )}

                {form.paymentMethod === "bkash" && (
                  <p className="text-xs text-zinc-500">You&apos;ll be redirected to bKash to complete payment securely.</p>
                )}

                {form.paymentMethod === "nagad" && (
                  <div>
                    <label className={labelClass}>Nagad Number</label>
                    <input value={form.nagadNumber} onChange={set("nagadNumber")} className={fieldCls("nagadNumber")} placeholder="01XXXXXXXXX" />
                    {checkoutErrors.nagadNumber && <p className="mt-1 text-xs text-red-600">{checkoutErrors.nagadNumber}</p>}
                  </div>
                )}
              </section>
            </div>

            {/* RIGHT — summary + submit */}
            <aside className="lg:sticky lg:top-24 h-fit border border-zinc-100 bg-zinc-50 p-6 space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest">Order Summary</h3>

              <div className="space-y-2 text-sm">
                <div className="flex justify-between text-zinc-500">
                  <span>Subtotal · {cartQty} item{cartQty === 1 ? "" : "s"}</span>
                  <span className="text-zinc-950">{formatPrice(cartSubtotal)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>{taxLineLabel(resolvedTax.rate, resolvedTax.label)}</span>
                  <span className="text-zinc-950">{formatPrice(taxAmount)}</span>
                </div>
                <div className="flex justify-between text-zinc-500">
                  <span>Shipping</span>
                  <span className="text-zinc-950">{shippingFee === 0 ? "Free" : formatPrice(shippingFee)}</span>
                </div>
                <div className="flex justify-between pt-3 mt-3 border-t border-zinc-200 text-base font-black">
                  <span>Total</span>
                  <span>{formatPrice(total)}</span>
                </div>
              </div>

              {form.paymentMethod === "card" ? (
                <StripeCheckout
                  items={cartItems}
                  email={form.email}
                  pointsRedeemed={0}
                  shippingMethodId={selectedMethod?.id || ""}
                  shippingDestination={{
                    city: form.city,
                    postalCode: form.postalCode,
                    countryCode: form.country,
                    state: form.area,
                    addressLine: form.address,
                  }}
                  onSuccess={(intentId) => placeOrder(intentId)}
                  onError={(err) => Swal.fire({ text: err, confirmButtonColor: "#18181b" })}
                />
              ) : form.paymentMethod === "square" ? (
                squareKeys.appId && squareKeys.locationId ? (
                  <SquareCheckout
                    items={cartItems}
                    email={form.email}
                    pointsRedeemed={0}
                    appId={squareKeys.appId}
                    locationId={squareKeys.locationId}
                    postalCode={form.postalCode}
                    onSuccess={(intentId) => placeOrder(intentId)}
                    onError={(err) => Swal.fire({ text: err, confirmButtonColor: "#18181b" })}
                  />
                ) : (
                  <p className="text-xs text-zinc-500">Loading secure payment form…</p>
                )
              ) : (
                <button
                  onClick={() => (form.paymentMethod === "bkash" ? handleBkashCheckout() : placeOrder())}
                  disabled={placing}
                  className="w-full bg-zinc-950 text-white py-4 text-xs font-black tracking-widest uppercase hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-wait transition-colors flex items-center justify-center gap-2"
                >
                  {placing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" /> {form.paymentMethod === "bkash" ? "Redirecting to bKash…" : "Placing Order…"}
                    </>
                  ) : form.paymentMethod === "bkash" ? (
                    <>Pay with bKash · {formatPrice(total)}</>
                  ) : (
                    <>{buttonText || "Place Order"} · {formatPrice(total)}</>
                  )}
                </button>
              )}

              <div className="space-y-2 pt-2 text-[11px] text-zinc-500">
                <p className="flex items-center gap-2">
                  <Shield className="w-3.5 h-3.5" /> Secure encrypted checkout
                </p>
                <p className="flex items-center gap-2">
                  <Truck className="w-3.5 h-3.5" />
                  {selectedMethod
                    ? `${selectedMethod.name}${selectedMethod.deliveryTime ? ` · ${selectedMethod.deliveryTime}` : ""}`
                    : "Shipping calculated at checkout"}
                </p>
              </div>
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}
