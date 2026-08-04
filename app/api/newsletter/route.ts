import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { email, firstName, shopFor } = await req.json();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, message: "Invalid email address" },
        { status: 400 }
      );
    }

    // Check if already subscribed
    const existing = await prisma.subscriber.findUnique({
      where: { email },
    });

    if (existing) {
      // Update firstName/shopFor if they changed
      if (firstName || shopFor) {
        await prisma.subscriber.update({
          where: { email },
          data: {
            ...(firstName ? { firstName } : {}),
            ...(shopFor ? { shopFor } : {}),
          },
        });
      }
      return NextResponse.json(
        { success: true, message: "You are already subscribed!" },
        { status: 200 }
      );
    }

    // Create new subscriber
    await prisma.subscriber.create({
      data: { email, firstName: firstName || null, shopFor: shopFor || null },
    });

    return NextResponse.json(
      { success: true, message: "Successfully subscribed!" },
      { status: 200 }
    );
  } catch (error) {
    console.error("[NEWSLETTER_POST]", error);
    return NextResponse.json(
      { success: false, message: "Failed to subscribe" },
      { status: 500 }
    );
  }
}
