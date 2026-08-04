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
    const reviews = await prisma.review.findMany({
      include: {
        user: true,
        product: {
          include: {
            images: true,
          }
        }
      },
      orderBy: {
        createdAt: "desc"
      }
    })

    const formattedReviews = reviews.map(r => ({
      id: r.id,
      userName: r.user.name,
      userAvatar: r.user.name.substring(0, 2).toUpperCase(),
      rating: r.rating,
      comment: r.comment || "",
      date: r.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
      productName: r.product.title,
      productImage: r.product.thumbnail || (r.product.images[0]?.url) || "",
      status: "APPROVED" // Fake status since we don't have moderation field in schema
    }))

    return NextResponse.json(formattedReviews)
  } catch (error) {
    return NextResponse.json({ message: "Error" }, { status: 500 })
  }
}
