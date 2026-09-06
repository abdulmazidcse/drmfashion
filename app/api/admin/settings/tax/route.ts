import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { invalidateSettingsCache } from "@/lib/settings"
import { TAX_RATES_KEY, parseTaxRates, taxRateId, type TaxRate } from "@/lib/tax"

const KEYS = [
  "tax_enabled",
  "tax_on_shipping",
  "tax_default_rate",
  "tax_default_label",
  TAX_RATES_KEY,
]

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const settings = await prisma.setting.findMany({ where: { key: { in: KEYS } } })
    const obj: Record<string, string> = {}
    settings.forEach(s => { obj[s.key] = s.value })

    return NextResponse.json({
      tax_enabled: obj["tax_enabled"] ?? "true",
      tax_on_shipping: obj["tax_on_shipping"] ?? "true",
      tax_default_rate: obj["tax_default_rate"] ?? "0",
      tax_default_label: obj["tax_default_label"] ?? "Tax",
      tax_rates: parseTaxRates(obj[TAX_RATES_KEY]),
    })
  } catch (error) {
    console.error("[ADMIN_TAX_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load tax settings" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const incoming = Array.isArray(body.tax_rates) ? body.tax_rates : []

    // Ids are derived server-side so a renamed or re-cased row keeps the id
    // already written onto past orders.
    const seen = new Set<string>()
    const rates: TaxRate[] = []

    for (const [i, row] of incoming.entries()) {
      const country = String(row?.country ?? "").trim().toUpperCase()
      const state = String(row?.state ?? "").trim().toUpperCase()

      if (!country || !state) {
        return NextResponse.json(
          { message: `Row ${i + 1} needs both a country and a state/province.` },
          { status: 400 }
        )
      }

      const rate = Number(row?.rate)
      if (!Number.isFinite(rate) || rate < 0 || rate > 100) {
        return NextResponse.json(
          { message: `${country}-${state} needs a rate between 0 and 100.` },
          { status: 400 }
        )
      }

      let id = String(row?.id ?? "").trim() || taxRateId(country, state, `rate-${i + 1}`)
      // A duplicate country+state pair would make the lookup order-dependent:
      // two rows for Ontario and whichever sorted first would silently win.
      const pairKey = `${country}:${state}`
      if (seen.has(pairKey)) {
        return NextResponse.json(
          { message: `${country}-${state} is listed twice. Keep one rate per state.` },
          { status: 400 }
        )
      }
      seen.add(pairKey)

      rates.push({
        id,
        country,
        state,
        label: String(row?.label ?? "").trim() || "Tax",
        rate,
        active: row?.active !== false,
      })
    }

    const defaultRate = Number(body.tax_default_rate)
    if (!Number.isFinite(defaultRate) || defaultRate < 0 || defaultRate > 100) {
      return NextResponse.json(
        { message: "Default tax rate must be between 0 and 100." },
        { status: 400 }
      )
    }

    const updates: Array<{ key: string; value: string }> = [
      { key: "tax_enabled", value: String(body.tax_enabled ?? "true") },
      { key: "tax_on_shipping", value: String(body.tax_on_shipping ?? "true") },
      { key: "tax_default_rate", value: String(defaultRate) },
      { key: "tax_default_label", value: String(body.tax_default_label ?? "Tax").trim() || "Tax" },
      { key: TAX_RATES_KEY, value: JSON.stringify(rates) },
    ]

    for (const { key, value } of updates) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }

    await invalidateSettingsCache()

    return NextResponse.json({ success: true, tax_rates: rates })
  } catch (error) {
    console.error("[ADMIN_TAX_POST_ERROR]", error)
    return NextResponse.json({ message: "Failed to save tax settings" }, { status: 500 })
  }
}
