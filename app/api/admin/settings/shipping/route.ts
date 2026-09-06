import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { invalidateSettingsCache } from "@/lib/settings"
import {
  SHIPPING_METHODS_KEY,
  parseShippingMethods,
  slugifyMethodId,
  type ShippingMethod,
} from "@/lib/shipping"
import { WAREHOUSE_KEY, parseWarehouse } from "@/lib/warehouse"
import { maskUpsConfig, upsConfigFromSettings } from "@/lib/upsConfig"

const UPS_KEYS = [
  "ups_enabled",
  "ups_environment",
  "ups_client_id",
  "ups_client_secret",
  "ups_account_number",
]

// Sent back in place of a stored secret, and refused on the way in — the form
// posts it unchanged whenever the operator did not type a new one.
const SECRET_PLACEHOLDER = "__unchanged__"

// GET shipping settings
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const settings = await prisma.setting.findMany({
      where: { key: { in: ["shipping_enabled", SHIPPING_METHODS_KEY, WAREHOUSE_KEY, ...UPS_KEYS] } },
    })
    const obj: Record<string, string> = {}
    settings.forEach(s => { obj[s.key] = s.value })

    return NextResponse.json({
      shipping_enabled: obj["shipping_enabled"] ?? "true",
      shipping_methods: parseShippingMethods(obj[SHIPPING_METHODS_KEY]),
      warehouse_address: parseWarehouse(obj[WAREHOUSE_KEY]),
      // Masked: the secret itself is never returned, only whether one exists.
      ...maskUpsConfig(upsConfigFromSettings(obj)),
    })
  } catch (error) {
    console.error("[ADMIN_SHIPPING_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load shipping settings" }, { status: 500 })
  }
}

// POST — save shipping settings
export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const { shipping_enabled, shipping_methods, warehouse_address } = body

    const incoming = Array.isArray(shipping_methods) ? shipping_methods : []
    if (incoming.length === 0) {
      return NextResponse.json(
        { message: "At least one shipping method is required." },
        { status: 400 }
      )
    }

    // Ids are assigned here rather than in the browser so a renamed method
    // keeps the id already stored on past orders, and two methods can never
    // collide on one id.
    const seen = new Set<string>()
    const methods: ShippingMethod[] = []

    for (const [i, row] of incoming.entries()) {
      const name = String(row?.name ?? "").trim()
      if (!name) {
        return NextResponse.json(
          { message: `Shipping method ${i + 1} needs a name.` },
          { status: 400 }
        )
      }

      const price = Number(row?.price)
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json(
          { message: `"${name}" needs a price of 0 or more.` },
          { status: 400 }
        )
      }

      let id = String(row?.id ?? "").trim() || slugifyMethodId(name, `method-${i + 1}`)
      while (seen.has(id)) id = `${id}-${i + 1}`
      seen.add(id)

      methods.push({
        id,
        name,
        deliveryTime: String(row?.deliveryTime ?? "").trim(),
        price: Math.round(price * 100) / 100,
        active: row?.active !== false,
      })
    }

    if (!methods.some(m => m.active)) {
      return NextResponse.json(
        { message: "Keep at least one shipping method active — checkout needs something to offer." },
        { status: 400 }
      )
    }

    const updates: Array<{ key: string; value: string }> = [
      { key: "shipping_enabled", value: String(shipping_enabled ?? "true") },
      { key: SHIPPING_METHODS_KEY, value: JSON.stringify(methods) },
      { key: WAREHOUSE_KEY, value: JSON.stringify(parseWarehouse(warehouse_address)) },
      { key: "ups_enabled", value: String(body.ups_enabled === true || body.ups_enabled === "true") },
      { key: "ups_environment", value: body.ups_environment === "production" ? "production" : "sandbox" },
      { key: "ups_client_id", value: String(body.ups_client_id ?? "").trim() },
      { key: "ups_account_number", value: String(body.ups_account_number ?? "").trim() },
    ]

    // Only overwrite the secret when a replacement was actually typed, so
    // saving an unrelated change cannot wipe working credentials.
    const incomingSecret = String(body.ups_client_secret ?? "")
    if (incomingSecret && incomingSecret !== SECRET_PLACEHOLDER) {
      updates.push({ key: "ups_client_secret", value: incomingSecret.trim() })
    }

    for (const { key, value } of updates) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }

    await invalidateSettingsCache()

    const saved = await prisma.setting.findMany({ where: { key: { in: UPS_KEYS } } })
    const savedObj: Record<string, string> = {}
    saved.forEach(row => { savedObj[row.key] = row.value })

    return NextResponse.json({
      success: true,
      shipping_methods: methods,
      warehouse_address: parseWarehouse(warehouse_address),
      ...maskUpsConfig(upsConfigFromSettings(savedObj)),
    })
  } catch (error) {
    console.error("[ADMIN_SHIPPING_POST_ERROR]", error)
    return NextResponse.json({ message: "Failed to save shipping settings" }, { status: 500 })
  }
}
