import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSettings, getStoreName } from "@/lib/settings";
import { sendEmail } from "@/lib/email";

/**
 * Email the sign-up discount code.
 *
 * The code itself comes from Settings → Promo Popup, the same value the drawer
 * reveals on screen. Whether it is actually redeemable depends on the matching
 * Coupon row (admin → Coupons); this only delivers it.
 */
async function sendWelcomeDiscount(email: string, firstName?: string) {
  const [settings, storeName] = await Promise.all([getSettings(), getStoreName()]);
  const code = settings.promo_popup_code?.trim();
  if (!code) return;

  const highlight = settings.promo_popup_highlight?.trim() || "a discount";
  const greeting = firstName ? `Hi ${firstName},` : "Hi,";

  await sendEmail({
    to: email,
    subject: `Your ${highlight} code for ${storeName}`,
    html: `
      <div style="font-family:Helvetica,Arial,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;color:#18181b">
        <p style="font-size:14px;line-height:22px">${greeting}</p>
        <p style="font-size:14px;line-height:22px">
          Thanks for joining ${storeName}. Here is ${highlight} on your first order:
        </p>
        <p style="margin:28px 0;text-align:center">
          <span style="display:inline-block;border:2px dashed #18181b;padding:14px 28px;font-size:22px;font-weight:bold;letter-spacing:3px">
            ${code}
          </span>
        </p>
        <p style="font-size:13px;line-height:21px;color:#52525b">
          Apply it at checkout using this email address. One use per customer.
        </p>
      </div>
    `,
  });
}

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

    // The welcome discount was only ever shown on screen, so anyone who closed
    // the drawer lost it. Mail it too — but never let a mail failure roll back
    // a subscription the visitor already completed.
    await sendWelcomeDiscount(email, firstName).catch((e) =>
      console.warn("[NEWSLETTER_DISCOUNT_EMAIL]", e)
    );

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
