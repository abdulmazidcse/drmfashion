import { NextRequest, NextResponse } from "next/server";

// Mapping of 2-letter country codes to full country names
const COUNTRY_MAP: Record<string, string> = {
  BD: "Bangladesh",
  IN: "India",
  PK: "Pakistan",
  JP: "Japan",
  CN: "China",
  SG: "Singapore",
  SA: "Saudi Arabia",
  AE: "United Arab Emirates",
  MY: "Malaysia",
  ID: "Indonesia",
  TH: "Thailand",
  KR: "South Korea",
  GB: "United Kingdom",
  DE: "Germany",
  FR: "France",
  IT: "Italy",
  ES: "Spain",
  NL: "Netherlands",
  SE: "Sweden",
  CH: "Switzerland",
  IE: "Ireland",
  BE: "Belgium",
  US: "United States",
  CA: "Canada",
  MX: "Mexico",
  AU: "Australia",
  NZ: "New Zealand",
  FJ: "Fiji",
  BR: "Brazil",
  AR: "Argentina",
  CO: "Colombia",
  CL: "Chile",
  PE: "Peru",
  EG: "Egypt",
  ZA: "South Africa",
  NG: "Nigeria",
  KE: "Kenya",
  MA: "Morocco",
  GH: "Ghana",
  CR: "Costa Rica",
  PA: "Panama",
  GT: "Guatemala",
  HN: "Honduras",
  SV: "El Salvador"
};

export async function GET(req: NextRequest) {
  try {
    // 1. Check Cloudflare header if proxy is enabled
    const cfCountry = req.headers.get("cf-ipcountry");
    if (cfCountry && cfCountry !== "XX") {
      const countryName = COUNTRY_MAP[cfCountry.toUpperCase()];
      if (countryName) {
        return NextResponse.json({ country: countryName });
      }
    }

    // 2. Fallback to Server-Side IP lookup using FreeIPAPI (GDPR compliant & memory-free)
    const forwardedFor = req.headers.get("x-forwarded-for");
    const ip = forwardedFor 
      ? forwardedFor.split(",")[0].trim() 
      : (req as any).ip || req.headers.get("x-real-ip");

    if (ip && ip !== "127.0.0.1" && ip !== "::1") {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      try {
        const ipRes = await fetch(`https://freeipapi.com/api/json/${ip}`, {
          signal: controller.signal
        });
        clearTimeout(timeoutId);
        if (ipRes.ok) {
          const ipData = await ipRes.json();
          if (ipData && ipData.countryName) {
            return NextResponse.json({ country: ipData.countryName });
          }
        }
      } catch (err) {
        console.warn("Detect country fetch failed or timed out:", err);
      }
    }

    return NextResponse.json({ country: null });
  } catch (error) {
    console.error("Detect country API error:", error);
    return NextResponse.json({ country: null });
  }
}
