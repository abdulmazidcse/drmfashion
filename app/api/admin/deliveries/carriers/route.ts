import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { getSettings, invalidateSettingsCache } from "@/lib/settings"
import {
  DELIVERY_CARRIERS_KEY,
  TRACKING_PLACEHOLDER,
  carriersFromSettings,
  parseDeliveryCarriers,
  type DeliveryCarrier,
} from "@/lib/delivery"

/** The carriers as the delivery dialog should see them. */
export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const settings = await getSettings()
    return NextResponse.json(carriersFromSettings(settings))
  } catch (error) {
    console.error("[ADMIN_DELIVERIES_CARRIERS_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load carriers." }, { status: 500 })
  }
}

/** Replaces the carrier list. Body: `{ carriers: DeliveryCarrier[] }`. */
export async function PUT(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const body = await req.json()
    const input = body?.carriers
    if (!Array.isArray(input) || input.length === 0) {
      return NextResponse.json({ message: "At least one carrier is required." }, { status: 400 })
    }

    const validated: DeliveryCarrier[] = []
    for (let i = 0; i < input.length; i++) {
      const row = input[i]
      const name = typeof row?.name === "string" ? row.name.trim() : ""
      const template = typeof row?.trackingUrlTemplate === "string" ? row.trackingUrlTemplate.trim() : ""
      if (!name) {
        return NextResponse.json({ message: `Carrier #${i + 1} needs a name.` }, { status: 400 })
      }
      if (template) {
        if (!/^https?:\/\//i.test(template)) {
          return NextResponse.json({ message: `"${name}": the tracking URL must start with http:// or https://.` }, { status: 400 })
        }
        if (!template.includes(TRACKING_PLACEHOLDER)) {
          return NextResponse.json({ message: `"${name}": the tracking URL must contain ${TRACKING_PLACEHOLDER}.` }, { status: 400 })
        }
      }
      validated.push({
        id: typeof row?.id === "string" ? row.id : "",
        name,
        trackingUrlTemplate: template,
        active: row?.active !== false,
      })
    }

    // Same normaliser the readers use, so what's stored is what comes back.
    const carriers = parseDeliveryCarriers(validated)
    const value = JSON.stringify(carriers)

    await prisma.setting.upsert({
      where: { key: DELIVERY_CARRIERS_KEY },
      update: { value },
      create: { key: DELIVERY_CARRIERS_KEY, value },
    })
    await invalidateSettingsCache()

    return NextResponse.json(carriers)
  } catch (error) {
    console.error("[ADMIN_DELIVERIES_CARRIERS_PUT_ERROR]", error)
    return NextResponse.json({ message: "Failed to save carriers." }, { status: 500 })
  }
}
