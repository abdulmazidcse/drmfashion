import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

export async function GET(req: NextRequest) {
  try {
    await getAdminPayload(req)
  } catch (err: any) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const questions = await prisma.productQuestion.findMany({
      orderBy: {
        createdAt: "desc"
      },
      include: {
        product: {
          select: { title: true, slug: true }
        }
      }
    })

    return NextResponse.json(questions)
  } catch (error) {
    console.log("[ADMIN_QUESTIONS_GET]", error)
    return NextResponse.json(
      { message: "Failed to fetch questions" },
      { status: 500 }
    )
  }
}
