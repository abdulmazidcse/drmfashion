import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/rateLimit";
import { stockAlertSchema } from "@/lib/validations";

export async function POST(req: Request) {
  try {
    // Basic IP rate limiting: 5 requests per 5 minutes
    const ip = req.headers.get("x-forwarded-for") || "unknown";
    const { success } = rateLimit(`stock-alert:${ip}`, 5, 5 * 60 * 1000);
    if (!success) {
      return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
    }

    const body = await req.json();
    const validatedData = stockAlertSchema.safeParse(body);

    if (!validatedData.success) {
      return NextResponse.json({ error: validatedData.error.issues[0].message }, { status: 400 });
    }

    const { email, variantId } = validatedData.data;

    const alert = await prisma.stockAlert.create({
      data: {
        email,
        variantId,
      },
    });

    return NextResponse.json({ success: true, alert });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "You are already subscribed to alerts for this item." }, { status: 400 });
    }
    console.error("Stock Alert Error:", error);
    return NextResponse.json({ error: "Failed to create alert" }, { status: 500 });
  }
}
