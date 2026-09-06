import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"
import { returnRequestInclude } from "@/lib/returns"

type Params = {
  params: Promise<{
    id: string
  }>
}

// GET — Single return request with order / payment / item details (Admin)
export async function GET(req: NextRequest, { params }: Params) {
  try {
    await getAdminPayload(req)
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 })
  }

  try {
    const { id } = await params
    const returnReq = await prisma.returnRequest.findUnique({
      where: { id },
      include: returnRequestInclude,
    })

    if (!returnReq) {
      return NextResponse.json({ message: "Return request not found" }, { status: 404 })
    }

    return NextResponse.json(returnReq)
  } catch (error) {
    console.error("[ADMIN_RETURN_GET_ERROR]", error)
    return NextResponse.json({ message: "Failed to load return" }, { status: 500 })
  }
}
