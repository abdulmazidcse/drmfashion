import { NextRequest, NextResponse } from "next/server"
import { revalidatePath } from "next/cache"
import { prisma } from "@/lib/prisma"
import { invalidateCache } from "@/lib/redis"
import { invalidateSettingsCache } from "@/lib/settings"

export async function GET() {
  try {
    const settings = await prisma.setting.findMany()
    
    // Convert array to object { key: value }
    const settingsObj = settings.reduce((acc: Record<string, string>, setting) => {
      acc[setting.key] = setting.value
      return acc
    }, {})

    // Default values if not present
    if (!settingsObj["reward_point_value"]) {
      settingsObj["reward_point_value"] = "1" // Default: 1 Point = $1
    }
    if (!settingsObj["reward_point_earn_rate"]) {
      settingsObj["reward_point_earn_rate"] = "10" // Default: Earn 1 Point per $10
    }

    return NextResponse.json(settingsObj)
  } catch (error: any) {
    console.error("[SETTINGS_GET]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    // body is an object of { key: value }
    
    const updatePromises = Object.entries(body).map(([key, value]) => {
      return prisma.setting.upsert({
        where: { key },
        update: { value: String(value) },
        create: { key, value: String(value) }
      })
    })

    await Promise.all(updatePromises)

    // Invalidate cached home page settings so updates show immediately
    try {
      await invalidateSettingsCache()
      await invalidateCache("home:hero:slides")
      await invalidateCache("home:community:tabs")
      await invalidateCache("home:flash_sale:products_data")
      await invalidateCache("home:style:sections")
      await invalidateCache("home:style:sections:v2")
      await invalidateCache("home:reels")
      await invalidateCache("home:videoBanners:v1")
      await invalidateCache("home:icons:v1")
      await invalidateCache("home:showcase:v1")
    } catch (e) {
      console.warn("Could not invalidate settings cache:", e)
    }

    revalidatePath("/")

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[SETTINGS_POST]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
