import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAdminPayload } from "@/lib/auth"

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function PUT(
  req: NextRequest,
  { params }: Params
) {
  try {
    await getAdminPayload(req)
  } catch (err: any) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params
    const body = await req.json()
    const { answer } = body

    if (!answer) {
      return NextResponse.json(
        { message: "Answer is required" },
        { status: 400 }
      )
    }

    const question = await prisma.productQuestion.update({
      where: { id },
      data: {
        answer,
        status: "ANSWERED"
      }
    })

    return NextResponse.json(question)
  } catch (error) {
    console.log("[ADMIN_QUESTION_PUT]", error)
    return NextResponse.json(
      { message: "Failed to answer question" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: Params
) {
  try {
    await getAdminPayload(req)
  } catch (err: any) {
    return NextResponse.json({ message: 'Unauthorized' }, { status: 401 })
  }

  try {
    const { id } = await params

    await prisma.productQuestion.delete({
      where: { id }
    })

    return NextResponse.json({ message: "Deleted successfully" })
  } catch (error) {
    console.log("[ADMIN_QUESTION_DELETE]", error)
    return NextResponse.json(
      { message: "Failed to delete question" },
      { status: 500 }
    )
  }
}
