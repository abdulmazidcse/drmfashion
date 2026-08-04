"use client";

import React, { createContext, useContext, useState, useEffect, useMemo } from "react";
import { useSettings } from "@/providers/SettingsProvider";

export interface Currency {
  code: string;
  symbol: string;
  rate: number;
}

interface CurrencyContextType {
  currencies: Currency[];
  selectedCurrency: Currency;
  /** Store currency configured in admin settings (the `rate === 1` entry of supported_currencies). */
  baseCurrency: Currency;
  setCurrency: (code: string) => void;
  formatPrice: (usdPrice: number) => string;
  /** Formats an amount that is already stored in the base currency — no visitor conversion. */
  formatBasePrice: (basePrice: number) => string;
  convertPrice: (usdPrice: number) => number;
  selectedCountry: string;
  setCountryAndCurrency: (country: string, currencyCode: string) => void;
}

const defaultCurrency: Currency = { code: "USD", symbol: "$", rate: 1 };

const CurrencyContext = createContext<CurrencyContextType>({
  currencies: [defaultCurrency],
  selectedCurrency: defaultCurrency,
  baseCurrency: defaultCurrency,
  setCurrency: () => {},
  formatPrice: (price: number) => `$${price.toFixed(2)}`,
  formatBasePrice: (price: number) => `$${price.toFixed(2)}`,
  convertPrice: (price: number) => price,
  selectedCountry: "United States",
  setCountryAndCurrency: () => {},
});

export interface CountryInfo {
  name: string;
  currency: string;
  code: string;
}

export interface ContinentGroup {
  name: string;
  countries: CountryInfo[];
}

export const CONTINENTS: ContinentGroup[] = [
  {
    name: "AFRICA",
    countries: [
      { name: "Egypt", currency: "EGP", code: "EG" },
      { name: "South Africa", currency: "ZAR", code: "ZA" },
      { name: "Nigeria", currency: "NGN", code: "NG" },
      { name: "Kenya", currency: "KES", code: "KE" },
      { name: "Morocco", currency: "MAD", code: "MA" },
      { name: "Ghana", currency: "GHS", code: "GH" }
    ]
  },
  {
    name: "ASIA",
    countries: [
      { name: "Bangladesh", currency: "BDT", code: "BD" },
      { name: "India", currency: "INR", code: "IN" },
      { name: "Pakistan", currency: "PKR", code: "PK" },
      { name: "Japan", currency: "JPY", code: "JP" },
      { name: "China", currency: "CNY", code: "CN" },
      { name: "Singapore", currency: "SGD", code: "SG" },
      { name: "Saudi Arabia", currency: "SAR", code: "SA" },
      { name: "United Arab Emirates", currency: "AED", code: "AE" },
      { name: "Malaysia", currency: "MYR", code: "MY" },
      { name: "Indonesia", currency: "IDR", code: "ID" },
      { name: "Thailand", currency: "THB", code: "TH" },
      { name: "South Korea", currency: "KRW", code: "KR" }
    ]
  },
  {
    name: "CENTRAL AMERICA",
    countries: [
      { name: "Costa Rica", currency: "CRC", code: "CR" },
      { name: "Panama", currency: "PAB", code: "PA" },
      { name: "Guatemala", currency: "GTQ", code: "GT" },
      { name: "Honduras", currency: "HNL", code: "HN" },
      { name: "El Salvador", currency: "SVC", code: "SV" }
    ]
  },
  {
    name: "EUROPE",
    countries: [
      { name: "United Kingdom", currency: "GBP", code: "GB" },
      { name: "Germany", currency: "EUR", code: "DE" },
      { name: "France", currency: "EUR", code: "FR" },
      { name: "Italy", currency: "EUR", code: "IT" },
      { name: "Spain", currency: "EUR", code: "ES" },
      { name: "Netherlands", currency: "EUR", code: "NL" },
      { name: "Sweden", currency: "SEK", code: "SE" },
      { name: "Switzerland", currency: "CHF", code: "CH" },
      { name: "Ireland", currency: "EUR", code: "IE" },
      { name: "Belgium", currency: "EUR", code: "BE" }
    ]
  },
  {
    name: "NORTH AMERICA",
    countries: [
      { name: "United States", currency: "USD", code: "US" },
      { name: "Canada", currency: "CAD", code: "CA" },
      { name: "Mexico", currency: "MXN", code: "MX" }
    ]
  },
  {
    name: "OCEANIA",
    countries: [
      { name: "Australia", currency: "AUD", code: "AU" },
      { name: "New Zealand", currency: "NZD", code: "NZ" },
      { name: "Fiji", currency: "FJD", code: "FJ" }
    ]
  },
  {
    name: "SOUTH AMERICA",
    countries: [
      { name: "Brazil", currency: "BRL", code: "BR" },
      { name: "Argentina", currency: "ARS", code: "AR" },
      { name: "Colombia", currency: "COP", code: "CO" },
      { name: "Chile", currency: "CLP", code: "CL" },
      { name: "Peru", currency: "PEN", code: "PE" }
    ]
  }
];

export function getCurrencyForCountry(countryName: string): string {
  for (const group of CONTINENTS) {
    const found = group.countries.find(c => c.name === countryName);
    if (found) return found.currency;
  }
  return "USD";
}

export const USD_RATES: Record<string, { symbol: string, rate: number }> = {
  USD: { symbol: "$", rate: 1.0 },
  BDT: { symbol: "Tk", rate: 117.0 },
  EUR: { symbol: "€", rate: 0.92 },
  GBP: { symbol: "£", rate: 0.79 },
  INR: { symbol: "₹", rate: 83.5 },
  PKR: { symbol: "₨", rate: 278.0 },
  JPY: { symbol: "¥", rate: 156.0 },
  CNY: { symbol: "¥", rate: 7.25 },
  SGD: { symbol: "$", rate: 1.35 },
  CAD: { symbol: "$", rate: 1.37 },
  AUD: { symbol: "$", rate: 1.50 },
  NZD: { symbol: "$", rate: 1.63 },
  AED: { symbol: "د.إ", rate: 3.67 },
  SAR: { symbol: "ر.س", rate: 3.75 },
  EGP: { symbol: "EGP", rate: 47.0 },
  ZAR: { symbol: "R", rate: 18.5 },
  NGN: { symbol: "₦", rate: 1500.0 },
  KES: { symbol: "KSh", rate: 130.0 },
  MAD: { symbol: "DH", rate: 10.0 },
  GHS: { symbol: "GH₵", rate: 14.5 },
  MYR: { symbol: "RM", rate: 4.70 },
  IDR: { symbol: "Rp", rate: 16300.0 },
  THB: { symbol: "฿", rate: 36.5 },
  KRW: { symbol: "₩", rate: 1380.0 },
  BRL: { symbol: "R$", rate: 5.40 },
  ARS: { symbol: "$", rate: 900.0 },
  COP: { symbol: "$", rate: 4100.0 },
  CLP: { symbol: "$", rate: 920.0 },
  PEN: { symbol: "S/.", rate: 3.80 },
  CRC: { symbol: "₡", rate: 525.0 },
  PAB: { symbol: "B/.", rate: 1.0 },
  GTQ: { symbol: "Q", rate: 7.75 },
  HNL: { symbol: "L", rate: 24.7 },
  SVC: { symbol: "$", rate: 8.75 },
  SEK: { symbol: "kr", rate: 10.5 },
  CHF: { symbol: "CHF", rate: 0.89 },
  MXN: { symbol: "$", rate: 18.4 },
  FJD: { symbol: "$", rate: 2.24 }
};

export function getSymbolForCurrencyCode(code: string): string {
  const symbols: Record<string, string> = {
    USD: "$", BDT: "Tk", EUR: "€", GBP: "£", INR: "₹", PKR: "₨", JPY: "¥", CNY: "¥",
    SGD: "$", CAD: "$", AUD: "$", NZD: "$", AED: "د.إ", SAR: "ر.স", EGP: "EGP",
    ZAR: "R", NGN: "₦", KES: "KSh", MAD: "DH", GHS: "GH₵", MYR: "RM", IDR: "Rp",
    THB: "฿", KRW: "₩", BRL: "R$", ARS: "$", COP: "$", CLP: "$", PEN: "S/.",
    CRC: "₡", PAB: "B/.", GTQ: "Q", HNL: "L", SVC: "$", SEK: "kr", CHF: "CHF",
    MXN: "$", FJD: "$"
  };
  return symbols[code] || code;
}

export function detectCountryFromTimezone(): string {
  if (typeof window === "undefined") return "United States";
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz.includes("Dhaka")) return "Bangladesh";
    if (tz.includes("Kolkata") || tz.includes("Calcutta")) return "India";
    if (tz.includes("Karachi")) return "Pakistan";
    if (tz.includes("Tokyo")) return "Japan";
    if (tz.includes("London")) return "United Kingdom";
    if (tz.includes("Paris") || tz.includes("Berlin") || tz.includes("Rome") || tz.includes("Madrid") || tz.includes("Amsterdam")) return "Germany";
    if (tz.includes("New_York") || tz.includes("Chicago") || tz.includes("Denver") || tz.includes("Los_Angeles") || tz.includes("Phoenix") || tz.includes("Honolulu")) return "United States";
    if (tz.includes("Toronto") || tz.includes("Vancouver")) return "Canada";
    if (tz.includes("Sydney") || tz.includes("Melbourne") || tz.includes("Brisbane")) return "Australia";
    if (tz.includes("Auckland")) return "New Zealand";
    
    const lang = window.navigator.language;
    if (lang.includes("bn")) return "Bangladesh";
    if (lang.includes("in")) return "India";
    if (lang.includes("gb")) return "United Kingdom";
    if (lang.includes("ca")) return "Canada";
    if (lang.includes("au")) return "Australia";
  } catch (e) {
    // Ignore
  }
  return "United States"; // Fallback default
}

/**
 * `rates` and settings both arrive with the server payload now.
 *
 * This used to run, sequentially, on mount on every page load:
 *   fetch("https://open.er-api.com/…")  →  fetch("/api/settings")  →  fetch("/api/detect-country")
 *
 * The first is cross-origin and the second was the third request for
 * `/api/settings` on the page (the root layout already reads settings on the
 * server, and `SettingsProvider` holds the result). Everything the storefront
 * renders a price with hangs off this provider, so that chain gated every price
 * on the page. Only the geo lookup is still deferred to the client, and only
 * when the visitor has no stored country.
 */
export function CurrencyProvider({
  children,
  rates,
}: {
  children: React.ReactNode;
  rates?: Record<string, number> | null;
}) {
  const { settings, loading: settingsLoading } = useSettings();
  const [currencies, setCurrencies] = useState<Currency[]>([defaultCurrency]);
  const [selectedCurrency, setSelectedCurrency] = useState<Currency>(defaultCurrency);
  const [baseCurrency, setBaseCurrency] = useState<Currency>(defaultCurrency);
  const [selectedCountry, setSelectedCountry] = useState<string>("United States");
  const [mounted, setMounted] = useState(false);

  // Server rates layered over the bundled fallbacks. Derived, not merged into
  // the module-level `USD_RATES` — that table is shared across every render on
  // the server, so mutating it would leak one request's rates into the next.
  const usdRates = useMemo(() => {
    if (!rates) return USD_RATES;
    const merged: typeof USD_RATES = { ...USD_RATES };
    for (const [code, rate] of Object.entries(rates)) {
      merged[code] = { symbol: merged[code]?.symbol ?? getSymbolForCurrencyCode(code), rate };
    }
    return merged;
  }, [rates]);

  useEffect(() => {
    if (settingsLoading) return;

    async function fetchCurrencies() {
      try {
        {
          const data = settings;
          {
            if (data.supported_currencies) {
              const parsed = JSON.parse(data.supported_currencies);
              if (Array.isArray(parsed) && parsed.length > 0) {
                // Store currency from settings — resolved before any visitor-specific
                // currency gets appended to `parsed` below.
                setBaseCurrency(parsed.find(c => c.rate === 1) || parsed[0]);

                // Load saved country preference from localStorage
                let country = localStorage.getItem("ag_country");
                if (!country) {
                  try {
                    const detectRes = await fetch("/api/detect-country");
                    if (detectRes.ok) {
                      const detectText = await detectRes.text();
                      if (detectText && detectText.trim().startsWith("{")) {
                        const detectData = JSON.parse(detectText);
                        if (detectData && detectData.country) {
                          country = detectData.country;
                        }
                      }
                    }
                  } catch (e) {
                    console.warn("Server geolocation failed, using timezone fallback:", e);
                  }
                if (!country) {
                  country = detectCountryFromTimezone();
                }
                localStorage.setItem("ag_country", country);
              }
              setSelectedCountry(country);

              // Load saved currency preference from localStorage
              const savedCode = localStorage.getItem("ag_currency");
              if (savedCode) {
                let saved = parsed.find(c => c.code === savedCode);
                if (!saved) {
                  const baseCurrency = parsed.find(c => c.rate === 1) || parsed[0];
                  const baseRateInUSD = usdRates[baseCurrency.code]?.rate || 117.0;
                  const targetRateInfo = usdRates[savedCode];
                  if (targetRateInfo) {
                    saved = {
                      code: savedCode,
                      symbol: targetRateInfo.symbol,
                      rate: targetRateInfo.rate / baseRateInUSD
                    };
                    parsed.push(saved);
                  }
                }
                setCurrencies(parsed);
                if (saved) {
                  setSelectedCurrency(saved);
                } else {
                  setSelectedCurrency(parsed[0]);
                }
              } else {
                // Determine currency based on country
                const countryCurrCode = getCurrencyForCountry(country);
                let matchedCurr = parsed.find(c => c.code === countryCurrCode);
                if (!matchedCurr) {
                  const baseCurrency = parsed.find(c => c.rate === 1) || parsed[0];
                  const baseRateInUSD = usdRates[baseCurrency.code]?.rate || 117.0;
                  const targetRateInfo = usdRates[countryCurrCode];
                  if (targetRateInfo) {
                    matchedCurr = {
                      code: countryCurrCode,
                      symbol: targetRateInfo.symbol,
                      rate: targetRateInfo.rate / baseRateInUSD
                    };
                    parsed.push(matchedCurr);
                  }
                }
                setCurrencies(parsed);
                if (matchedCurr) {
                  setSelectedCurrency(matchedCurr);
                  localStorage.setItem("ag_currency", countryCurrCode);
                } else {
                  setSelectedCurrency(parsed[0]);
                }
              }
            }
          }
        }
      }
    } catch (err) {
        console.error("Failed to load currencies", err);
      } finally {
        setMounted(true);
      }
    }
    fetchCurrencies();
  }, [settings, settingsLoading, usdRates]);

  const setCurrency = (code: string) => {
    const curr = currencies.find(c => c.code === code);
    if (curr) {
      setSelectedCurrency(curr);
      localStorage.setItem("ag_currency", code);
    }
  };

  const setCountryAndCurrency = (country: string, currencyCode: string) => {
    setSelectedCountry(country);
    localStorage.setItem("ag_country", country);

    let curr = currencies.find(c => c.code === currencyCode);
    if (!curr) {
      const baseCurrency = currencies.find(c => c.rate === 1) || currencies[0] || defaultCurrency;
      const baseRateInUSD = usdRates[baseCurrency.code]?.rate || 117.0;
      const targetRateInfo = usdRates[currencyCode];
      if (targetRateInfo) {
        curr = {
          code: currencyCode,
          symbol: targetRateInfo.symbol,
          rate: targetRateInfo.rate / baseRateInUSD
        };
        setCurrencies(prev => {
          if (prev.some(c => c.code === currencyCode)) return prev;
          return [...prev, curr!];
        });
      }
    }

    if (curr) {
      setSelectedCurrency(curr);
      localStorage.setItem("ag_currency", currencyCode);
    } else {
      const baseCurrency = currencies.find(c => c.rate === 1) || currencies[0] || defaultCurrency;
      setSelectedCurrency(baseCurrency);
      localStorage.setItem("ag_currency", baseCurrency.code);
    }
  };

  const convertPrice = (usdPrice: number) => {
    return usdPrice * selectedCurrency.rate;
  };

  const formatPrice = (usdPrice: number) => {
    const converted = convertPrice(usdPrice);
    
    // Formatting rules: 
    // If it's a zero decimal currency (like BDT or JPY), we might not want decimals.
    // But for simplicity, we'll keep 2 decimal places unless it's perfectly round
    const formatted = converted.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
    
    return `${selectedCurrency.symbol}${formatted}`;
  };

  const formatBasePrice = (basePrice: number) => {
    const formatted = basePrice.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });

    return `${baseCurrency.symbol}${formatted}`;
  };

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <CurrencyContext.Provider value={{ 
      currencies,
      selectedCurrency,
      baseCurrency,
      setCurrency,
      formatPrice,
      formatBasePrice,
      convertPrice,
      selectedCountry,
      setCountryAndCurrency
    }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
