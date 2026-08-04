import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json()
    const { role } = body // e.g. "ADMIN" or "USER"

    if (!role) {
      return NextResponse.json({ message: "Role is required" }, { status: 400 })
    }

    const user = await prisma.user.update({
      where: { id },
      data: { role }
    })

    return NextResponse.json(user)
  } catch (error: any) {
    console.error("[USERS_PUT]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    
    // Check if user is the last admin before deleting?
    // Let's just delete the user for now
    await prisma.user.delete({
      where: { id }
    })
    
    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("[USERS_DELETE]", error)
    return NextResponse.json({ message: "Internal Server Error" }, { status: 500 })
  }
}
