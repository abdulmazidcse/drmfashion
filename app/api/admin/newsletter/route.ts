import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendEmail } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    const { subject, message, target } = await req.json();

    if (!subject || !message) {
      return NextResponse.json({ message: "Subject and message are required." }, { status: 400 });
    }

    let emails = new Set<string>();

    if (target === "all" || target === "subscribers") {
      const subs = await prisma.subscriber.findMany();
      subs.forEach((s) => emails.add(s.email));
    }

    if (target === "all" || target === "customers") {
      const users = await prisma.user.findMany({ where: { role: "USER" } });
      users.forEach((u) => emails.add(u.email));
    }

    const emailArray = Array.from(emails);

    if (emailArray.length === 0) {
      return NextResponse.json({ message: "No recipients found for the selected target." }, { status: 400 });
    }

    // In a production environment with Resend, you'd batch this or send via loops.
    // We will do a basic loop, sending to the Bcc of the business email or directly if under limit.
    // For Resend we can pass an array to `to` up to 50 recipients, or just map promises.
    
    // Batch in chunks of 50
    const chunkSize = 50;
    for (let i = 0; i < emailArray.length; i += chunkSize) {
      const chunk = emailArray.slice(i, i + chunkSize);
      await sendEmail({
        to: chunk,
        subject: subject,
        html: message,
      });
    }

    return NextResponse.json({ success: true, count: emailArray.length });
  } catch (error: any) {
    console.error("[NEWSLETTER_SEND_ERROR]", error);
    return NextResponse.json({ message: "Internal server error", error: error.message }, { status: 500 });
  }
}
