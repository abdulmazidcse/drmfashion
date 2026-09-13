"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import {
  Minus, Plus, Trash2, ShoppingBag, ArrowLeft,
  ChevronRight, Shield, RotateCcw, Truck, Tag, X
} from "lucide-react";
import {
  CartItem, getCart, removeFromCart, updateQty, cartTotal, cartCount
} from "@/lib/cart";
import { measurementFingerprint, summarizeMeasurements } from "@/lib/measurement";
import { sortLengths, sortSizes } from "@/lib/variants";
import Header from "@/components/HeaderClient";
import Footer from "@/components/Footer";
import { useCurrency } from "@/providers/CurrencyProvider";
import {
  applyFreeShippingThreshold,
  DEFAULT_SHIPPING_METHODS,
  defaultShippingMethod,
  freeShippingThresholdFromSettings,
  parseShippingMethods,
  type ShippingMethod,
} from "@/lib/shipping";

// Removed hardcoded shipping constants

export default function CartPage() {
  const router = useRouter();
  const { formatPrice } = useCurrency();
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoApplied, setPromoApplied] = useState(false);
  const [promoError, setPromoError] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [productsMap, setProductsMap] = useState<Record<string, any>>({});

  // Shipping state
  const [shippingEnabled, setShippingEnabled] = useState(true);
  // The cart only previews a figure — the shopper picks the actual tier at
  // checkout, so this shows the cheapest one on offer.
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>(DEFAULT_SHIPPING_METHODS);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null);

  // Hydrate from localStorage on mount
  useEffect(() => {
    setItems(getCart());
    const savedPromo = localStorage.getItem("ag_promo");
    if (savedPromo) {
      try {
        const { code, percentage } = JSON.parse(savedPromo);
        if (code && percentage) {
          setPromoCode(code);
          setDiscountPercentage(percentage);
          setPromoApplied(true);
        }
      } catch (e) {}
    }

    // Fetch settings
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          setShippingEnabled(data.shipping_enabled !== "false");
          setShippingMethods(parseShippingMethods(data.shipping_methods));
          setFreeShippingThreshold(freeShippingThresholdFromSettings(data));
        }
      })
      .catch((err) => console.error("Failed to load settings", err));

    setMounted(true);
  }, []);

  // Fetch details for each unique productId in the cart
  useEffect(() => {
    if (!mounted || items.length === 0) return;

    const uniqueProductIds = Array.from(new Set(items.map((item) => item.productId)));

    uniqueProductIds.forEach(async (prodId) => {
      if (productsMap[prodId]) return;
      try {
        const res = await fetch(`/api/products/${prodId}`);
        if (res.ok) {
          const data = await res.json();
          setProductsMap((prev) => ({ ...prev, [prodId]: data }));
        }
      } catch (err) {
        console.error("Failed to fetch product details for variant change:", err);
      }
    });
  }, [items, mounted, productsMap]);

  const handleUpdateVariant = useCallback((
    oldId: string,
    newColor: string,
    newSize: string,
    newLength: string
  ) => {
    setItems((prevItems) => {
      const cart = [...prevItems];
      const itemIndex = cart.findIndex((c) => c.id === oldId);
      if (itemIndex === -1) return prevItems;

      const item = { ...cart[itemIndex] };
      const product = productsMap[item.productId];
      if (!product) return prevItems;

      const activeVariant = product.variants.find(
        (v: any) =>
          v.color.toLowerCase() === newColor.toLowerCase() &&
          v.size.toLowerCase() === newSize.toLowerCase() &&
          (v.length ? v.length.toLowerCase() === newLength.toLowerCase() : true)
      );

      const basePrice = activeVariant?.price ?? product.basePrice;
      const discountRatio = product.discountPrice ? (product.discountPrice / product.basePrice) : null;
      const finalPrice = discountRatio ? Math.round(basePrice * discountRatio) : basePrice;

      // Made-to-measure lines keep their measurement suffix (and their tailoring
      // fee) when the shopper switches colour or size.
      const customKey = item.custom ? `-mtm${measurementFingerprint(item.custom.values)}` : "";
      const newId = `${item.productId}-${newColor}-${newSize}-${newLength}${customKey}`;

      const existingIndex = cart.findIndex((c) => c.id === newId);
      if (existingIndex !== -1 && existingIndex !== itemIndex) {
        cart[existingIndex].quantity += item.quantity;
        cart.splice(itemIndex, 1);
      } else {
        item.id = newId;
        item.color = newColor;
        item.size = newSize;
        item.length = newLength;
        item.price = finalPrice + (item.custom?.fee ?? 0);
        cart[itemIndex] = item;
      }

      localStorage.setItem("ag_cart", JSON.stringify(cart));
      window.dispatchEvent(new Event("cart-updated"));
      return cart;
    });
  }, [productsMap]);

  const handleQtyChange = useCallback((id: string, qty: number) => {
    setItems(updateQty(id, qty));
  }, []);

  const handleRemove = useCallback((id: string) => {
    setRemovingId(id);
    setTimeout(() => {
      setItems(removeFromCart(id));
      setRemovingId(null);
    }, 300);
  }, []);

  const handlePromo = async () => {
    if (!promoCode) return;
    try {
      setPromoError("");
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode, total: subtotal }),
      });
      const data = await res.json();

      // The endpoint answers with `valid`, not `success` — checking the wrong
      // key meant every code, correct or not, fell through to the error branch.
      if (res.ok && data.valid) {
        setPromoApplied(true);
        setDiscountPercentage(data.discount);
        // Applied, but the discount only survives checkout if the order is
        // placed with a subscribed address — say so now rather than letting it
        // fail at payment.
        setPromoError(
          data.subscribersOnly
            ? "Applied. Check out with the email you subscribed with to keep this discount."
            : ""
        );
        localStorage.setItem("ag_promo", JSON.stringify({ code: data.code, percentage: data.discount }));
      } else {
        setPromoError(data.message || "Invalid promo code");
        setPromoApplied(false);
        setDiscountPercentage(0);
        localStorage.removeItem("ag_promo");
      }
    } catch (error) {
      setPromoError("Failed to validate promo code");
    }
  };

  const removePromo = () => {
    setPromoApplied(false);
    setPromoCode("");
    setDiscountPercentage(0);
    localStorage.removeItem("ag_promo");
  };

  const subtotal = cartTotal(items);
  const discount = promoApplied ? Math.round(subtotal * (discountPercentage / 100)) : 0;
  const cheapestMethod = defaultShippingMethod(shippingMethods);
  const shipping = applyFreeShippingThreshold(
    shippingEnabled ? cheapestMethod?.price ?? 0 : 0,
    subtotal,
    freeShippingThreshold
  );
  const total = subtotal - discount + shipping;
  const count = cartCount(items);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 text-zinc-950 font-sans antialiased">

      <Header />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-10 w-full flex-1">

        {/* BREADCRUMB */}
        <div className="flex items-center gap-2 text-[10px] text-zinc-400 font-bold uppercase tracking-widest mb-8">
          <Link href="/" className="hover:text-zinc-700 transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link href="/shop" className="hover:text-zinc-700 transition-colors">Shop</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-zinc-700">Shopping Cart</span>
        </div>

        <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mb-2">
          Shopping Cart
        </h1>
        <p className="text-zinc-400 text-sm font-light mb-10">
          {count === 0 ? "Your cart is empty" : `${count} item${count !== 1 ? "s" : ""} in your cart`}
        </p>

        {items.length === 0 ? (
          /* EMPTY CART STATE */
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-24 h-24 rounded-full bg-zinc-100 flex items-center justify-center mb-8 ring-8 ring-zinc-50">
              <ShoppingBag className="w-10 h-10 text-zinc-300" />
            </div>
            <h2 className="text-xl font-bold uppercase tracking-wide mb-3">Your bag is empty</h2>
            <p className="text-zinc-400 text-sm font-light mb-8 max-w-xs">
              Add some premium pieces from our curated collection to get started.
            </p>
            <Link
              href="/shop"
              className="bg-zinc-950 text-white px-10 py-4 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors inline-flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" /> Continue Shopping
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">

            {/* CART ITEMS */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-0 divide-y divide-zinc-100">

              {/* Column headers */}
              <div className="hidden sm:grid grid-cols-12 gap-4 pb-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                <div className="col-span-6">Product</div>
                <div className="col-span-2 text-center">Size</div>
                <div className="col-span-2 text-center">Qty</div>
                <div className="col-span-2 text-right">Total</div>
              </div>

              {items.map((item) => {
                const product = productsMap[item.productId];
                
                const uniqueColors = product
                  ? (Array.from(new Set(product.variants.map((v: any) => v.color))).filter(Boolean) as string[])
                  : [item.color];
                  
                const uniqueSizes = product
                  ? sortSizes(Array.from(new Set(product.variants.map((v: any) => v.size))).filter(Boolean) as string[])
                  : [item.size];
                  
                const uniqueLengths = product
                  ? sortLengths(Array.from(new Set(product.variants.filter((v: any) => v.length).map((v: any) => v.length))).filter(Boolean) as string[])
                  : (item.length ? [item.length] : []);

                return (
                  <div
                    key={item.id}
                    className={`py-5 grid grid-cols-12 gap-4 items-center transition-all duration-300 ${
                      removingId === item.id ? "opacity-0 scale-95" : "opacity-100"
                    }`}
                  >
                    {/* Product Info Col */}
                    <div className="col-span-12 sm:col-span-6 flex gap-4 items-center">
                      {/* Thumbnail (Smaller & Square) */}
                      <div className="w-16 sm:w-20 shrink-0">
                        <Link href={`/product/${item.slug}`}>
                          <div className="relative aspect-square bg-zinc-100 overflow-hidden border border-zinc-100 hover:border-zinc-300 transition-colors">
                            <Image
                              src={item.thumbnail}
                              alt={item.title}
                              fill
                              className="object-cover hover:scale-105 transition-transform duration-500"
                            />
                          </div>
                        </Link>
                      </div>

                      {/* Details */}
                      <div className="flex-1 min-w-0 flex flex-col gap-1">
                        <Link
                          href={`/product/${item.slug}`}
                          className="text-xs sm:text-sm font-bold uppercase tracking-wide text-zinc-900 hover:text-zinc-600 transition-colors line-clamp-1"
                        >
                          {item.title}
                        </Link>
                        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1">
                          {item.color && (
                            <div className="flex items-center gap-1.5">
                              <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Color:</span>
                              <select
                                value={item.color}
                                onChange={(e) => handleUpdateVariant(item.id, e.target.value, item.size, item.length)}
                                className="text-[10px] font-black text-zinc-800 uppercase bg-transparent outline-none cursor-pointer border-b border-dashed border-zinc-300 pb-0 hover:border-zinc-800 transition-colors focus:border-zinc-950"
                              >
                              {uniqueColors.map((color) => (
                                <option key={color} value={color} className="text-zinc-900 bg-white">{color}</option>
                              ))}
                            </select>
                          </div>
                        )}
                        {item.length && item.length !== "" && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Length:</span>
                            <select
                              value={item.length}
                              onChange={(e) => handleUpdateVariant(item.id, item.color, item.size, e.target.value)}
                              className="text-[10px] font-black text-zinc-800 uppercase bg-transparent outline-none cursor-pointer border-b border-dashed border-zinc-300 pb-0.5 hover:border-zinc-800 transition-colors focus:border-zinc-950"
                            >
                              {uniqueLengths.map((len) => (
                                <option key={len} value={len} className="text-zinc-900 bg-white">{len}</option>
                              ))}
                            </select>
                          </div>
                        )}
                      </div>

                      {item.custom && (
                        <div className="mt-2 border-l-2 border-zinc-900 pl-2.5">
                          <p className="text-[10px] font-black uppercase tracking-wider text-zinc-900">
                            Made to measure · {item.custom.templateName}
                            {item.custom.fee > 0 && (
                              <span className="ml-1.5 font-bold text-zinc-500">
                                +{formatPrice(item.custom.fee)}
                              </span>
                            )}
                          </p>
                          <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-500">
                            {summarizeMeasurements(item.custom.values)}
                          </p>
                          {(item.custom.feeBreakdown?.length ?? 0) > 1 && (
                            <p className="mt-0.5 text-[10px] leading-relaxed text-zinc-400">
                              {item.custom.feeBreakdown!
                                .map((line) => `${line.label} +${formatPrice(line.amount)}`)
                                .join(" · ")}
                            </p>
                          )}
                        </div>
                      )}

                      <p className="text-xs font-black text-zinc-950 mt-1.5">
                        {formatPrice(item.price)}
                      </p>
                      {/* Mobile remove */}
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="sm:hidden mt-2 text-[10px] text-red-500 hover:text-red-700 font-bold uppercase tracking-wider flex items-center gap-1 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" /> Remove
                      </button>
                    </div>
                  </div>

                    {/* Size (desktop) */}
                    <div className="hidden sm:flex col-span-2 items-start justify-center pt-1">
                      <div className="relative inline-block bg-white">
                        <select
                          value={item.size}
                          onChange={(e) => handleUpdateVariant(item.id, item.color, e.target.value, item.length)}
                          className="text-xs font-black text-zinc-800 border border-zinc-200 pl-4 pr-9 py-2 uppercase tracking-widest bg-white cursor-pointer hover:border-zinc-400 focus:outline-none focus:border-zinc-950 rounded-sm appearance-none select-none"
                          style={{ minWidth: "72px" }}
                        >
                          {uniqueSizes.map((size) => (
                            <option key={size} value={size} className="text-zinc-900">{size}</option>
                          ))}
                        </select>
                        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2.5 text-zinc-500">
                          <svg className="fill-current h-3.5 w-3.5" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/>
                          </svg>
                        </div>
                      </div>
                    </div>

                    {/* Qty stepper */}
                    <div className="hidden sm:flex col-span-2 items-start justify-center pt-0.5">
                      <div className="flex items-center border border-zinc-200 bg-white">
                        <button
                          onClick={() => handleQtyChange(item.id, item.quantity - 1)}
                          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition-colors"
                          aria-label="Decrease quantity"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-10 text-center text-xs font-bold text-zinc-900">{item.quantity}</span>
                        <button
                          onClick={() => handleQtyChange(item.id, item.quantity + 1)}
                          className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-950 hover:bg-zinc-50 transition-colors"
                          aria-label="Increase quantity"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Line total + remove (desktop) */}
                    <div className="hidden sm:flex col-span-2 flex-col items-end gap-2 pt-0.5">
                      <span className="text-sm font-black text-zinc-950">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                      <button
                        onClick={() => handleRemove(item.id)}
                        className="text-zinc-300 hover:text-red-500 transition-colors"
                        aria-label="Remove item"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Mobile qty stepper row */}
                    <div className="col-span-12 sm:hidden flex items-center justify-between mt-3 pt-3 border-t border-zinc-100">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Size:</span>
                        <select
                          value={item.size}
                          onChange={(e) => handleUpdateVariant(item.id, item.color, e.target.value, item.length)}
                          className="text-[10px] font-black text-zinc-800 uppercase bg-transparent outline-none cursor-pointer border-b border-dashed border-zinc-300 pb-0.5 hover:border-zinc-800 transition-colors focus:border-zinc-950"
                        >
                          {uniqueSizes.map((size) => (
                            <option key={size} value={size} className="text-zinc-900 bg-white">{size}</option>
                          ))}
                        </select>
                      </div>
                      <div className="flex items-center border border-zinc-200 bg-white">
                        <button onClick={() => handleQtyChange(item.id, item.quantity - 1)} className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-950 transition-colors">
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="w-10 text-center text-xs font-bold">{item.quantity}</span>
                        <button onClick={() => handleQtyChange(item.id, item.quantity + 1)} className="w-8 h-8 flex items-center justify-center text-zinc-500 hover:text-zinc-950 transition-colors">
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      <span className="text-sm font-black text-zinc-950">
                        {formatPrice(item.price * item.quantity)}
                      </span>
                    </div>
                  </div>
                );
              })}

              {/* Continue Shopping */}
              <div className="pt-6">
                <Link
                  href="/shop"
                  className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-zinc-500 hover:text-zinc-950 transition-colors"
                >
                  <ArrowLeft className="w-4 h-4" /> Continue Shopping
                </Link>
              </div>
            </div>

            {/* ORDER SUMMARY SIDEBAR */}
            <div className="lg:col-span-5 xl:col-span-4">
              <div className="bg-white border border-zinc-100 p-5 sm:p-6 sticky top-24 space-y-6">
                <h2 className="text-sm font-black uppercase tracking-widest text-zinc-950">Order Summary</h2>

                {/* Promo Code */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2 block">
                    Promo / Gift Code
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-zinc-400" />
                      <input
                        type="text"
                        value={promoCode}
                        onChange={(e) => { setPromoCode(e.target.value); setPromoError(""); }}
                        placeholder="Enter code"
                        className="w-full pl-9 pr-3 py-2.5 text-xs border border-zinc-200 focus:outline-none focus:border-zinc-950 transition-colors uppercase tracking-wider font-bold"
                      />
                      {promoApplied && (
                        <button onClick={removePromo} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-700">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <button
                      onClick={handlePromo}
                      disabled={promoApplied}
                      className="px-4 py-2.5 text-[10px] font-black uppercase tracking-widest bg-zinc-950 text-white hover:bg-zinc-700 disabled:bg-zinc-300 disabled:cursor-not-allowed transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                  {promoApplied && (
                    <p className="text-[10px] text-emerald-600 font-bold mt-1.5 flex items-center gap-1">
                      ✓ {discountPercentage}% discount applied!
                    </p>
                  )}
                  {promoError && (
                    <p className="text-[10px] text-red-500 font-medium mt-1.5">{promoError}</p>
                  )}
                </div>

                {/* Price breakdown */}
                <div className="space-y-3 pt-2 border-t border-zinc-100">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-medium">Subtotal</span>
                    <span className="font-bold text-zinc-700">{formatPrice(subtotal)}</span>
                  </div>
                  {promoApplied && (
                    <div className="flex justify-between items-center text-sm text-emerald-600 font-bold">
                      <span>Discount ({discountPercentage}%)</span>
                      <span>− {formatPrice(discount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-zinc-500 font-medium">Shipping</span>
                    <span className="font-bold text-zinc-700">
                      {shipping === 0 ? "FREE" : formatPrice(shipping)}
                    </span>
                  </div>
                  {cheapestMethod && (
                    <div className="bg-amber-50 text-amber-600 p-3 rounded-lg text-xs font-bold flex items-center justify-center gap-2 text-center">
                      <Truck className="w-4 h-4 shrink-0" />
                      {cheapestMethod.name}
                      {cheapestMethod.deliveryTime ? ` · ${cheapestMethod.deliveryTime}` : ""} — faster
                      options at checkout
                    </div>
                  )}
                </div>

                {/* Total */}
                <div className="flex justify-between items-end border-t border-zinc-100 pt-4">
                  <span className="text-base font-black text-zinc-950 uppercase tracking-widest">Total</span>
                  <span className="text-2xl font-black text-zinc-950">
                    {formatPrice(total)}
                  </span>
                </div>

                {/* Checkout CTA */}
                <button
                  onClick={() => {
                    // Guest checkout allowed — go straight to checkout whether
                    // or not the customer is logged in.
                    router.push("/checkout");
                  }}
                  className="w-full bg-zinc-950 text-white py-4 text-xs font-black tracking-widest uppercase hover:bg-zinc-800 active:scale-[0.99] transition-all flex items-center justify-center gap-2 shadow-lg shadow-zinc-900/20"
                >
                  Proceed to Checkout <ChevronRight className="w-4 h-4" />
                </button>

                {/* Trust badges */}
                <div className="grid grid-cols-3 gap-3 pt-2 border-t border-zinc-100">
                  {[
                    { icon: <Shield className="w-4 h-4" />, label: "Secure" },
                    { icon: <RotateCcw className="w-4 h-4" />, label: "30-Day Returns" },
                    { icon: <Truck className="w-4 h-4" />, label: "Fast Delivery" },
                  ].map((b, i) => (
                    <div key={i} className="flex flex-col items-center gap-1 text-zinc-400">
                      {b.icon}
                      <span className="text-[9px] font-bold uppercase tracking-wider text-center">{b.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      <Footer />

    </div>
  );
}
