import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const subscribers = await prisma.subscriber.findMany({
      orderBy: { subscribedAt: "desc" },
    })
    return NextResponse.json(subscribers)
  } catch (error) {
    console.error("[ADMIN_SUBSCRIBERS_GET]", error)
    return NextResponse.json({ message: "Failed to load subscribers" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { searchParams } = new URL(req.url)
    const id = searchParams.get("id")

    if (!id) {
      return NextResponse.json({ message: "Subscriber id is required." }, { status: 400 })
    }

    await prisma.subscriber.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ADMIN_SUBSCRIBERS_DELETE]", error)
    return NextResponse.json({ message: "Failed to delete subscriber" }, { status: 500 })
  }
}
