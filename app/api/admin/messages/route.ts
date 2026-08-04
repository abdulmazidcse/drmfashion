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
    const messages = await prisma.contactMessage.findMany({
      orderBy: { createdAt: "desc" },
    })
    return NextResponse.json(messages)
  } catch (error) {
    console.error("[ADMIN_MESSAGES_GET]", error)
    return NextResponse.json({ message: "Failed to load messages" }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id, handled } = await req.json()
    if (!id) return NextResponse.json({ message: "Message id is required." }, { status: 400 })

    await prisma.contactMessage.update({
      where: { id },
      data: { handled: !!handled },
    })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ADMIN_MESSAGES_PATCH]", error)
    return NextResponse.json({ message: "Failed to update message" }, { status: 500 })
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
    if (!id) return NextResponse.json({ message: "Message id is required." }, { status: 400 })

    await prisma.contactMessage.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("[ADMIN_MESSAGES_DELETE]", error)
    return NextResponse.json({ message: "Failed to delete message" }, { status: 500 })
  }
}
