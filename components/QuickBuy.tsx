"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Check, Loader2, Shield, Truck } from "lucide-react";
import Header from "@/components/HeaderClient";
import Footer from "@/components/Footer";
import StripeCheckout from "@/components/StripeCheckout";
import SquareCheckout from "@/components/SquareCheckout";
import { useCurrency } from "@/providers/CurrencyProvider";
import { trackPurchase, storeCurrency } from "@/lib/analytics";
import { COUNTRIES } from "@/lib/countries";
import { regionLabelFor } from "@/lib/regions";
import { sortLengths, sortSizes } from "@/lib/variants";
import { useRegions } from "@/lib/useRegions";
import { resolveTax, taxLineLabel, type TaxSettings } from "@/lib/tax";
import Swal from "@/lib/swal";
import {
  activeShippingMethods,
  defaultShippingMethod,
  type ShippingMethod,
} from "@/lib/shipping";

const COUNTRY_METADATA = COUNTRIES.reduce((acc, c) => {
  acc[c.code] = c;
  return acc;
}, {} as Record<string, (typeof COUNTRIES)[0]>);

interface Variant {
  id: string;
  color: string;
  size: string;
  length: string | null;
  stock: number;
  price: number | null;
}

interface QuickBuyProps {
  product: {
    id: string;
    title: string;
    slug: string;
    thumbnail: string;
    basePrice: number;
    discountPrice: number | null;
    images: string[];
    variants: Variant[];
  };
  payments: {
    cod: boolean;
    codCountry: string;
    stripe: boolean;
    bkash: boolean;
    nagad: boolean;
    square: boolean;
  };
  shipping: {
    enabled: boolean;
    methods: ShippingMethod[];
  };
  tax: TaxSettings;
}

const uniq = (values: (string | null)[]) =>
  Array.from(new Set(values.filter((v): v is string => Boolean(v))));

export default function QuickBuy({ product, payments, shipping, tax: taxSettings }: QuickBuyProps) {
  const { formatPrice, selectedCurrency } = useCurrency();

  const colors = useMemo(() => uniq(product.variants.map((v) => v.color)), [product.variants]);
  const [color, setColor] = useState(colors[0] || "");

  // Sizes and lengths narrow to what the chosen colour actually stocks, so the
  // customer cannot assemble a combination that has no variant behind it.
  const sizes = useMemo(
    () => sortSizes(uniq(product.variants.filter((v) => v.color === color).map((v) => v.size))),
    [product.variants, color]
  );
  const [size, setSize] = useState(sizes[0] || "");

  const lengths = useMemo(
    () => sortLengths(uniq(product.variants.filter((v) => v.color === color && v.size === size).map((v) => v.length))),
    [product.variants, color, size]
  );
  const [length, setLength] = useState(lengths[0] || "");

  const variant = product.variants.find(
    (v) => v.color === color && v.size === size && (v.length || "") === (length || "")
  );

  const [quantity, setQuantity] = useState(1);
  const [selectedMethodId, setSelectedMethodId] = useState(
    () => defaultShippingMethod(shipping.methods)?.id ?? ""
  );
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [orderId, setOrderId] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [squareKeys, setSquareKeys] = useState({ appId: "", locationId: "" });

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
    bkashNumber: "",
    nagadNumber: "",
  });

  const set = (key: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }));

  const { regions: countryRegions, loading: regionsLoading } = useRegions(form.country);

  // The server recomputes all of this in /api/checkout — these figures are for
  // display only, and mirror the same rules so the two agree.
  const unitPrice = variant?.price ?? product.discountPrice ?? product.basePrice;
  const subtotal = unitPrice * quantity;
  const shippingOptions = activeShippingMethods(shipping.methods);
  const selectedMethod =
    shippingOptions.find((m) => m.id === selectedMethodId) ?? defaultShippingMethod(shipping.methods);
  const shippingFee = shipping.enabled ? selectedMethod?.price ?? 0 : 0;

  // Destination-based, and after shipping because the fee may itself be taxed.
  const resolvedTax = resolveTax(taxSettings, {
    country: form.country,
    state: form.area,
    taxableAmount: subtotal,
    shippingFee,
  });
  const tax = resolvedTax.amount;
  const total = subtotal + tax + shippingFee;

  // Shaped like a CartItem so StripeCheckout/SquareCheckout and /api/checkout
  // can take it unchanged.
  const items = [
    {
      id: `${product.id}-${color}-${size}-${length}`,
      productId: product.id,
      slug: product.slug,
      title: product.title,
      thumbnail: product.thumbnail,
      color,
      size,
      length,
      price: unitPrice,
      quantity,
    },
  ];

  // Square's keys come from env through /api/settings, so they are only
  // fetched if the customer actually picks that method.
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

  function validate() {
    const next: Record<string, string> = {};
    if (!form.fullName.trim()) next.fullName = "Required";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email)) next.email = "Enter a valid email";
    if (!form.phone.trim()) next.phone = "Required";
    if (!form.address.trim()) next.address = "Required";
    if (!form.city.trim()) next.city = "Required";
    if (!variant) next.variant = "This combination is unavailable";
    else if (variant.stock < quantity) next.variant = `Only ${variant.stock} left`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function placeOrder(paymentIntentId?: string) {
    if (!validate()) return;
    setPlacing(true);
    try {
      const dialCode = COUNTRY_METADATA[form.country]?.dialCode || "";
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: form.fullName,
          email: form.email,
          phone: `${dialCode} ${form.phone}`.trim(),
          address: `${form.address}, ${form.area}, ${form.city} ${form.postalCode}`,
          paymentMethod: form.paymentMethod,
          totalAmount: total,
          tax,
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
          items: items.map((i) => ({
            productId: i.productId,
            color: i.color,
            size: i.size,
            length: i.length,
            price: i.price,
            quantity: i.quantity,
            title: i.title,
          })),
          paymentDetails: {
            bkashNumber: form.bkashNumber,
            nagadNumber: form.nagadNumber,
            cardNumber: form.paymentMethod === "card" ? "Stripe Payment" : "",
            paymentIntentId: paymentIntentId || undefined,
          },
          pointsRedeemed: 0,
        }),
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
        items: items.map((i) => ({
          item_id: i.productId,
          item_name: i.title,
          price: i.price,
          quantity: i.quantity,
          item_variant: [i.color, i.size, i.length].filter(Boolean).join(" / ") || undefined,
        })),
      });

      setOrderId(result.orderId || "");
      setPlaced(true);
    } catch (err: any) {
      Swal.fire({ text: err.message || "Failed to place your order.", confirmButtonColor: "#18181b", icon: "error" });
    } finally {
      setPlacing(false);
    }
  }

  if (placed) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="w-20 h-20 rounded-full bg-zinc-950 flex items-center justify-center ring-8 ring-zinc-100">
          <Check className="w-9 h-9 text-white" />
        </div>
        <div>
          <h1 className="text-3xl font-extrabold uppercase tracking-tight mb-3">Order Confirmed</h1>
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

  const fieldClass = "w-full border border-zinc-200 px-4 py-3 text-sm outline-none focus:border-zinc-950 transition-colors";
  const labelClass = "block text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-2";
  const chip = (active: boolean) =>
    `px-4 py-2 text-xs font-semibold border transition-colors ${
      active ? "border-zinc-950 bg-zinc-950 text-white" : "border-zinc-200 text-zinc-700 hover:border-zinc-400"
    }`;

  const methods = [
    { key: "cod", label: "Cash on Delivery", on: payments.cod },
    { key: "card", label: "Card", on: payments.stripe },
    { key: "bkash", label: "bKash", on: payments.bkash },
    { key: "nagad", label: "Nagad", on: payments.nagad },
    { key: "square", label: "Square", on: payments.square },
  ].filter((m) => m.on);

  return (
    <div className="flex flex-col min-h-screen bg-white text-zinc-950">
      <Header />

      <main className="flex-1 w-full max-w-[1100px] mx-auto px-5 py-8 lg:py-12">
        <h1 className="text-2xl md:text-3xl font-extrabold uppercase tracking-tight mb-6">Complete Your Order</h1>

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8 lg:gap-12">
          {/* LEFT — product choice + details */}
          <div className="space-y-8">
            <section className="flex gap-4">
              <div className="relative w-24 h-32 shrink-0 bg-zinc-100">
                <Image src={product.thumbnail} alt={product.title} fill sizes="96px" className="object-cover" />
              </div>
              <div className="min-w-0">
                <h2 className="text-base font-bold leading-snug">{product.title}</h2>
                <p className="mt-1 text-lg font-black">{formatPrice(unitPrice)}</p>
                {product.discountPrice && product.discountPrice < product.basePrice && (
                  <p className="text-xs text-zinc-400 line-through">{formatPrice(product.basePrice)}</p>
                )}
                <Link href={`/product/${product.slug}`} className="mt-2 inline-block text-[11px] uppercase tracking-widest text-zinc-500 underline">
                  View full details
                </Link>
              </div>
            </section>

            {colors.length > 0 && (
              <section>
                <span className={labelClass}>Colour</span>
                <div className="flex flex-wrap gap-2">
                  {colors.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => {
                        setColor(c);
                        const nextSizes = sortSizes(
                          uniq(product.variants.filter((v) => v.color === c).map((v) => v.size))
                        );
                        setSize(nextSizes[0] || "");
                        const nextLengths = uniq(
                          product.variants.filter((v) => v.color === c && v.size === nextSizes[0]).map((v) => v.length)
                        );
                        setLength(nextLengths[0] || "");
                      }}
                      className={chip(color === c)}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {sizes.length > 0 && (
              <section>
                <span className={labelClass}>Size</span>
                <div className="flex flex-wrap gap-2">
                  {sizes.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => {
                        setSize(s);
                        const nextLengths = uniq(
                          product.variants.filter((v) => v.color === color && v.size === s).map((v) => v.length)
                        );
                        setLength(nextLengths[0] || "");
                      }}
                      className={chip(size === s)}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </section>
            )}

            {lengths.length > 0 && (
              <section>
                <span className={labelClass}>Length</span>
                <div className="flex flex-wrap gap-2">
                  {lengths.map((l) => (
                    <button key={l} type="button" onClick={() => setLength(l)} className={chip(length === l)}>
                      {l}
                    </button>
                  ))}
                </div>
              </section>
            )}

            <section>
              <span className={labelClass}>Quantity</span>
              <div className="flex items-center border border-zinc-200 w-fit">
                <button type="button" onClick={() => setQuantity((q) => Math.max(1, q - 1))} className="px-4 py-2 text-lg">
                  −
                </button>
                <span className="px-5 text-sm font-bold">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(variant?.stock || 99, q + 1))}
                  className="px-4 py-2 text-lg"
                >
                  +
                </button>
              </div>
              {errors.variant && <p className="mt-2 text-xs text-red-600">{errors.variant}</p>}
              {variant && variant.stock > 0 && variant.stock <= 5 && (
                <p className="mt-2 text-xs text-amber-600">Only {variant.stock} left in stock</p>
              )}
            </section>

            <section className="space-y-4 pt-2 border-t border-zinc-100">
              <h3 className="pt-6 text-xs font-black uppercase tracking-widest">Delivery Details</h3>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Full Name</label>
                  <input value={form.fullName} onChange={set("fullName")} className={fieldClass} placeholder="Jane Doe" />
                  {errors.fullName && <p className="mt-1 text-xs text-red-600">{errors.fullName}</p>}
                </div>
                <div>
                  <label className={labelClass}>Email</label>
                  <input value={form.email} onChange={set("email")} className={fieldClass} placeholder="jane@example.com" />
                  {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
                </div>
                <div>
                  <label className={labelClass}>Country</label>
                  <select value={form.country} onChange={set("country")} className={fieldClass}>
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Phone</label>
                  <div className="flex">
                    <span className="flex items-center px-3 border border-r-0 border-zinc-200 bg-zinc-50 text-xs text-zinc-500">
                      {COUNTRY_METADATA[form.country]?.dialCode}
                    </span>
                    <input value={form.phone} onChange={set("phone")} className={fieldClass} placeholder="1712345678" />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-red-600">{errors.phone}</p>}
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>Street Address</label>
                  <input value={form.address} onChange={set("address")} className={fieldClass} placeholder="House, road" />
                  {errors.address && <p className="mt-1 text-xs text-red-600">{errors.address}</p>}
                </div>
                <div>
                  <label className={labelClass}>Area</label>
                  {countryRegions.length > 0 || regionsLoading ? (
                    <select value={form.area} onChange={set("area")} disabled={regionsLoading} className={fieldClass}>
                      <option value="">
                        {regionsLoading ? "Loading…" : `Select ${regionLabelFor(form.country).toLowerCase()}…`}
                      </option>
                      {countryRegions.map((r) => (
                        <option key={r.code} value={r.code}>{r.name}</option>
                      ))}
                    </select>
                  ) : (
                    <input value={form.area} onChange={set("area")} className={fieldClass} placeholder="Optional" />
                  )}
                </div>
                <div>
                  <label className={labelClass}>City</label>
                  <input value={form.city} onChange={set("city")} className={fieldClass} />
                  {errors.city && <p className="mt-1 text-xs text-red-600">{errors.city}</p>}
                </div>
                <div>
                  <label className={labelClass}>Postal Code</label>
                  <input value={form.postalCode} onChange={set("postalCode")} className={fieldClass} />
                </div>
              </div>
            </section>

            <section className="space-y-4 pt-2 border-t border-zinc-100">
              <h3 className="pt-6 text-xs font-black uppercase tracking-widest">Payment</h3>

              <div className="flex flex-wrap gap-2">
                {methods.map((m) => (
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
                <div>
                  <label className={labelClass}>bKash Number</label>
                  <input value={form.bkashNumber} onChange={set("bkashNumber")} className={fieldClass} placeholder="01XXXXXXXXX" />
                </div>
              )}

              {form.paymentMethod === "nagad" && (
                <div>
                  <label className={labelClass}>Nagad Number</label>
                  <input value={form.nagadNumber} onChange={set("nagadNumber")} className={fieldClass} placeholder="01XXXXXXXXX" />
                </div>
              )}
            </section>
          </div>

          {/* RIGHT — summary + submit */}
          <aside className="lg:sticky lg:top-24 h-fit border border-zinc-100 bg-zinc-50 p-6 space-y-4">
            <h3 className="text-xs font-black uppercase tracking-widest">Order Summary</h3>

            {shippingOptions.length > 1 && (
              <div className="space-y-2 border-b border-zinc-200 pb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Shipping Method</p>
                {shippingOptions.map((method) => {
                  const price = shipping.enabled ? method.price : 0;
                  return (
                    <label
                      key={method.id}
                      className={`flex items-start gap-3 p-3 border cursor-pointer transition-all bg-white ${
                        selectedMethod?.id === method.id
                          ? "border-zinc-950"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <input
                        type="radio"
                        name="quickbuy-shipping"
                        checked={selectedMethod?.id === method.id}
                        onChange={() => setSelectedMethodId(method.id)}
                        className="mt-0.5"
                      />
                      <span className="flex-1 min-w-0">
                        <span className="block text-[11px] font-bold uppercase tracking-wide text-zinc-900">
                          {method.name}
                        </span>
                        {method.deliveryTime && (
                          <span className="block text-[10px] text-zinc-400">{method.deliveryTime}</span>
                        )}
                      </span>
                      <span className={`text-[11px] font-black ${price === 0 ? "text-emerald-600" : "text-zinc-950"}`}>
                        {price === 0 ? "FREE" : formatPrice(price)}
                      </span>
                    </label>
                  );
                })}
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-zinc-500">
                <span>
                  Subtotal · {quantity} item{quantity > 1 ? "s" : ""}
                </span>
                <span className="text-zinc-950">{formatPrice(subtotal)}</span>
              </div>
              <div className="flex justify-between text-zinc-500">
                <span>{taxLineLabel(resolvedTax.rate, resolvedTax.label)}</span>
                <span className="text-zinc-950">{formatPrice(tax)}</span>
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
                items={items}
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
                  items={items}
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
                onClick={() => placeOrder()}
                disabled={placing}
                className="w-full bg-zinc-950 text-white py-4 text-xs font-black tracking-widest uppercase hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-wait transition-colors flex items-center justify-center gap-2"
              >
                {placing ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Placing Order…
                  </>
                ) : (
                  <>Place Order · {formatPrice(total)}</>
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
      </main>

      <Footer />
    </div>
  );
}
