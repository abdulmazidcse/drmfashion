"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight, ShoppingBag, Shield, Check, MapPin, CreditCard, Truck, Tag, Loader2 } from "lucide-react";
import { CartItem, getCart, cartTotal, cartCount, clearCart } from "@/lib/cart";
import Header from "@/components/HeaderClient";
import Footer from "@/components/Footer";
import StripeCheckout from "@/components/StripeCheckout";
import SquareCheckout from "@/components/SquareCheckout";
import { useCurrency } from "@/providers/CurrencyProvider";
import Swal from "@/lib/swal";
import { COUNTRIES } from "@/lib/countries";

const COUNTRY_METADATA = COUNTRIES.reduce((acc, c) => {
  acc[c.code] = c;
  return acc;
}, {} as Record<string, typeof COUNTRIES[0]>);

const STEPS = ["Shipping", "Payment", "Confirm"];

export default function CheckoutPage() {
  const router = useRouter();
  const { formatPrice, selectedCurrency, convertPrice, currencies, selectedCountry } = useCurrency();
  const [items, setItems] = useState<CartItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [step, setStep] = useState(0);
  const [placing, setPlacing] = useState(false);
  const [placed, setPlaced] = useState(false);

  // Scroll to top of window on step changes
  useEffect(() => {
    if (mounted) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  }, [step, mounted]);

  // Redirect to account dashboard after order confirmation
  useEffect(() => {
    if (placed) {
      const timer = setTimeout(() => {
        router.push("/account");
      }, 4000); // 4 seconds delay
      return () => clearTimeout(timer);
    }
  }, [placed, router]);

  // Loyalty reward points state hooks
  const [availablePoints, setAvailablePoints] = useState(0);
  const [redeemInput, setRedeemInput] = useState("");
  const [pointsRedeemedApplied, setPointsRedeemedApplied] = useState(false);
  const [pointsRedeemed, setPointsRedeemed] = useState(0);

  const [pointValue, setPointValue] = useState(1);
  const [pointEarnRate, setPointEarnRate] = useState(10);
  const [shippingFee, setShippingFee] = useState(0);
  const [shippingFreeThreshold, setShippingFreeThreshold] = useState(1000);
  const [shippingEnabled, setShippingEnabled] = useState(true);
  const [squareAppId, setSquareAppId] = useState("");
  const [squareLocationId, setSquareLocationId] = useState("");
  
  const [paymentMethods, setPaymentMethods] = useState({
    cod: true,
    card: true,
    bkash: true,
    nagad: true,
    square: true,
  });
  const [paymentCodCountry, setPaymentCodCountry] = useState("");

  const [form, setForm] = useState({
    fullName: "", email: "", phone: "",
    address: "", city: "", area: "", postalCode: "",
    country: "US",
    paymentMethod: "cod",
    cardNumber: "", cardExpiry: "", cardCVC: "",
    bkashNumber: "", nagadNumber: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  // Set default country based on the Store Currency selected country if not logged in
  useEffect(() => {
    if (selectedCountry) {
      const code = COUNTRIES.find(
        (c) => c.name.toLowerCase() === selectedCountry.toLowerCase()
      )?.code;
      if (code) {
        setForm((prev) => {
          // Only update if it is still the default US and the user hasn't typed anything
          if (prev.country === "US" && !prev.fullName && !prev.phone) {
            return { ...prev, country: code };
          }
          return prev;
        });
      }
    }
  }, [selectedCountry]);

  // Sync payment method availability based on active country and payment settings
  useEffect(() => {
    const codEnabledForCountry = paymentMethods.cod && (!paymentCodCountry || form.country === paymentCodCountry);
    const pMethods = {
      ...paymentMethods,
      cod: codEnabledForCountry
    };
    if (form.paymentMethod && !pMethods[form.paymentMethod as keyof typeof pMethods]) {
      const methodEntries = Object.entries(pMethods);
      const firstAvailable = methodEntries.find(([_, enabled]) => enabled)?.[0] || "cod";
      setForm(f => ({ ...f, paymentMethod: firstAvailable }));
    }
  }, [form.country, paymentMethods, paymentCodCountry, form.paymentMethod]);

  const [upsRates, setUpsRates] = useState<any[]>([]);
  const [selectedUpsRate, setSelectedUpsRate] = useState<any | null>(null);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [shippingCarrier, setShippingCarrier] = useState<"Standard" | "UPS">("Standard");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [customerEmail, setCustomerEmail] = useState("");
  const [selectedAddressType, setSelectedAddressType] = useState<"home" | "office" | null>(null);
  const [savedAddresses, setSavedAddresses] = useState<{ home: any; office: any }>({
    home: null,
    office: null,
  });

  const handleSaveAddress = (type: "home" | "office") => {
    if (!customerEmail) return;

    if (!form.fullName || !form.phone || !form.address || !form.city) {
      Swal.fire({
        text: "Please fill out at least Full Name, Phone, Street Address, and City to save.",
        icon: "warning",
        confirmButtonColor: "#18181b",
      });
      return;
    }

    const digits = form.phone.replace(/[^0-9]/g, "");
    if (digits.length < 6 || digits.length > 15 || /[a-zA-Z]/.test(form.phone)) {
      Swal.fire({
        text: "Please enter a valid phone number (between 6 and 15 digits, no letters).",
        icon: "warning",
        confirmButtonColor: "#18181b",
      });
      return;
    }

    const addressToSave = {
      fullName: form.fullName,
      phone: form.phone,
      country: form.country,
      address: form.address,
      area: form.area,
      city: form.city,
      postalCode: form.postalCode,
    };

    const updatedAddresses = {
      ...savedAddresses,
      [type]: addressToSave,
    };

    localStorage.setItem(`ag_addresses_${customerEmail}`, JSON.stringify(updatedAddresses));
    setSavedAddresses(updatedAddresses);
    setSelectedAddressType(type);

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `Address saved as ${type === "home" ? "Home" : "Office"}!`,
      showConfirmButton: false,
      timer: 2000,
    });
  };

  const handleSelectSavedAddress = (type: "home" | "office") => {
    const selected = savedAddresses[type];
    if (!selected) {
      Swal.fire({
        text: `You don't have a saved ${type === "home" ? "Home" : "Office"} address yet. Please fill the form and click "Save as ${type === "home" ? "Home" : "Office"}" below.`,
        icon: "info",
        confirmButtonColor: "#18181b",
      });
      return;
    }

    setForm((prev) => ({
      ...prev,
      fullName: selected.fullName || prev.fullName,
      phone: selected.phone || prev.phone,
      country: selected.country || prev.country,
      address: selected.address || prev.address,
      area: selected.area || prev.area,
      city: selected.city || prev.city,
      postalCode: selected.postalCode || prev.postalCode,
    }));

    setSelectedAddressType(type);

    Swal.fire({
      toast: true,
      position: "top-end",
      icon: "success",
      title: `Loaded ${type === "home" ? "Home" : "Office"} address!`,
      showConfirmButton: false,
      timer: 1500,
    });
  };

  const detectCountryFromPhone = (val: string) => {
    let cleaned = val.trim();
    if (cleaned.startsWith("00")) {
      cleaned = "+" + cleaned.slice(2);
    }

    // 1. Check if starts with "+" (international format)
    if (cleaned.startsWith("+")) {
      const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
      for (const c of sortedCountries) {
        if (cleaned.startsWith(c.dialCode)) {
          const remainingPhone = cleaned.slice(c.dialCode.length).trim();
          return { country: c.code, phone: remainingPhone };
        }
      }
    }

    // 2. Check if starts with dial code without the "+" (e.g. "88017...", "91987...")
    const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    for (const c of sortedCountries) {
      const dialWithoutPlus = c.dialCode.replace("+", "");
      if (cleaned.startsWith(dialWithoutPlus)) {
        // For US/CA, dialCode is "+1". Avoid matching single "1" unless it's followed by a 10 digit number.
        const minLength = dialWithoutPlus.length + (c.code === "US" || c.code === "CA" ? 10 : 8);
        if (cleaned.length >= minLength) {
          const remainingPhone = cleaned.slice(dialWithoutPlus.length).trim();
          return { country: c.code, phone: remainingPhone };
        }
      }
    }

    // 3. Local prefix matching (does not strip the prefix from the phone number)
    // Bangladesh (BD): starts with 013, 014, 015, 016, 017, 018, 019
    if (/^(013|014|015|016|017|018|019|011|012)/.test(cleaned)) {
      return { country: "BD", phone: val };
    }

    // Pakistan (PK): starts with 030, 031, 032, 033, 034, 035, 036
    if (/^(030|031|032|033|034|035|036)/.test(cleaned)) {
      return { country: "PK", phone: val };
    }

    // United Kingdom (GB): starts with 07 followed by digit (typically mobile)
    if (/^07\d/.test(cleaned)) {
      return { country: "GB", phone: val };
    }

    return null;
  };

  const fetchShippingRates = async (currentForm: typeof form) => {
    setFetchingRates(true);
    try {
      const totalWeight = items.reduce((acc, item) => acc + (item.quantity * 1.5), 0);
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: currentForm.city,
          postalCode: currentForm.postalCode || "10001",
          countryCode: currentForm.country,
          addressLine: currentForm.address,
          totalWeight,
        }),
      });

      if (!res.ok) throw new Error("Failed to fetch rates");
      const data = await res.json();
      if (data.success && data.rates) {
        const usdCurrency = currencies?.find((c) => c.code === "USD");
        const usdToBaseFactor = usdCurrency && usdCurrency.rate > 0 ? 1.0 / usdCurrency.rate : 117.0;

        const convertedRates = data.rates.map((rate: any) => {
          const convertedRate = rate.currency === "USD" ? rate.rate * usdToBaseFactor : rate.rate;
          return {
            ...rate,
            rate: convertedRate,
          };
        });

        setUpsRates(convertedRates);
        if (convertedRates.length > 0) {
          setSelectedUpsRate(convertedRates[0]);
          setShippingCarrier("UPS");
        }
      }
    } catch (err) {
      console.error(err);
      Swal.fire({
        text: "Could not fetch shipping rates from UPS. Falling back to standard shipping.",
        icon: "warning",
        confirmButtonColor: "#18181b",
      });
      setShippingCarrier("Standard");
    } finally {
      setFetchingRates(false);
    }
  };

  useEffect(() => {
    setItems(getCart());
    const savedPromo = localStorage.getItem("ag_promo");
    if (savedPromo) {
      try {
        const { code, percentage } = JSON.parse(savedPromo);
        if (code && percentage) {
          setPromoCode(code);
          setDiscountPercentage(percentage);
        }
      } catch (e) {}
    }
    
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (data) {
          if (data.reward_point_value) setPointValue(Number(data.reward_point_value));
          if (data.reward_point_earn_rate) setPointEarnRate(Number(data.reward_point_earn_rate));

          if (data.payment_cod_country !== undefined) {
            setPaymentCodCountry(data.payment_cod_country);
          }

          const pMethods = {
            cod: data.payment_cod_enabled !== "false",
            card: data.payment_stripe_enabled !== "false",
            bkash: data.payment_bkash_enabled !== "false",
            nagad: data.payment_nagad_enabled !== "false",
            square: data.payment_square_enabled !== "false",
          };
          setPaymentMethods(pMethods);

          // If current selected method is disabled, select the first enabled one
          const methodEntries = Object.entries(pMethods);
          const firstAvailable = methodEntries.find(([_, enabled]) => enabled)?.[0] || "cod";
          setForm(f => ({ ...f, paymentMethod: pMethods[f.paymentMethod as keyof typeof pMethods] ? f.paymentMethod : firstAvailable }));

          // Shipping settings are now in the same public API call
          const enabled = data.shipping_enabled !== "false";
          const flatRate = Number(data.shipping_flat_rate || 10);
          const freeThreshold = Number(data.shipping_free_threshold || 150);
          setShippingEnabled(enabled);
          setShippingFreeThreshold(freeThreshold);
          if (enabled) setShippingFee(flatRate);

          if (data.square_app_id) setSquareAppId(data.square_app_id);
          if (data.square_location_id) setSquareLocationId(data.square_location_id);
        }
      })
      .catch((err) => console.error("Failed to load settings", err));

    const savedSession = localStorage.getItem("ag_customer_session");
    let hasSession = false;
    if (savedSession) {
      try {
        const parsed = JSON.parse(savedSession);
        if (parsed && parsed.email) {
          hasSession = true;
        }
      } catch (e) {}
    }

    // Guests are allowed to check out without logging in. Only prefill saved
    // details (name/phone/address/points) when a customer session exists.
    if (hasSession) try {
      const parsedUser = JSON.parse(savedSession!);
      setIsLoggedIn(true);
      setCustomerEmail(parsedUser.email);

      // Load saved addresses from localStorage
      const localSaved = localStorage.getItem(`ag_addresses_${parsedUser.email}`);
      let loadedHome = null;
      let loadedOffice = null;
      if (localSaved) {
        try {
          const parsedAddr = JSON.parse(localSaved);
          loadedHome = parsedAddr.home || null;
          loadedOffice = parsedAddr.office || null;
          setSavedAddresses({ home: loadedHome, office: loadedOffice });
        } catch (e) {}
      }

      fetch(`/api/customer/account?email=${encodeURIComponent(parsedUser.email)}`)
        .then((res) => res.json())
        .then((data) => {
          if (data && data.found) {
            const user = data.user;
            const orders = data.orders || [];

            let fullName = user.name || "";
            let email = user.email || "";
            let phone = user.phone || "";
            let country = "US";
            let address = "";
            let area = "";
            let city = "";
            let postalCode = "";

            // If they have a saved Home address, default to it
            // If they have a saved Home address, default to it
            if (loadedHome) {
              fullName = loadedHome.fullName || fullName;
              phone = loadedHome.phone || phone;
              country = loadedHome.country || country;
              address = loadedHome.address || address;
              area = loadedHome.area || area;
              city = loadedHome.city || city;
              postalCode = loadedHome.postalCode || postalCode;
              setSelectedAddressType("home");
            } else if (loadedOffice) {
              // Otherwise fallback to Office address if exists
              // Otherwise fallback to Office address if exists
              fullName = loadedOffice.fullName || fullName;
              phone = loadedOffice.phone || phone;
              country = loadedOffice.country || country;
              address = loadedOffice.address || address;
              area = loadedOffice.area || area;
              city = loadedOffice.city || city;
              postalCode = loadedOffice.postalCode || postalCode;
              setSelectedAddressType("office");
            } else if (orders.length > 0) {
              // Otherwise fallback to last order
              const lastOrder = orders[0];
              
              // Parse shippingAddress
              const addrStr = lastOrder.shippingAddress || "";
              const addrParts = addrStr.split(",").map((s: string) => s.trim());
              
              if (addrParts.length >= 3) {
                const cityAndPostalCode = addrParts[addrParts.length - 1];
                const lastSpaceIndex = cityAndPostalCode.lastIndexOf(" ");
                if (lastSpaceIndex !== -1) {
                  city = cityAndPostalCode.substring(0, lastSpaceIndex).trim();
                  postalCode = cityAndPostalCode.substring(lastSpaceIndex + 1).trim();
                } else {
                  city = cityAndPostalCode;
                }
                area = addrParts[addrParts.length - 2];
                address = addrParts.slice(0, addrParts.length - 2).join(", ");
              } else {
                address = addrStr;
              }

              // Parse shippingPhone
              const phoneStr = lastOrder.shippingPhone || "";
              const phoneParts = phoneStr.split(" ");
              if (phoneParts.length >= 2) {
                const dialCode = phoneParts[0];
                const matchedCountry = COUNTRIES.find((c) => c.dialCode === dialCode);
                if (matchedCountry) {
                  country = matchedCountry.code;
                  phone = phoneParts.slice(1).join(" ");
                } else {
                  phone = phoneStr;
                }
              } else {
                phone = phoneStr;
              }
            } else {
              // If no previous orders, use user profile phone (try to parse country if it contains a dial code)
              const phoneParts = phone.split(" ");
              if (phoneParts.length >= 2) {
                const dialCode = phoneParts[0];
                const matchedCountry = COUNTRIES.find((c) => c.dialCode === dialCode);
                if (matchedCountry) {
                  country = matchedCountry.code;
                  phone = phoneParts.slice(1).join(" ");
                }
              }
            }

            setForm((prev) => ({
              ...prev,
              fullName: fullName || prev.fullName,
              email: email || prev.email,
              phone: phone || prev.phone,
              country: country || prev.country,
              address: address || prev.address,
              area: area || prev.area,
              city: city || prev.city,
              postalCode: postalCode || prev.postalCode,
            }));
          }
        })
        .catch((err) => console.error("Failed to load customer profile details:", err));
    } catch (e) {
      console.error("Failed to parse customer session:", e);
    }

    setMounted(true);
  }, []);

  const subtotal = cartTotal(items);
  const discountAmount = Math.round(subtotal * (discountPercentage / 100));
  const pointsDiscount = pointsRedeemedApplied ? pointsRedeemed * pointValue : 0;
  const preTaxAmount = Math.max(0, subtotal - discountAmount - pointsDiscount);
  const tax = preTaxAmount * 0.05; // 5% Standard Tax

  const effectiveShippingFee = shippingEnabled
    ? (shippingFreeThreshold > 0 && (subtotal - discountAmount) >= shippingFreeThreshold ? 0 : shippingFee)
    : 0;
  const shipping = shippingCarrier === "UPS" && selectedUpsRate
    ? selectedUpsRate.rate
    : effectiveShippingFee;
  const total = preTaxAmount + tax + shipping;
  const count = cartCount(items);

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const handlePlaceOrder = async (paymentIntentId?: string) => {
    setPlacing(true);
    try {
      const payload = {
        fullName: form.fullName,
        email: form.email,
        phone: `${COUNTRY_METADATA[form.country as keyof typeof COUNTRY_METADATA]?.dialCode || ""} ${form.phone}`.trim(),
        address: `${form.address}, ${form.area}, ${form.city} ${form.postalCode}`,
        paymentMethod: form.paymentMethod,
        totalAmount: total,
        tax: tax,
        shipping: shipping,
        shippingCarrier: shippingCarrier,
        shippingMethod: shippingCarrier === "UPS" && selectedUpsRate ? selectedUpsRate.serviceName : "Standard Shipping",
        currencyCode: selectedCurrency?.code || "USD",
        currencySymbol: selectedCurrency?.symbol || "$",
        exchangeRate: selectedCurrency?.rate || 1.0,
        shippingFee: shipping,
        promoCode: promoCode || undefined,
        items: items.map((item) => ({
          productId: item.productId,
          color: item.color,
          size: item.size,
          length: item.length,
          price: item.price,
          quantity: item.quantity,
          title: item.title,
          // Raw measurements only — the server recomputes the tailoring fee.
          custom: item.custom ? { values: item.custom.values } : undefined,
        })),
        paymentDetails: {
          bkashNumber: form.bkashNumber,
          nagadNumber: form.nagadNumber,
          cardNumber: form.paymentMethod === "card" ? "Stripe Payment" : "",
          paymentIntentId: paymentIntentId || undefined,
        },
        pointsRedeemed: pointsRedeemedApplied ? pointsRedeemed : 0,
      };

      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to place order");
      }

      clearCart();
      setPlaced(true);
    } catch (err: any) {
      console.error(err);
      Swal.fire({ text: err.message || "Failed to place your order. Please try again.", confirmButtonColor: "#18181b", icon: "error" });
    } finally {
      setPlacing(false);
    }
  };


  if (!mounted) {
    return <div className="min-h-screen flex items-center justify-center"><div className="w-8 h-8 border-2 border-line border-t-brand-600 rounded-full animate-spin" /></div>;
  }

  if (items.length === 0 && !placed) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-6 px-6 text-center">
        <ShoppingBag className="w-14 h-14 text-faint" />
        <h2 className="text-[28px] font-extrabold">Your cart is empty</h2>
        <Link href="/shop" className="bg-brand-600 rounded-full text-white px-10 py-4 text-xs font-bold tracking-[0.14em] uppercase hover:bg-brand-700 transition-colors">
          Shop Now
        </Link>
      </div>
    );
  }

  // ORDER PLACED SUCCESS
  if (placed) {
    return (
      <div className="min-h-screen bg-cream flex flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-brand-600 flex items-center justify-center ring-8 ring-brand-50 animate-bounce">
          <Check className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-[32px] sm:text-[40px] font-extrabold mb-3">Order confirmed</h1>
          <p className="text-soft text-[15px] leading-relaxed max-w-md mx-auto">
            Thank you, <strong className="text-soft">{form.fullName || "valued customer"}</strong>! Your order has been placed successfully.
            You'll receive a confirmation at <strong className="text-soft">{form.email || "your email"}</strong>.
          </p>
        </div>
        <div className="sg-card sg-raise px-8 py-6 max-w-sm w-full">
          <div className="flex justify-between text-xs mb-2 text-soft"><span>Order Total</span><span className="font-extrabold text-foreground">{formatPrice(total)}</span></div>
          <div className="flex justify-between text-xs text-soft"><span>Payment</span><span className="font-bold text-soft uppercase">{form.paymentMethod === "cod" ? "Cash on Delivery" : form.paymentMethod === "card" ? "Credit / Debit Card" : form.paymentMethod === "square" ? "Square" : form.paymentMethod}</span></div>
        </div>
        <div className="flex gap-4">
          <Link href="/account" className="sg-btn sg-btn-ghost">Go to Account</Link>
          <Link href="/shop" className="bg-brand-600 rounded-full text-white px-8 py-3 text-xs font-bold tracking-[0.14em] uppercase hover:bg-brand-700 transition-colors">Continue Shopping</Link>
        </div>
        <p className="text-[13px] text-faint animate-pulse">Redirecting to your account in 4 seconds…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-cream text-foreground font-sans antialiased">

      <Header />

      {/* STEPPER */}
      <div className="bg-surface border-b border-line">
        <div className="max-w-[1200px] mx-auto px-6 py-5 flex items-center justify-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2.5 text-[13px] font-bold transition-colors ${i === step ? "text-foreground" : i < step ? "text-soft cursor-pointer hover:text-foreground" : "text-faint cursor-default"}`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-extrabold border-2 transition-all ${i === step ? "bg-brand-600 text-white border-brand-600" : i < step ? "bg-white text-brand-700 border-brand-600" : "bg-white text-faint border-line"}`}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className="hidden sm:block">{s}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`w-12 sm:w-24 h-px mx-3 transition-colors ${i < step ? "bg-brand-600" : "bg-line"}`} />}
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-[1200px] mx-auto px-5 sm:px-7 py-9 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

          {/* LEFT: FORM STEPS */}
          <div className="lg:col-span-7">

            {/* STEP 0: SHIPPING */}
            {step === 0 && (
              <div className="sg-card sg-raise p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-faint" />
                  <h2 className="text-[18px] font-extrabold">Shipping Information</h2>
                </div>

                {/* Home/Office Address Selector */}
                {isLoggedIn && (
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-line">
                    <button
                      type="button"
                      onClick={() => handleSelectSavedAddress("home")}
                      className={`flex flex-col items-start p-4 border rounded-sg text-left transition-all ${
                        selectedAddressType === "home"
                          ? "border-brand-600 bg-brand-50"
                          : "border-line hover:border-brand-300"
                      }`}
                    >
                      <span className="text-[14px] font-bold flex items-center gap-1.5 mb-1 text-foreground">
                        🏠 Home Address
                      </span>
                      <span className="text-[13px] text-soft line-clamp-2">
                        {savedAddresses.home
                          ? `${savedAddresses.home.address}, ${savedAddresses.home.city}`
                          : "No address saved yet"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSavedAddress("office")}
                      className={`flex flex-col items-start p-4 border rounded-sg text-left transition-all ${
                        selectedAddressType === "office"
                          ? "border-brand-600 bg-brand-50"
                          : "border-line hover:border-brand-300"
                      }`}
                    >
                      <span className="text-[14px] font-bold flex items-center gap-1.5 mb-1 text-foreground">
                        🏢 Office Address
                      </span>
                      <span className="text-[13px] text-soft line-clamp-2">
                        {savedAddresses.office
                          ? `${savedAddresses.office.address}, ${savedAddresses.office.city}`
                          : "No address saved yet"}
                      </span>
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {([
                    { label: "Full Name *", key: "fullName", type: "text", placeholder: "John Doe", colSpan: true },
                    { label: "Email Address *", key: "email", type: "email", placeholder: "you@example.com", colSpan: false },
                    { label: "Phone Number *", key: "phone", type: "tel", placeholder: COUNTRY_METADATA[form.country as keyof typeof COUNTRY_METADATA]?.phonePlaceholder || "+1 202-555-0143", colSpan: false },
                    { label: "Street Address *", key: "address", type: "text", placeholder: "123 Main St, Apt 4B", colSpan: true },
                    { label: "Country *", key: "country", type: "select", placeholder: "", colSpan: false },
                    { label: "City *", key: "city", type: "text", placeholder: "New York", colSpan: false },
                    { label: "State / Province / Region *", key: "area", type: "text", placeholder: "NY", colSpan: false },
                    { label: "Postal Code *", key: "postalCode", type: "text", placeholder: "10001", colSpan: false },
                  ] as { label: string; key: keyof typeof form; type: string; placeholder: string; colSpan: boolean }[]).map((f) => (
                    <div key={f.key} className={f.colSpan ? "sm:col-span-2" : ""}>
                      <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-soft mb-1.5 block">{f.label}</label>
                      {f.type === "select" ? (
                        <select
                          value={form[f.key]}
                          onChange={(e) => {
                            const newCountry = e.target.value;
                            setForm((prev) => ({
                              ...prev,
                              country: newCountry
                            }));
                            if (errors[f.key]) setErrors((errs) => ({ ...errs, [f.key]: "" }));
                          }}
                          className={`sg-input sg-input-box ${errors[f.key] ? "!border-red-500" : ""}`}
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : f.key === "phone" ? (
                        <div className="flex items-stretch border border-line bg-cream focus-within:bg-white focus-within:border-brand-600 focus-within:ring-1 focus-within:ring-aqua-400 transition-all">
                          {/* Flag Dropdown/Selector on the left */}
                          <div className="relative flex items-center bg-cream border-r border-line px-3 cursor-pointer hover:bg-line transition-colors">
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
                            <span className="text-xs font-bold text-soft mr-1.5">
                              {COUNTRY_METADATA[form.country as keyof typeof COUNTRY_METADATA]?.dialCode}
                            </span>
                            <span className="text-[7px] text-faint">▼</span>
                            {/* Invisible select to change country */}
                            <select
                              value={form.country}
                              onChange={(e) => {
                                const newCountry = e.target.value;
                                setForm((prev) => ({
                                  ...prev,
                                  country: newCountry
                                }));
                                if (errors.country) setErrors((errs) => ({ ...errs, country: "" }));
                              }}
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
                            type="tel"
                            value={form.phone}
                            onChange={(e) => {
                              const val = e.target.value;
                              const detected = detectCountryFromPhone(val);
                              if (detected) {
                                setForm((prev) => ({
                                  ...prev,
                                  country: detected.country,
                                  phone: detected.phone,
                                }));
                              } else {
                                setForm((prev) => ({ ...prev, phone: val }));
                              }
                              if (errors.phone) setErrors((errs) => ({ ...errs, phone: "" }));
                            }}
                            placeholder={f.placeholder}
                            className="w-full px-4 py-3 text-[15px] bg-transparent focus:outline-none"
                          />
                        </div>
                      ) : (
                        <input
                          type={f.type}
                          value={form[f.key]}
                          onChange={(e) => {
                            set(f.key)(e);
                            if (errors[f.key]) setErrors((errs) => ({ ...errs, [f.key]: "" }));
                          }}
                          placeholder={f.placeholder}
                          className={`w-full px-4 py-2 text-sm border bg-cream focus:bg-white focus:outline-none transition-all ${
                            errors[f.key] 
                              ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
                              : "border-line focus:border-aqua-400 focus:ring-0"
                          }`}
                        />
                      )}
                      {errors[f.key] && (
                        <p className="text-red-500 text-[12px] font-semibold mt-1.5">{errors[f.key]}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Save Address Actions */}
                {isLoggedIn && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 text-xs">
                    <span className="text-soft text-[13px] font-semibold">Save current details as:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveAddress("home")}
                        className="border border-line hover:border-brand-400 px-3 py-1.5 font-bold uppercase text-[9px] tracking-wider transition-all rounded-none"
                      >
                        💾 Save as Home
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveAddress("office")}
                        className="border border-line hover:border-brand-400 px-3 py-1.5 font-bold uppercase text-[9px] tracking-wider transition-all rounded-none"
                      >
                        💾 Save as Office
                      </button>
                    </div>
                  </div>
                )}

                {/* Shipping methods selector */}
                {(upsRates.length > 0 || fetchingRates) && (
                  <div className="pt-4 border-t border-line space-y-3">
                    <h3 className="text-[12.5px] font-extrabold uppercase tracking-[0.12em] text-foreground">Select Shipping Method</h3>
                    {fetchingRates ? (
                      <div className="py-4 text-center text-xs text-faint flex items-center justify-center gap-2">
                        <div className="w-4 h-4 border-2 border-line border-t-brand-600 rounded-full animate-spin" />
                        Fetching live UPS rates...
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {/* Standard Option */}
                        <label
                          className={`flex items-start gap-4 p-4 border cursor-pointer transition-all ${
                            shippingCarrier === "Standard"
                              ? "border-brand-600 bg-brand-50"
                              : "border-line hover:border-brand-300"
                          }`}
                        >
                          <input
                            type="radio"
                            name="shippingMethod"
                            checked={shippingCarrier === "Standard"}
                            onChange={() => {
                              setShippingCarrier("Standard");
                              setSelectedUpsRate(null);
                            }}
                            className="mt-0.5"
                          />
                          <div className="flex-1">
                            <p className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                              Standard Shipping
                            </p>
                            <p className="text-[10px] text-faint font-light mt-0.5">
                              Deliver in 3-7 business days
                            </p>
                          </div>
                          <span className="text-xs font-extrabold text-foreground">
                            {effectiveShippingFee === 0 ? "FREE" : formatPrice(effectiveShippingFee)}
                          </span>
                        </label>

                        {/* UPS Options */}
                        {upsRates.map((rate) => (
                          <label
                            key={rate.serviceCode}
                            className={`flex items-start gap-4 p-4 border cursor-pointer transition-all ${
                              shippingCarrier === "UPS" && selectedUpsRate?.serviceCode === rate.serviceCode
                                ? "border-brand-600 bg-cream"
                                : "border-line hover:border-brand-300"
                            }`}
                          >
                            <input
                              type="radio"
                              name="shippingMethod"
                              checked={shippingCarrier === "UPS" && selectedUpsRate?.serviceCode === rate.serviceCode}
                              onChange={() => {
                                setShippingCarrier("UPS");
                                setSelectedUpsRate(rate);
                              }}
                              className="mt-0.5"
                            />
                            <div className="flex-1">
                              <p className="text-xs font-extrabold uppercase tracking-wider text-foreground">
                                {rate.serviceName}
                              </p>
                              {rate.daysToDelivery && (
                                <p className="text-[10px] text-faint font-light mt-0.5">
                                  Estimated delivery: {rate.daysToDelivery}
                                </p>
                              )}
                            </div>
                            <span className="text-xs font-extrabold text-foreground">
                              {formatPrice(rate.rate)}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <button
                  onClick={async () => {
                    const newErrors: Record<string, string> = {};
                    if (!form.fullName) newErrors.fullName = "Full Name is required";
                    if (!form.email) newErrors.email = "Email Address is required";
                    if (!form.phone) {
                      newErrors.phone = "Phone Number is required";
                    } else {
                      const digits = form.phone.replace(/[^0-9]/g, "");
                      if (digits.length < 6 || digits.length > 15) {
                        newErrors.phone = "Phone number must be between 6 and 15 digits";
                      } else if (/[a-zA-Z]/.test(form.phone)) {
                        newErrors.phone = "Phone number can only contain digits, spaces, hyphens, or parentheses";
                      }
                    }
                    if (!form.address) newErrors.address = "Street Address is required";
                    if (!form.city) newErrors.city = "City is required";
                    if (!form.area) newErrors.area = "State / Province / Region is required";
                    if (!form.postalCode) newErrors.postalCode = "Postal Code is required";

                    setErrors(newErrors);

                    if (Object.keys(newErrors).length > 0) {
                      return;
                    }

                    if (upsRates.length === 0) {
                      await fetchShippingRates(form);
                      return;
                    }

                    // Fetch reward points balance for returning customer
                    try {
                      const res = await fetch(`/api/customer/reward-points?email=${encodeURIComponent(form.email)}`);
                      if (res.ok) {
                        const data = await res.json();
                        setAvailablePoints(data.rewardPoints || 0);
                      }
                    } catch (err) {
                      console.error("Error fetching reward points:", err);
                    }

                    setStep(1);
                  }}
                  disabled={fetchingRates}
                  className="sg-btn sg-btn-primary w-full !py-[18px] !text-[14px]"
                >
                  {fetchingRates ? (
                    <>Calculating rates...</>
                  ) : upsRates.length === 0 ? (
                    <>Calculate Shipping <ChevronRight className="w-4 h-4" /></>
                  ) : (
                    <>Continue to Payment <ChevronRight className="w-4 h-4" /></>
                  )}
                </button>
              </div>
            )}

            {/* STEP 1: PAYMENT */}
            {step === 1 && (
              <div className="sg-card sg-raise p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="w-5 h-5 text-faint" />
                  <h2 className="text-[18px] font-extrabold">Payment Method</h2>
                </div>

                {/* Payment options */}
                {[
                  { value: "cod", label: "Cash on Delivery", desc: "Pay when your order arrives", enabled: paymentMethods.cod && (!paymentCodCountry || form.country === paymentCodCountry) },
                  { value: "card", label: "Credit / Debit Card (Stripe)", desc: "Visa, Mastercard, Amex", enabled: paymentMethods.card },
                  { value: "square", label: "Square", desc: "Pay securely with Square", enabled: paymentMethods.square },
                  { value: "bkash", label: "bKash", desc: "Send to merchant number", enabled: paymentMethods.bkash },
                  { value: "nagad", label: "Nagad", desc: "Pay via Nagad account", enabled: paymentMethods.nagad },
                ].filter(opt => opt.enabled).map((opt) => (
                  <label
                    key={opt.value}
                    className={`flex items-start gap-4 p-4 border-2 cursor-pointer transition-all ${form.paymentMethod === opt.value ? "border-brand-600 bg-cream" : "border-line hover:border-brand-300"}`}
                  >
                    <input type="radio" name="paymentMethod" value={opt.value} checked={form.paymentMethod === opt.value} onChange={set("paymentMethod")} className="mt-0.5" />
                    <div>
                      <p className="text-xs font-extrabold uppercase tracking-wider text-foreground">{opt.label}</p>
                      <p className="text-[10px] text-faint font-light mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}

                {/* Card fields */}
                {form.paymentMethod === "card" && (
                  <div className="pt-2 text-xs text-soft">
                    <p>You will enter your card details securely via Stripe in the next step.</p>
                  </div>
                )}

                {form.paymentMethod === "bkash" && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-soft mb-1.5 block">bKash Number *</label>
                    <input 
                      type="tel" 
                      value={form.bkashNumber} 
                      onChange={(e) => {
                        set("bkashNumber")(e);
                        if (errors.bkashNumber) setErrors((errs) => ({ ...errs, bkashNumber: "" }));
                      }} 
                      placeholder="+880 1XXXXXXXXX" 
                      className={`w-full px-4 py-2 text-sm border bg-cream focus:bg-white focus:outline-none transition-all ${
                        errors.bkashNumber 
                          ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
                          : "border-line focus:border-aqua-400 focus:ring-0"
                      }`}
                    />
                    {errors.bkashNumber && (
                      <p className="text-red-500 text-[10px] mt-1 uppercase font-bold tracking-wider">{errors.bkashNumber}</p>
                    )}
                  </div>
                )}

                {form.paymentMethod === "nagad" && (
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-[0.14em] text-soft mb-1.5 block">Nagad Number *</label>
                    <input 
                      type="tel" 
                      value={form.nagadNumber} 
                      onChange={(e) => {
                        set("nagadNumber")(e);
                        if (errors.nagadNumber) setErrors((errs) => ({ ...errs, nagadNumber: "" }));
                      }} 
                      placeholder="+880 1XXXXXXXXX" 
                      className={`w-full px-4 py-2 text-sm border bg-cream focus:bg-white focus:outline-none transition-all ${
                        errors.nagadNumber 
                          ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
                          : "border-line focus:border-aqua-400 focus:ring-0"
                      }`}
                    />
                    {errors.nagadNumber && (
                      <p className="text-red-500 text-[10px] mt-1 uppercase font-bold tracking-wider">{errors.nagadNumber}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="flex-1 border border-line py-4 text-xs font-bold tracking-[0.14em] uppercase hover:bg-cream transition-colors">
                    Back
                  </button>
                  <button onClick={() => {
                    const newErrors: Record<string, string> = {};
                    if (form.paymentMethod === "bkash" && !form.bkashNumber) newErrors.bkashNumber = "bKash Number is required";
                    if (form.paymentMethod === "nagad" && !form.nagadNumber) newErrors.nagadNumber = "Nagad Number is required";
                    
                    setErrors(newErrors);
                    if (Object.keys(newErrors).length > 0) return;

                    setStep(2);
                  }} className="sg-btn sg-btn-primary flex-[2] !py-[18px] !text-[14px]">
                    Review Order <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CONFIRM */}
            {step === 2 && (
              <div className="sg-card sg-raise p-6 sm:p-8 space-y-6">
                <h2 className="text-sm font-extrabold uppercase tracking-[0.14em] flex items-center gap-2">
                  <Truck className="w-5 h-5 text-faint" /> Review & Confirm
                </h2>

                {/* Shipping summary */}
                <div className="bg-cream p-4 space-y-1">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-faint mb-2">Shipping To</p>
                  <p className="text-sm font-bold text-foreground">{form.fullName}</p>
                  <p className="text-xs text-soft">{form.address}, {form.area}, {form.city} {form.postalCode}</p>
                  <p className="text-xs text-soft">{form.phone} · {form.email}</p>
                  <div className="pt-2 border-t border-line mt-2">
                    <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-faint">Shipping Method</p>
                    <p className="text-xs font-bold text-foreground mt-0.5">
                      {shippingCarrier === "UPS" && selectedUpsRate ? selectedUpsRate.serviceName : "Standard Shipping"} (
                      {shipping === 0 ? "FREE" : formatPrice(shipping)})
                    </p>
                  </div>
                </div>

                {/* Payment summary */}
                <div className="bg-cream p-4">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-faint mb-2">Payment Method</p>
                  <p className="text-sm font-bold text-foreground">
                    {form.paymentMethod === "cod" ? "Cash on Delivery" : form.paymentMethod === "card" ? "Credit/Debit Card (Stripe)" : form.paymentMethod === "square" ? "Square Payment" : form.paymentMethod === "bkash" ? `bKash — ${form.bkashNumber}` : `Nagad — ${form.nagadNumber}`}
                  </p>
                </div>

                {/* Items list */}
                <div className="space-y-3">
                  <p className="text-[11px] font-extrabold uppercase tracking-[0.14em] text-faint">Items ({count})</p>
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 items-center">
                      <div className="relative w-12 h-16 bg-cream border border-line flex-shrink-0">
                        <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-foreground line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-faint">{item.color} · Size {item.size} {item.length ? `· ${item.length}` : ""} · Qty {item.quantity}</p>
                      </div>
                      <p className="text-[14px] font-extrabold text-brand-700 shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="flex-1 border border-line py-4 text-xs font-bold tracking-[0.14em] uppercase hover:bg-cream transition-colors">
                    Back
                  </button>
                  {form.paymentMethod === "card" || form.paymentMethod === "square" ? (
                    <div className="flex-[2]">
                       {/* Note: The StripeCheckout/SquareCheckout component renders its own 'Pay Now' button */}
                    </div>
                  ) : (
                    <button
                      onClick={() => handlePlaceOrder()}
                      disabled={placing}
                      className="sg-btn sg-btn-primary flex-[2] !py-[18px] !text-[14px]"
                    >
                      {placing ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Placing Order…</>
                      ) : (
                        <>Place Order · {formatPrice(total)}</>
                      )}
                    </button>
                  )}
                </div>

                {form.paymentMethod === "card" && (
                  <div className="pt-4 border-t border-line">
                    <StripeCheckout 
                      items={items}
                      email={form.email}
                      pointsRedeemed={pointsRedeemedApplied ? pointsRedeemed : 0}
                      promoCode={promoCode || undefined}
                      shippingCarrier={shippingCarrier}
                      shippingFee={shipping}
                      onSuccess={(intentId) => handlePlaceOrder(intentId)}
                      onError={(err) => Swal.fire({ text: err, confirmButtonColor: "#18181b" })}
                    />
                  </div>
                )}

                {form.paymentMethod === "square" && (
                  <div className="pt-4 border-t border-line">
                    {squareAppId && squareLocationId ? (
                      <SquareCheckout 
                        items={items}
                        email={form.email}
                        pointsRedeemed={pointsRedeemedApplied ? pointsRedeemed : 0}
                        appId={squareAppId}
                        locationId={squareLocationId}
                        postalCode={form.postalCode}
                        onSuccess={(transactionId) => handlePlaceOrder(transactionId)}
                        onError={(err) => Swal.fire({ text: err, confirmButtonColor: "#18181b" })}
                      />
                    ) : (
                      <div className="py-8 text-center text-xs text-soft flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-faint" /> Connecting to Square gateway...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: ORDER SUMMARY */}
          <div className="lg:col-span-5 space-y-6">
            <div className="sg-card sg-raise p-6 sm:p-7 sticky top-[92px] space-y-5">
              <h2 className="text-[18px] font-extrabold">Order summary</h2>
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start">
                    <div className="relative flex-shrink-0">
                      <div className="relative w-14 h-[70px] bg-cream rounded-xl overflow-hidden">
                        <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-brand-600 text-white text-[9px] font-extrabold rounded-full flex items-center justify-center">{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[14px] font-bold text-foreground line-clamp-2 leading-snug">{item.title}</p>
                      <div className="flex justify-between mt-2">
                        <p className="text-[13px] text-soft">Qty {item.quantity}</p>
                        <p className="text-[14px] font-extrabold text-brand-700 shrink-0">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Loyalty Reward Points Redemption Widget */}
              {availablePoints > 0 && (
                <div className="bg-cream border border-line p-4 rounded-sg space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] font-bold text-foreground flex items-center gap-1.5">
                      🌟 Reward Points
                    </span>
                    <span className="sg-chip bg-aqua-50 text-aqua-700 !text-[11px] !py-1">
                      {availablePoints} Available
                    </span>
                  </div>
                  {!pointsRedeemedApplied ? (
                    <div className="flex gap-2">
                      <input
                        type="number"
                        min="1"
                        max={availablePoints}
                        value={redeemInput}
                        onChange={(e) => setRedeemInput(e.target.value)}
                        placeholder={`Max ${Math.min(availablePoints, Math.floor((subtotal - discountAmount) / pointValue))}`}
                        className="sg-input sg-input-box flex-1 !py-2.5 !text-[14px]"
                      />
                      <button
                        onClick={() => {
                          const pts = parseInt(redeemInput);
                          if (!pts || pts <= 0) {
                            Swal.fire({ text: "Please enter a valid amount of points to redeem.", confirmButtonColor: "#18181b" });
                            return;
                          }
                          if (pts > availablePoints) {
                            Swal.fire({ text: `You only have ${availablePoints} points available.`, confirmButtonColor: "#18181b" });
                            return;
                          }
                          const maxRedeemable = Math.floor((subtotal - discountAmount) / pointValue);
                          if (pts > maxRedeemable) {
                            Swal.fire({ text: `You can only redeem up to ${maxRedeemable} points for this order.`, confirmButtonColor: "#18181b" });
                            return;
                          }
                          setPointsRedeemed(pts);
                          setPointsRedeemedApplied(true);
                        }}
                        className="bg-brand-600 hover:bg-brand-700 text-white text-[10px] font-bold px-4 py-2 uppercase tracking-wider transition-colors rounded-full"
                      >
                        Redeem
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 border border-emerald-100 p-2.5 rounded-lg">
                      <span className="font-semibold">Redeemed {pointsRedeemed} Points</span>
                      <button
                        onClick={() => {
                          setPointsRedeemed(0);
                          setPointsRedeemedApplied(false);
                          setRedeemInput("");
                        }}
                        className="text-emerald-850 hover:text-emerald-950 font-extrabold cursor-pointer ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

              {availablePoints === 0 && form.email && (
                <div className="bg-cream border border-line p-4 rounded-xl text-center">
                  <span className="text-[9px] font-bold tracking-[0.14em] text-faint uppercase block mb-1">Loyalty Rewards</span>
                  <p className="text-[10px] text-soft font-light leading-relaxed">
                    Earn <span className="font-bold text-soft">1 reward point</span> for every ${pointEarnRate} spent on this purchase!
                  </p>
                </div>
              )}

              <div className="border-t border-line pt-4 space-y-2">
                <div className="flex justify-between text-xs text-soft"><span>Subtotal</span><span className="font-bold text-soft">{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between text-xs text-soft"><span>Shipping</span><span className={shipping === 0 ? "text-emerald-600 font-bold" : "font-bold text-soft"}>{shipping === 0 ? "FREE" : formatPrice(shipping)}</span></div>
                <div className="flex justify-between text-xs text-soft"><span>Tax (5%)</span><span className="font-bold text-soft">{formatPrice(tax)}</span></div>
              </div>
              {discountPercentage > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-bold border-b border-line pb-3">
                  <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Promo Discount ({discountPercentage}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {pointsRedeemedApplied && (
                <div className="flex justify-between items-center text-emerald-600 font-bold border-b border-line pb-3">
                  <span className="flex items-center gap-1.5">🌟 Points Redeemed</span>
                  <span>-${(pointsRedeemed * pointValue).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-end border-t border-line pt-6">
                <span className="text-sm font-extrabold uppercase tracking-[0.14em] text-foreground">Total</span>
                <span className="text-lg font-extrabold">{formatPrice(total)}</span>
              </div>

              {/* Pending Points Earner Note */}
              <div className="bg-aqua-50 border border-aqua-100 p-3 rounded-lg flex items-center justify-between text-[10px] font-bold text-aqua-700">
                <span>🌟 Points Earned on this Order:</span>
                <span className="bg-aqua-100 text-aqua-800 px-2 py-0.5 rounded-xl font-extrabold">
                  +{Math.floor(total / pointEarnRate)} pts
                </span>
              </div>
            </div>
          </div>

        </div>
      </main>

      <Footer />

    </div>
  );
}
