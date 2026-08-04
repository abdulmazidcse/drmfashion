import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { reviewSchema } from "@/lib/validations";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const reviews = await prisma.review.findMany({
      where: { productId: id },
      include: {
        user: { select: { name: true } }
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(reviews, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { success: false, message: "Failed to fetch reviews" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    // Basic IP rate limiting: 5 requests per 10 minutes for reviews
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { success } = rateLimit(`review:${ip}`, 5, 10 * 60 * 1000);
    if (!success) {
      return NextResponse.json({ success: false, message: "Too many requests. Please try again later." }, { status: 429 });
    }

    const { id } = await params;
    // Basic auth check (if token present). Since we have no NextAuth, we'll accept guest reviews for now,
    // or link it to a generic user if we must. The schema requires a `userId`.
    // Let's find or create a guest user.
    let guestUser = await prisma.user.findFirst({ where: { email: "guest@store.local" } });
    if (!guestUser) {
      guestUser = await prisma.user.create({
        data: { name: "Guest User", email: "guest@store.local", password: "guestpassword" }
      });
    }

    const body = await req.json();
    const validatedData = reviewSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ success: false, message: validatedData.error.issues[0].message }, { status: 400 });
    }

    const { rating, comment, name } = validatedData.data;

    // If name is provided, maybe we update the guest name or just append it to comment
    const finalComment = name ? `${name}: ${comment}` : comment;

    const review = await prisma.review.create({
      data: {
        productId: id,
        userId: guestUser.id,
        rating: Number(rating),
        comment: finalComment
      },
      include: {
        user: { select: { name: true } }
      }
    });

    return NextResponse.json({ success: true, review }, { status: 201 });
  } catch (error) {
    console.error("[REVIEWS_POST]", error);
    return NextResponse.json(
      { success: false, message: "Failed to post review" },
      { status: 500 }
    );
  }
}
