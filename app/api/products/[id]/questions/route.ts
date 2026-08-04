import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { rateLimit } from "@/lib/rateLimit"
import { qaSchema } from "@/lib/validations"

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function GET(
  req: NextRequest,
  { params }: Params
) {
  try {
    const { id } = await params

    const questions = await prisma.productQuestion.findMany({
      where: {
        productId: id,
        status: "ANSWERED"
      },
      orderBy: {
        createdAt: "desc"
      },
      include: {
        user: {
          select: { name: true }
        }
      }
    })

    const mappedQuestions = questions.map((q) => ({
      ...q,
      name: q.user?.name || q.userName || "Guest",
    }))

    return NextResponse.json(mappedQuestions)
  } catch (error) {
    console.log("[QUESTIONS_GET]", error)
    return NextResponse.json(
      { message: "Failed to fetch questions" },
      { status: 500 }
    )
  }
}

export async function POST(
  req: NextRequest,
  { params }: Params
) {
  try {
    // Basic IP rate limiting: 5 requests per 10 minutes for questions
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { success } = rateLimit(`qa:${ip}`, 5, 10 * 60 * 1000);
    if (!success) {
      return NextResponse.json({ message: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { id } = await params
    const body = await req.json()
    const validatedData = qaSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ message: validatedData.error.issues[0].message }, { status: 400 });
    }

    const { question, name, email } = validatedData.data;

    const newQuestion = await prisma.productQuestion.create({
      data: {
        productId: id,
        question,
        userName: name,
        status: "PENDING"
      }
    })

    return NextResponse.json(newQuestion)
  } catch (error) {
    console.log("[QUESTIONS_POST]", error)
    return NextResponse.json(
      { message: "Failed to post question" },
      { status: 500 }
    )
  }
}
