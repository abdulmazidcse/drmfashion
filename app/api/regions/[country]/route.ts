import { NextRequest, NextResponse } from "next/server"
import { regionsForCountry } from "@/lib/regionsServer"

/**
 * Provinces/states for one country, for the address and tax-rate forms.
 *
 * The underlying dataset is static, so the response is immutable for as long as
 * the deployment lives — a long browser cache keeps the checkout country
 * selector from re-fetching on every change.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ country: string }> }
) {
  const { country } = await params

  if (!country || !/^[A-Za-z]{2}$/.test(country)) {
    return NextResponse.json({ message: "A two-letter country code is required." }, { status: 400 })
  }

  return NextResponse.json(
    { country: country.toUpperCase(), regions: regionsForCountry(country) },
    { headers: { "Cache-Control": "public, max-age=86400, immutable" } }
  )
}
