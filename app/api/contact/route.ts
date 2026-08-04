import { NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getSettings, getStoreName } from "@/lib/settings"
import { sendEmail } from "@/lib/email"

export async function POST(req: NextRequest) {
  try {
    const { name, email, subject, message } = await req.json()

    if (!name?.trim() || !email?.trim() || !message?.trim()) {
      return NextResponse.json({ message: "Name, email and message are required." }, { status: 400 })
    }

    if (!email.includes("@")) {
      return NextResponse.json({ message: "Please enter a valid email address." }, { status: 400 })
    }

    // Persist so nothing is lost even if the notification email can't be sent.
    await prisma.contactMessage.create({
      data: {
        name: name.trim(),
        email: email.trim(),
        subject: subject?.trim() || null,
        message: message.trim(),
      },
    })

    // Notify the store inbox (non-blocking on failure — the message is already saved).
    try {
      const settings = await getSettings()
      const storeName = await getStoreName()
      const to = settings.contact_email
      if (to) {
        await sendEmail({
          to,
          subject: `New contact message — ${subject?.trim() || "No subject"} | ${storeName}`,
          html: `
            <div style="font-family:'Helvetica Neue',Arial,sans-serif;max-width:600px;margin:0 auto;">
              <h2 style="color:#09090b;">New contact message</h2>
              <p style="color:#555;font-size:14px;"><strong>From:</strong> ${name} &lt;${email}&gt;</p>
              ${subject?.trim() ? `<p style="color:#555;font-size:14px;"><strong>Subject:</strong> ${subject}</p>` : ""}
              <div style="background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:16px 20px;margin-top:12px;color:#333;font-size:14px;white-space:pre-wrap;">${String(message).replace(/</g, "&lt;")}</div>
            </div>`,
        })
      }
    } catch (mailErr) {
      console.error("[CONTACT_NOTIFY_EMAIL]", mailErr)
    }

    return NextResponse.json({ success: true, message: "Thanks for reaching out! We'll get back to you soon." })
  } catch (error) {
    console.error("[CONTACT_POST_ERROR]", error)
    return NextResponse.json({ message: "Failed to send your message. Please try again." }, { status: 500 })
  }
}
