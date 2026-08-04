import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { invalidateSettingsCache } from "@/lib/settings"

// GET shipping settings
export async function GET() {
  try {
    const settings = await prisma.setting.findMany({
      where: {
        key: {
          in: ["shipping_flat_rate", "shipping_free_threshold", "shipping_enabled"]
        }
      }
    })
    const obj: Record<string, string> = {}
    settings.forEach(s => { obj[s.key] = s.value })

    return NextResponse.json({
      shipping_enabled: obj["shipping_enabled"] ?? "true",
      shipping_flat_rate: obj["shipping_flat_rate"] ?? "60",
      shipping_free_threshold: obj["shipping_free_threshold"] ?? "1000",
    })
  } catch (error) {
    return NextResponse.json({ message: "Failed to load shipping settings" }, { status: 500 })
  }
}

// POST — save shipping settings
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { shipping_enabled, shipping_flat_rate, shipping_free_threshold } = body

    const updates = [
      { key: "shipping_enabled", value: String(shipping_enabled ?? "true") },
      { key: "shipping_flat_rate", value: String(shipping_flat_rate ?? "60") },
      { key: "shipping_free_threshold", value: String(shipping_free_threshold ?? "1000") },
    ]

    for (const { key, value } of updates) {
      await prisma.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    }

    await invalidateSettingsCache()

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ message: "Failed to save shipping settings" }, { status: 500 })
  }
}
