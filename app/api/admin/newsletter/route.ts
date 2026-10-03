import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getAdminPayload } from "@/lib/auth";
import { sendNewsletter } from "@/lib/email";

export async function POST(req: NextRequest) {
  try {
    await getAdminPayload(req);
  } catch {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  try {
    const { subject, message, target } = await req.json();

    if (!subject || !message) {
      return NextResponse.json({ message: "Subject and message are required." }, { status: 400 });
    }

    const emails = new Set<string>();

    if (target === "all" || target === "subscribers") {
      const subs = await prisma.subscriber.findMany({ select: { email: true } });
      subs.forEach((s) => emails.add(s.email.trim().toLowerCase()));
    }

    if (target === "all" || target === "customers") {
      const users = await prisma.user.findMany({
        where: {
          role: "USER",
          // Guest checkouts create placeholder accounts; they never signed up.
          NOT: { password: { startsWith: "GUEST_" } },
        },
        select: { email: true },
      });
      users.forEach((u) => emails.add(u.email.trim().toLowerCase()));
    }

    const recipients = Array.from(emails).filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (recipients.length === 0) {
      return NextResponse.json({ message: "No recipients found for the selected target." }, { status: 400 });
    }

    // One email per recipient — nobody sees anyone else's address.
    const { sent, failed } = await sendNewsletter(recipients, String(subject), String(message));

    if (sent === 0) {
      return NextResponse.json({ message: "Sending failed for every recipient. Check the email settings." }, { status: 502 });
    }

    return NextResponse.json({ success: true, count: sent, failed });
  } catch (error) {
    console.error("[NEWSLETTER_SEND_ERROR]", error);
    return NextResponse.json({ message: "Failed to send newsletter." }, { status: 500 });
  }
}
