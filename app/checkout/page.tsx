"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ChevronRight, ShoppingBag, Shield, Check, MapPin, CreditCard, Truck, Tag, Loader2 } from "lucide-react";
import { CartItem, getCart, cartTotal, cartCount, clearCart } from "@/lib/cart";
import { trackPurchase, storeCurrency } from "@/lib/analytics";
import Header from "@/components/HeaderClient";
import Footer from "@/components/Footer";
import StripeCheckout from "@/components/StripeCheckout";
import SquareCheckout from "@/components/SquareCheckout";
import { useCurrency } from "@/providers/CurrencyProvider";
import Swal from "@/lib/swal";
import { COUNTRIES } from "@/lib/countries";
import { regionLabelFor } from "@/lib/regions";
import { useRegions } from "@/lib/useRegions";
import {
  DEFAULT_TAX_SETTINGS,
  resolveTax,
  taxLineLabel,
  taxSettingsFromSettings,
  type TaxSettings,
} from "@/lib/tax";
import {
  DEFAULT_SHIPPING_METHODS,
  activeShippingMethods,
  applyFreeShippingThreshold,
  defaultShippingMethod,
  freeShippingThresholdFromSettings,
  parseShippingMethods,
  upsMethodId,
  type ShippingMethod,
} from "@/lib/shipping";

interface UpsRate {
  serviceName: string;
  serviceCode: string;
  rate: number;
  currency: string;
  daysToDelivery?: string;
}

const COUNTRY_METADATA = COUNTRIES.reduce((acc, c) => {
  acc[c.code] = c;
  return acc;
}, {} as Record<string, typeof COUNTRIES[0]>);

// US and Canada share +1, so the dial code alone can never tell them apart —
// only the 3-digit area code can. These are the codes assigned to Canada; every
// other NANP area code is treated as US.
const CANADA_AREA_CODES = new Set([
  "204", "226", "236", "249", "250", "263", "289", "306", "343", "354", "365",
  "367", "368", "382", "387", "403", "416", "418", "428", "431", "437", "438",
  "450", "468", "474", "506", "514", "519", "548", "579", "581", "584", "587",
  "600", "604", "613", "639", "647", "672", "683", "705", "709", "742", "753",
  "778", "780", "782", "807", "819", "825", "867", "873", "879", "902", "905"
]);

/** Given a NANP subscriber number (area code first), pick US or CA. */
const nanpCountry = (nationalNumber: string) =>
  CANADA_AREA_CODES.has(nationalNumber.replace(/\D/g, "").slice(0, 3)) ? "CA" : "US";

// A real NANP number is NXX-NXX-XXXX: the area code and the exchange after it
// both start 2-9. Numbers that fail this are never US/CA, whatever their length.
const NANP_PATTERN = /^[2-9]\d{2}[2-9]\d{6}$/;

/** Digits in a country's sample number, i.e. how long a local number looks there. */
const localNumberLength = (countryCode: string) =>
  COUNTRY_METADATA[countryCode]?.phonePlaceholder.replace(/\D/g, "").length ?? 0;

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
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>(DEFAULT_SHIPPING_METHODS);
  const [selectedMethodId, setSelectedMethodId] = useState("");
  const [shippingEnabled, setShippingEnabled] = useState(true);
  const [freeShippingThreshold, setFreeShippingThreshold] = useState<number | null>(null);
  const [upsRates, setUpsRates] = useState<UpsRate[]>([]);
  const [upsRatesAreMock, setUpsRatesAreMock] = useState(false);
  const [fetchingRates, setFetchingRates] = useState(false);
  const [upsError, setUpsError] = useState("");
  // Null until the first rate lookup answers — the UPS block stays hidden until
  // the store has said whether it offers UPS at all.
  const [upsAvailable, setUpsAvailable] = useState<boolean | null>(null);
  const [taxSettings, setTaxSettings] = useState<TaxSettings>(DEFAULT_TAX_SETTINGS);
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

  const { regions: countryRegions, loading: regionsLoading } = useRegions(form.country);

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
          const country = c.dialCode === "+1" ? nanpCountry(remainingPhone) : c.code;
          return { country, phone: remainingPhone };
        }
      }
    }

    // 2. Check if starts with dial code without the "+" (e.g. "88017...", "91987...")
    //
    // Without a "+" there is nothing marking where a dial code ends, so a plain
    // national number can look like one: Canadian 9029168446 "starts with" +90
    // and used to be chopped into Turkey + 29168446. Two guards keep that from
    // happening — the number must be longer than any plain national number
    // (10 digits or fewer), and what is left after removing the dial code must
    // itself still be a plausible subscriber number. Anything shorter is left
    // exactly as typed with the country untouched.
    const digits = cleaned.replace(/\D/g, "");
    const sortedCountries = [...COUNTRIES].sort((a, b) => b.dialCode.length - a.dialCode.length);
    if (digits.length >= 11) {
      for (const c of sortedCountries) {
        const dialWithoutPlus = c.dialCode.replace("+", "");
        if (digits.startsWith(dialWithoutPlus)) {
          const remainingPhone = digits.slice(dialWithoutPlus.length);
          if (remainingPhone.length >= 8 && remainingPhone.length <= 12) {
            const country = c.dialCode === "+1" ? nanpCountry(remainingPhone) : c.code;
            return { country, phone: remainingPhone };
          }
        }
      }
    }

    // 2b. A bare 10-digit NANP number: no dial code to read, but the area code
    // still says which side of the US/Canada border it is on. Two situations
    // where that is worth acting on:
    //   - a NANP country is already selected, so it is only US vs CA to settle;
    //   - the selected country writes local numbers at a different length, so
    //     what was typed cannot be a local number there (a 10-digit number
    //     while Bangladesh is selected — BD numbers are 11 digits from 01).
    // When the selected country's own numbers are also 10 digits the two are
    // genuinely indistinguishable (an Indian mobile looks exactly like a NANP
    // number), so that selection is left alone.
    const inNanpZone = form.country === "US" || form.country === "CA";
    if (digits.length === 10 && NANP_PATTERN.test(digits) && (inNanpZone || localNumberLength(form.country) !== 10)) {
      const country = nanpCountry(digits);
      if (country !== form.country) {
        return { country, phone: val };
      }
      return null;
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

  // UPS quotes in its account currency; product prices and the order total are
  // in the store's base currency, so convert on the way in. `lib/shippingServer`
  // repeats this server-side from the same `supported_currencies` rates, which
  // is what keeps the figure shown here equal to the amount actually charged.
  const toBase = (amount: number, currency: string) => {
    const entry = currencies?.find((c) => c.code === currency);
    if (!entry || !(entry.rate > 0)) return amount;
    return amount / entry.rate;
  };

  const fetchShippingRates = async (currentForm: typeof form) => {
    if (!currentForm.city || !currentForm.postalCode) return;
    setFetchingRates(true);
    setUpsError("");
    try {
      const totalWeight = items.reduce((acc, item) => acc + item.quantity * 1.5, 0);
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: currentForm.city,
          postalCode: currentForm.postalCode,
          countryCode: currentForm.country,
          addressLine: currentForm.address,
          totalWeight,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to fetch rates");

      if (data.success && data.disabled) {
        setUpsAvailable(false);
        setUpsRates([]);
        return;
      }

      if (data.success && Array.isArray(data.rates)) {
        setUpsAvailable(true);
        setUpsRatesAreMock(Boolean(data.isMock));
        setUpsRates(
          data.rates
            .map((rate: UpsRate) => ({ ...rate, rate: toBase(rate.rate, rate.currency) }))
            .sort((a: UpsRate, b: UpsRate) => a.rate - b.rate)
        );
      }
    } catch (err) {
      // Non-fatal: the store's own methods are still selectable, so surface the
      // failure inline instead of interrupting checkout with a modal.
      console.error(err);
      setUpsRates([]);
      setUpsError(err instanceof Error ? err.message : "Could not load UPS rates.");
    } finally {
      setFetchingRates(false);
    }
  };

  // Quote UPS as soon as the address can be priced, debounced so typing a
  // postal code does not fire one request per keystroke.
  useEffect(() => {
    if (!form.city || !form.postalCode || items.length === 0) return;
    const timer = setTimeout(() => fetchShippingRates(form), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.city, form.postalCode, form.country, items.length]);

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
          setShippingEnabled(data.shipping_enabled !== "false");
          setFreeShippingThreshold(freeShippingThresholdFromSettings(data));
          setTaxSettings(taxSettingsFromSettings(data));
          const methods = parseShippingMethods(data.shipping_methods);
          setShippingMethods(methods);
          // Pre-select the cheapest tier so the summary is never blank; the
          // shopper can still switch before continuing.
          setSelectedMethodId((prev) =>
            activeShippingMethods(methods).some((m) => m.id === prev)
              ? prev
              : defaultShippingMethod(methods)?.id ?? ""
          );

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

  // Display only — the server re-resolves every fee before charging: store
  // tiers from the settings row, UPS services by re-quoting the carrier.
  const availableMethods = activeShippingMethods(shippingMethods);

  // UPS services are modelled as methods too, so one radio group covers both
  // and the selected id means the same thing to the server either way.
  const upsAsMethods: ShippingMethod[] = upsRates.map((r) => ({
    id: upsMethodId(r.serviceCode),
    name: r.serviceName,
    deliveryTime: r.daysToDelivery || "",
    price: r.rate,
    active: true,
  }));

  const selectedMethod =
    [...availableMethods, ...upsAsMethods].find((m) => m.id === selectedMethodId) ??
    defaultShippingMethod(shippingMethods);
  const shipping = applyFreeShippingThreshold(
    shippingEnabled ? selectedMethod?.price ?? 0 : 0,
    subtotal,
    freeShippingThreshold
  );

  const shippingDestination = {
    city: form.city,
    postalCode: form.postalCode,
    countryCode: form.country,
    state: form.area,
    addressLine: form.address,
  };

  // Display only — /api/checkout recomputes this from the same settings row.
  // Computed after shipping because the merchant can opt to tax the fee too.
  const resolvedTax = resolveTax(taxSettings, {
    country: form.country,
    state: form.area,
    taxableAmount: preTaxAmount,
    shippingFee: shipping,
  });
  const tax = resolvedTax.amount;
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
        shippingMethodId: selectedMethod?.id || "",
        shippingDestination,
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

      const result = await res.json();

      // Fired before clearCart(), which wipes the items the event describes.
      // trackPurchase ignores an order id it has already reported, so a refresh
      // of the success panel cannot count the revenue twice.
      trackPurchase({
        transaction_id: result.orderId,
        value: result.analytics?.value ?? cartTotal(items),
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
    return <div className="min-h-screen bg-white flex items-center justify-center"><div className="w-8 h-8 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin" /></div>;
  }

  if (items.length === 0 && !placed) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-6 px-6 text-center">
        <ShoppingBag className="w-14 h-14 text-zinc-300" />
        <h2 className="text-2xl font-black uppercase tracking-tight">Your cart is empty</h2>
        <Link href="/shop" className="bg-zinc-950 text-white px-10 py-4 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">
          Shop Now
        </Link>
      </div>
    );
  }

  // ORDER PLACED SUCCESS
  if (placed) {
    return (
      <div className="min-h-screen bg-zinc-50 flex flex-col items-center justify-center gap-8 px-6 text-center">
        <div className="w-24 h-24 rounded-full bg-zinc-950 flex items-center justify-center ring-8 ring-zinc-100 animate-bounce">
          <Check className="w-10 h-10 text-white" />
        </div>
        <div>
          <h1 className="text-3xl sm:text-4xl font-extrabold uppercase tracking-tight mb-3">Order Confirmed!</h1>
          <p className="text-zinc-400 text-sm font-light max-w-md mx-auto">
            Thank you, <strong className="text-zinc-700">{form.fullName || "valued customer"}</strong>! Your order has been placed successfully.
            You'll receive a confirmation at <strong className="text-zinc-700">{form.email || "your email"}</strong>.
          </p>
        </div>
        <div className="bg-white border border-zinc-100 px-8 py-6 max-w-sm w-full">
          <div className="flex justify-between text-xs mb-2 text-zinc-500"><span>Order Total</span><span className="font-black text-zinc-950">{formatPrice(total)}</span></div>
          <div className="flex justify-between text-xs text-zinc-500"><span>Payment</span><span className="font-bold text-zinc-700 uppercase">{form.paymentMethod === "cod" ? "Cash on Delivery" : form.paymentMethod === "card" ? "Credit / Debit Card" : form.paymentMethod === "square" ? "Square" : form.paymentMethod}</span></div>
        </div>
        <div className="flex gap-4">
          <Link href="/account" className="border border-zinc-950 text-zinc-950 px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-zinc-50 transition-colors">Go to Account</Link>
          <Link href="/shop" className="bg-zinc-950 text-white px-8 py-3 text-xs font-bold tracking-widest uppercase hover:bg-zinc-800 transition-colors">Continue Shopping</Link>
        </div>
        <p className="text-[10px] text-zinc-400 animate-pulse uppercase tracking-widest font-bold">Redirecting to your account in 4 seconds...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-zinc-50 text-zinc-950 font-sans antialiased">

      <Header />

      {/* STEPPER */}
      <div className="bg-white border-b border-zinc-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-center gap-0">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center">
              <button
                onClick={() => i < step && setStep(i)}
                className={`flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-colors ${i === step ? "text-zinc-950" : i < step ? "text-zinc-500 cursor-pointer hover:text-zinc-800" : "text-zinc-300 cursor-default"}`}
              >
                <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black border-2 transition-all ${i === step ? "bg-zinc-950 text-white border-zinc-950" : i < step ? "bg-white text-zinc-950 border-zinc-950" : "bg-white text-zinc-300 border-zinc-200"}`}>
                  {i < step ? <Check className="w-3 h-3" /> : i + 1}
                </span>
                <span className="hidden sm:block">{s}</span>
              </button>
              {i < STEPS.length - 1 && <div className={`w-12 sm:w-24 h-px mx-3 transition-colors ${i < step ? "bg-zinc-950" : "bg-zinc-200"}`} />}
            </div>
          ))}
        </div>
      </div>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10 w-full flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* LEFT: FORM STEPS */}
          <div className="lg:col-span-7">

            {/* STEP 0: SHIPPING */}
            {step === 0 && (
              <div className="bg-white border border-zinc-100 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <MapPin className="w-5 h-5 text-zinc-400" />
                  <h2 className="text-sm font-black uppercase tracking-widest">Shipping Information</h2>
                </div>

                {/* Home/Office Address Selector */}
                {isLoggedIn && (
                  <div className="grid grid-cols-2 gap-4 pb-4 border-b border-zinc-100">
                    <button
                      type="button"
                      onClick={() => handleSelectSavedAddress("home")}
                      className={`flex flex-col items-start p-3 border text-left transition-all ${
                        selectedAddressType === "home"
                          ? "border-zinc-950 bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 mb-1 text-zinc-900">
                        🏠 Home Address
                      </span>
                      <span className="text-[10px] text-zinc-500 line-clamp-2">
                        {savedAddresses.home
                          ? `${savedAddresses.home.address}, ${savedAddresses.home.city}`
                          : "No address saved yet"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSelectSavedAddress("office")}
                      className={`flex flex-col items-start p-3 border text-left transition-all ${
                        selectedAddressType === "office"
                          ? "border-zinc-950 bg-zinc-50"
                          : "border-zinc-200 hover:border-zinc-300"
                      }`}
                    >
                      <span className="text-xs font-black uppercase tracking-wider flex items-center gap-1.5 mb-1 text-zinc-900">
                        🏢 Office Address
                      </span>
                      <span className="text-[10px] text-zinc-500 line-clamp-2">
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
                    { label: `${regionLabelFor(form.country)} *`, key: "area", type: countryRegions.length > 0 || regionsLoading ? "region" : "text", placeholder: "NY", colSpan: false },
                    { label: "Postal Code *", key: "postalCode", type: "text", placeholder: "10001", colSpan: false },
                  ] as { label: string; key: keyof typeof form; type: string; placeholder: string; colSpan: boolean }[]).map((f) => (
                    <div key={f.key} className={f.colSpan ? "sm:col-span-2" : ""}>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">{f.label}</label>
                      {f.type === "region" ? (
                        <select
                          value={form[f.key]}
                          disabled={regionsLoading}
                          onChange={(e) => {
                            setForm((prev) => ({ ...prev, area: e.target.value }));
                            if (errors[f.key]) setErrors((errs) => ({ ...errs, [f.key]: "" }));
                          }}
                          className={`w-full px-4 py-2 text-sm border bg-zinc-50 focus:bg-white focus:outline-none transition-all ${
                            errors[f.key]
                              ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500"
                              : "border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                          }`}
                        >
                          <option value="">
                            {regionsLoading ? "Loading…" : `Select ${regionLabelFor(form.country).toLowerCase()}…`}
                          </option>
                          {countryRegions.map((r) => (
                            <option key={r.code} value={r.code}>
                              {r.name}
                            </option>
                          ))}
                        </select>
                      ) : f.type === "select" ? (
                        <select
                          value={form[f.key]}
                          onChange={(e) => {
                            const newCountry = e.target.value;
                            setForm((prev) => ({
                              ...prev,
                              country: newCountry,
                              // A province code means nothing in another country,
                              // and a stale one would silently pick its tax rate.
                              area: "",
                            }));
                            if (errors[f.key]) setErrors((errs) => ({ ...errs, [f.key]: "" }));
                          }}
                          className={`w-full px-4 py-2 text-sm border bg-zinc-50 focus:bg-white focus:outline-none transition-all ${
                            errors[f.key] 
                              ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
                              : "border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                          }`}
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      ) : f.key === "phone" ? (
                        <div className="flex items-stretch border border-zinc-200 bg-zinc-50 focus-within:bg-white focus-within:border-zinc-950 focus-within:ring-1 focus-within:ring-zinc-950 transition-all">
                          {/* Flag Dropdown/Selector on the left */}
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
                            <span className="text-xs font-bold text-zinc-600 mr-1.5">
                              {COUNTRY_METADATA[form.country as keyof typeof COUNTRY_METADATA]?.dialCode}
                            </span>
                            <span className="text-[7px] text-zinc-400">▼</span>
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
                            className="w-full px-4 py-2 text-sm bg-transparent focus:outline-none"
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
                          className={`w-full px-4 py-2 text-sm border bg-zinc-50 focus:bg-white focus:outline-none transition-all ${
                            errors[f.key] 
                              ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
                              : "border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                          }`}
                        />
                      )}
                      {errors[f.key] && (
                        <p className="text-red-500 text-[10px] mt-1 uppercase font-bold tracking-wider">{errors[f.key]}</p>
                      )}
                    </div>
                  ))}
                </div>

                {/* Save Address Actions */}
                {isLoggedIn && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-2 text-xs">
                    <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-wider">Save current details as:</span>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleSaveAddress("home")}
                        className="border border-zinc-200 hover:border-zinc-950 px-3 py-1.5 font-bold uppercase text-[9px] tracking-wider transition-all rounded-none"
                      >
                        💾 Save as Home
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveAddress("office")}
                        className="border border-zinc-200 hover:border-zinc-950 px-3 py-1.5 font-bold uppercase text-[9px] tracking-wider transition-all rounded-none"
                      >
                        💾 Save as Office
                      </button>
                    </div>
                  </div>
                )}

                {/* Shipping methods selector */}
                {(availableMethods.length > 0 ||
                  upsAsMethods.length > 0 ||
                  (fetchingRates && upsAvailable !== false)) && (
                  <div className="pt-4 border-t border-zinc-100 space-y-4">
                    <h3 className="text-xs font-black uppercase tracking-widest text-zinc-900">Select Shipping Method</h3>

                    {availableMethods.length > 0 && (
                      <div className="space-y-2">
                        {availableMethods.map((method) => {
                          const price = shippingEnabled ? method.price : 0;
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
                                name="shippingMethod"
                                checked={selectedMethod?.id === method.id}
                                onChange={() => setSelectedMethodId(method.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <p className="text-xs font-black uppercase tracking-wider text-zinc-900">
                                  {method.name}
                                </p>
                                {method.deliveryTime && (
                                  <p className="text-[10px] text-zinc-400 font-light mt-0.5">
                                    Estimated delivery: {method.deliveryTime}
                                  </p>
                                )}
                              </div>
                              <span className={`text-xs font-black ${price === 0 ? "text-emerald-600" : "text-zinc-950"}`}>
                                {price === 0 ? "FREE" : formatPrice(price)}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    )}

                    {/* UPS live services */}
                    <div className="space-y-2" hidden={upsAvailable === false}>
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">
                          UPS Services
                        </p>
                        {!fetchingRates && (
                          <button
                            type="button"
                            onClick={() => fetchShippingRates(form)}
                            disabled={!form.city || !form.postalCode}
                            className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 hover:text-zinc-950 disabled:opacity-40 disabled:cursor-not-allowed underline underline-offset-2"
                          >
                            {upsRates.length > 0 ? "Refresh rates" : "Get UPS rates"}
                          </button>
                        )}
                      </div>

                      {fetchingRates ? (
                        <div className="py-4 text-center text-xs text-zinc-400 flex items-center justify-center gap-2">
                          <div className="w-4 h-4 border-2 border-zinc-200 border-t-zinc-950 rounded-full animate-spin" />
                          Fetching UPS rates...
                        </div>
                      ) : upsError ? (
                        <p className="text-[10px] text-amber-600 bg-amber-50 border border-amber-100 p-3">
                          {upsError} You can still continue with the options above.
                        </p>
                      ) : upsRates.length === 0 ? (
                        <p className="text-[10px] text-zinc-400 font-light">
                          Enter your city and postal code, then fetch rates to see every UPS service
                          available to your address.
                        </p>
                      ) : (
                        <>
                          {upsRatesAreMock && (
                            <p className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 p-3">
                              ⚠️ Test rates — UPS credentials are not configured, so these prices are
                              samples and cannot be used to place an order.
                            </p>
                          )}
                          {upsAsMethods.map((method) => (
                            <label
                              key={method.id}
                              className={`flex items-start gap-4 p-4 border transition-all ${
                                upsRatesAreMock
                                  ? "opacity-60 cursor-not-allowed border-zinc-200"
                                  : selectedMethod?.id === method.id
                                    ? "border-zinc-950 bg-zinc-50 cursor-pointer"
                                    : "border-zinc-200 hover:border-zinc-300 cursor-pointer"
                              }`}
                            >
                              <input
                                type="radio"
                                name="shippingMethod"
                                disabled={upsRatesAreMock}
                                checked={selectedMethod?.id === method.id}
                                onChange={() => setSelectedMethodId(method.id)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <p className="text-xs font-black uppercase tracking-wider text-zinc-900">
                                  {method.name}
                                </p>
                                {method.deliveryTime && (
                                  <p className="text-[10px] text-zinc-400 font-light mt-0.5">
                                    Estimated delivery: {method.deliveryTime}
                                  </p>
                                )}
                              </div>
                              <span className="text-xs font-black text-zinc-950">
                                {formatPrice(method.price)}
                              </span>
                            </label>
                          ))}
                        </>
                      )}
                    </div>
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
                  className="w-full bg-zinc-950 text-white py-4 text-xs font-black tracking-widest uppercase hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
                >
                  Continue to Payment <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 1: PAYMENT */}
            {step === 1 && (
              <div className="bg-white border border-zinc-100 p-6 sm:p-8 space-y-6">
                <div className="flex items-center gap-3 mb-2">
                  <CreditCard className="w-5 h-5 text-zinc-400" />
                  <h2 className="text-sm font-black uppercase tracking-widest">Payment Method</h2>
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
                    className={`flex items-start gap-4 p-4 border-2 cursor-pointer transition-all ${form.paymentMethod === opt.value ? "border-zinc-950 bg-zinc-50" : "border-zinc-100 hover:border-zinc-300"}`}
                  >
                    <input type="radio" name="paymentMethod" value={opt.value} checked={form.paymentMethod === opt.value} onChange={set("paymentMethod")} className="mt-0.5" />
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-zinc-900">{opt.label}</p>
                      <p className="text-[10px] text-zinc-400 font-light mt-0.5">{opt.desc}</p>
                    </div>
                  </label>
                ))}

                {/* Card fields */}
                {form.paymentMethod === "card" && (
                  <div className="pt-2 text-xs text-zinc-500">
                    <p>You will enter your card details securely via Stripe in the next step.</p>
                  </div>
                )}

                {form.paymentMethod === "bkash" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">bKash Number *</label>
                    <input 
                      type="tel" 
                      value={form.bkashNumber} 
                      onChange={(e) => {
                        set("bkashNumber")(e);
                        if (errors.bkashNumber) setErrors((errs) => ({ ...errs, bkashNumber: "" }));
                      }} 
                      placeholder="+880 1XXXXXXXXX" 
                      className={`w-full px-4 py-2 text-sm border bg-zinc-50 focus:bg-white focus:outline-none transition-all ${
                        errors.bkashNumber 
                          ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
                          : "border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                      }`}
                    />
                    {errors.bkashNumber && (
                      <p className="text-red-500 text-[10px] mt-1 uppercase font-bold tracking-wider">{errors.bkashNumber}</p>
                    )}
                  </div>
                )}

                {form.paymentMethod === "nagad" && (
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-1.5 block">Nagad Number *</label>
                    <input 
                      type="tel" 
                      value={form.nagadNumber} 
                      onChange={(e) => {
                        set("nagadNumber")(e);
                        if (errors.nagadNumber) setErrors((errs) => ({ ...errs, nagadNumber: "" }));
                      }} 
                      placeholder="+880 1XXXXXXXXX" 
                      className={`w-full px-4 py-2 text-sm border bg-zinc-50 focus:bg-white focus:outline-none transition-all ${
                        errors.nagadNumber 
                          ? "border-red-500 focus:border-red-500 focus:ring-1 focus:ring-red-500" 
                          : "border-zinc-200 focus:border-zinc-950 focus:ring-1 focus:ring-zinc-950"
                      }`}
                    />
                    {errors.nagadNumber && (
                      <p className="text-red-500 text-[10px] mt-1 uppercase font-bold tracking-wider">{errors.nagadNumber}</p>
                    )}
                  </div>
                )}

                <div className="flex gap-3">
                  <button onClick={() => setStep(0)} className="flex-1 border border-zinc-200 py-4 text-xs font-bold tracking-widest uppercase hover:bg-zinc-50 transition-colors">
                    Back
                  </button>
                  <button onClick={() => {
                    const newErrors: Record<string, string> = {};
                    if (form.paymentMethod === "bkash" && !form.bkashNumber) newErrors.bkashNumber = "bKash Number is required";
                    if (form.paymentMethod === "nagad" && !form.nagadNumber) newErrors.nagadNumber = "Nagad Number is required";
                    
                    setErrors(newErrors);
                    if (Object.keys(newErrors).length > 0) return;

                    setStep(2);
                  }} className="flex-[2] bg-zinc-950 text-white py-4 text-xs font-black tracking-widest uppercase hover:bg-zinc-800 transition-colors flex items-center justify-center gap-2">
                    Review Order <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* STEP 2: CONFIRM */}
            {step === 2 && (
              <div className="bg-white border border-zinc-100 p-6 sm:p-8 space-y-6">
                <h2 className="text-sm font-black uppercase tracking-widest flex items-center gap-2">
                  <Truck className="w-5 h-5 text-zinc-400" /> Review & Confirm
                </h2>

                {/* Shipping summary */}
                <div className="bg-zinc-50 p-4 space-y-1">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Shipping To</p>
                  <p className="text-sm font-bold text-zinc-900">{form.fullName}</p>
                  <p className="text-xs text-zinc-500">{form.address}, {form.area}, {form.city} {form.postalCode}</p>
                  <p className="text-xs text-zinc-500">{form.phone} · {form.email}</p>
                  <div className="pt-2 border-t border-zinc-200 mt-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Shipping Method</p>
                    <p className="text-xs font-bold text-zinc-900 mt-0.5">
                      {selectedMethod?.name ?? "Standard Shipping"}
                      {selectedMethod?.deliveryTime ? ` · ${selectedMethod.deliveryTime}` : ""} (
                      {shipping === 0 ? "FREE" : formatPrice(shipping)})
                    </p>
                  </div>
                </div>

                {/* Payment summary */}
                <div className="bg-zinc-50 p-4">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400 mb-2">Payment Method</p>
                  <p className="text-sm font-bold text-zinc-900">
                    {form.paymentMethod === "cod" ? "Cash on Delivery" : form.paymentMethod === "card" ? "Credit/Debit Card (Stripe)" : form.paymentMethod === "square" ? "Square Payment" : form.paymentMethod === "bkash" ? `bKash — ${form.bkashNumber}` : `Nagad — ${form.nagadNumber}`}
                  </p>
                </div>

                {/* Items list */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black uppercase tracking-widest text-zinc-400">Items ({count})</p>
                  {items.map((item) => (
                    <div key={item.id} className="flex gap-3 items-center">
                      <div className="relative w-12 h-16 bg-zinc-100 border border-zinc-100 flex-shrink-0">
                        <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold uppercase tracking-wide text-zinc-900 line-clamp-1">{item.title}</p>
                        <p className="text-[10px] text-zinc-400">{item.color} · Size {item.size} {item.length ? `· ${item.length}` : ""} · Qty {item.quantity}</p>
                      </div>
                      <p className="text-xs font-black text-zinc-950 flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button onClick={() => setStep(1)} className="flex-1 border border-zinc-200 py-4 text-xs font-bold tracking-widest uppercase hover:bg-zinc-50 transition-colors">
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
                      className="flex-[2] bg-zinc-950 text-white py-4 text-xs font-black tracking-widest uppercase hover:bg-zinc-800 disabled:opacity-60 disabled:cursor-wait transition-all flex items-center justify-center gap-2"
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
                  <div className="pt-4 border-t border-zinc-100">
                    <StripeCheckout 
                      items={items}
                      email={form.email}
                      pointsRedeemed={pointsRedeemedApplied ? pointsRedeemed : 0}
                      promoCode={promoCode || undefined}
                      shippingMethodId={selectedMethod?.id || ""}
                      shippingDestination={shippingDestination}
                      onSuccess={(intentId) => handlePlaceOrder(intentId)}
                      onError={(err) => Swal.fire({ text: err, confirmButtonColor: "#18181b" })}
                    />
                  </div>
                )}

                {form.paymentMethod === "square" && (
                  <div className="pt-4 border-t border-zinc-100">
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
                      <div className="py-8 text-center text-xs text-zinc-500 flex items-center justify-center gap-2">
                        <Loader2 className="w-4 h-4 animate-spin text-zinc-400" /> Connecting to Square gateway...
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* RIGHT: ORDER SUMMARY */}
          <div className="lg:col-span-5 space-y-6">
            <div className="bg-white border border-zinc-100 p-6 sticky top-24 space-y-5">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-zinc-500">Order Summary</h2>
              <div className="space-y-4 max-h-72 overflow-y-auto pr-1">
                {items.map((item) => (
                  <div key={item.id} className="flex gap-3 items-start">
                    <div className="relative flex-shrink-0">
                      <div className="relative w-14 h-20 bg-zinc-100 border border-zinc-100 overflow-hidden">
                        <Image src={item.thumbnail} alt={item.title} fill className="object-cover" />
                      </div>
                      <span className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-zinc-950 text-white text-[9px] font-black rounded-full flex items-center justify-center">{item.quantity}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold uppercase tracking-wide text-zinc-900 line-clamp-2 leading-snug">{item.title}</p>
                      <div className="flex justify-between mt-2">
                        <p className="text-xs text-zinc-500 font-medium">Qty: {item.quantity}</p>
                        <p className="text-xs font-black text-zinc-950 flex-shrink-0">{formatPrice(item.price * item.quantity)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Loyalty Reward Points Redemption Widget */}
              {availablePoints > 0 && (
                <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-sm space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-black uppercase tracking-wider text-zinc-900 flex items-center gap-1">
                      🌟 Reward Points
                    </span>
                    <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
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
                        className="flex-1 px-3 py-2 text-xs border border-zinc-200 bg-white focus:outline-none focus:border-zinc-950 transition-all placeholder-zinc-350"
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
                        className="bg-zinc-950 hover:bg-zinc-800 text-white text-[10px] font-bold px-4 py-2 uppercase tracking-wider transition-colors rounded-xs"
                      >
                        Redeem
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between text-xs bg-emerald-50 text-emerald-800 border border-emerald-100 p-2.5 rounded-xs">
                      <span className="font-semibold">Redeemed {pointsRedeemed} Points</span>
                      <button
                        onClick={() => {
                          setPointsRedeemed(0);
                          setPointsRedeemedApplied(false);
                          setRedeemInput("");
                        }}
                        className="text-emerald-850 hover:text-emerald-950 font-black cursor-pointer ml-2"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>
              )}

              {availablePoints === 0 && form.email && (
                <div className="bg-zinc-50 border border-zinc-150 p-4 rounded-sm text-center">
                  <span className="text-[9px] font-bold tracking-widest text-zinc-400 uppercase block mb-1">Loyalty Rewards</span>
                  <p className="text-[10px] text-zinc-500 font-light leading-relaxed">
                    Earn <span className="font-bold text-zinc-700">1 reward point</span> for every ${pointEarnRate} spent on this purchase!
                  </p>
                </div>
              )}

              <div className="border-t border-zinc-100 pt-4 space-y-2">
                <div className="flex justify-between text-xs text-zinc-500"><span>Subtotal</span><span className="font-bold text-zinc-700">{formatPrice(subtotal)}</span></div>
                <div className="flex justify-between text-xs text-zinc-500"><span>Shipping</span><span className={shipping === 0 ? "text-emerald-600 font-bold" : "font-bold text-zinc-700"}>{shipping === 0 ? "FREE" : formatPrice(shipping)}</span></div>
                <div className="flex justify-between text-xs text-zinc-500"><span>{taxLineLabel(resolvedTax.rate, resolvedTax.label)}</span><span className="font-bold text-zinc-700">{formatPrice(tax)}</span></div>
              </div>
              {discountPercentage > 0 && (
                <div className="flex justify-between items-center text-emerald-600 font-bold border-b border-zinc-100 pb-3">
                  <span className="flex items-center gap-1.5"><Tag className="w-3.5 h-3.5" /> Promo Discount ({discountPercentage}%)</span>
                  <span>-${discountAmount.toFixed(2)}</span>
                </div>
              )}
              {pointsRedeemedApplied && (
                <div className="flex justify-between items-center text-emerald-600 font-bold border-b border-zinc-100 pb-3">
                  <span className="flex items-center gap-1.5">🌟 Points Redeemed</span>
                  <span>-${(pointsRedeemed * pointValue).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-end border-t border-zinc-100 pt-6">
                <span className="text-sm font-black uppercase tracking-widest text-zinc-950">Total</span>
                <span className="text-lg font-black">{formatPrice(total)}</span>
              </div>

              {/* Pending Points Earner Note */}
              <div className="bg-indigo-50 border border-indigo-100 p-3 rounded-xs flex items-center justify-between text-[10px] font-bold text-indigo-700">
                <span>🌟 Points Earned on this Order:</span>
                <span className="bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-sm font-black">
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
