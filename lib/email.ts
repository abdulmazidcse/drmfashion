import { Resend } from "resend"
import { getStoreName } from "@/lib/settings"

const resend = new Resend(process.env.RESEND_API_KEY || "re_123")

const FROM_EMAIL = process.env.EMAIL_FROM || "noreply@yourdomain.com"

// ─── Order Confirmation ───────────────────────────────────────────────────────
export async function sendOrderConfirmationEmail(to: string, data: {
  customerName: string
  orderId: string
  items: { title: string; quantity: number; price: number; color?: string; size?: string }[]
  totalAmount: number
  shippingAddress: string
  paymentMethod: string
}) {
  const storeName = await getStoreName()
  const itemRows = data.items.map(item => `
    <tr style="border-bottom:1px solid #f0f0f0;">
      <td style="padding:12px 8px;font-size:13px;color:#333;">${item.title} ${item.color ? `(${item.color}` : ""}${item.size ? `, ${item.size})` : ""}</td>
      <td style="padding:12px 8px;font-size:13px;color:#555;text-align:center;">${item.quantity}</td>
      <td style="padding:12px 8px;font-size:13px;color:#333;text-align:right;">৳${(item.price * item.quantity).toFixed(2)}</td>
    </tr>
  `).join("")

  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#09090b;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:0.3em;font-weight:900;">${storeName}</h1>
    </div>
    <div style="padding:40px;">
      <h2 style="margin:0 0 8px;color:#09090b;font-size:20px;">Order Confirmed! 🎉</h2>
      <p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${data.customerName}, thank you for your order. We've received it and will begin processing shortly.</p>
      
      <div style="background:#f9f9f9;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Order ID</p>
        <p style="margin:4px 0 0;font-size:14px;color:#09090b;font-weight:700;font-family:monospace;">#${data.orderId.slice(-8).toUpperCase()}</p>
      </div>

      <table style="width:100%;border-collapse:collapse;margin-bottom:24px;">
        <thead>
          <tr style="background:#f9f9f9;">
            <th style="padding:10px 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em;text-align:left;">Item</th>
            <th style="padding:10px 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em;text-align:center;">Qty</th>
            <th style="padding:10px 8px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em;text-align:right;">Price</th>
          </tr>
        </thead>
        <tbody>${itemRows}</tbody>
        <tfoot>
          <tr>
            <td colspan="2" style="padding:16px 8px 0;font-size:14px;font-weight:700;color:#09090b;text-align:right;border-top:2px solid #09090b;">Total</td>
            <td style="padding:16px 8px 0;font-size:14px;font-weight:700;color:#09090b;text-align:right;border-top:2px solid #09090b;">৳${data.totalAmount.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>

      <div style="border:1px solid #eee;border-radius:6px;padding:16px 20px;margin-bottom:24px;">
        <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Shipping Address</p>
        <p style="margin:0;font-size:14px;color:#333;">${data.shippingAddress}</p>
      </div>
      <div style="border:1px solid #eee;border-radius:6px;padding:16px 20px;margin-bottom:32px;">
        <p style="margin:0 0 6px;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Payment Method</p>
        <p style="margin:0;font-size:14px;color:#333;text-transform:capitalize;">${data.paymentMethod === "cod" ? "Cash on Delivery" : data.paymentMethod}</p>
      </div>

      <p style="font-size:13px;color:#666;text-align:center;">We'll notify you when your order ships. Questions? Reply to this email.</p>
    </div>
    <div style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#aaa;">&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Order Confirmed – #${data.orderId.slice(-8).toUpperCase()} | ${storeName}`,
    html,
  })
}

// ─── Shipping Update ──────────────────────────────────────────────────────────
export async function sendShippingUpdateEmail(to: string, data: {
  customerName: string
  orderId: string
  status: string
  trackingNote?: string
}) {
  const storeName = await getStoreName()
  const statusMessages: Record<string, { emoji: string; heading: string; body: string }> = {
    PROCESSING: { emoji: "⚙️", heading: "Your order is being processed", body: "We are preparing your items for shipment. We'll notify you once it's on its way." },
    SHIPPED: { emoji: "🚚", heading: "Your order has shipped!", body: "Great news! Your package is on its way. You should receive it soon." },
    DELIVERED: { emoji: "✅", heading: "Your order has been delivered!", body: "We hope you love your new items! If you have any issues, reply to this email." },
    CANCELLED: { emoji: "❌", heading: "Your order has been cancelled", body: "Your order has been cancelled. If this was a mistake or you have questions, please contact us." },
  }
  
  const msg = statusMessages[data.status] || { emoji: "📦", heading: `Order status updated to ${data.status}`, body: "" }

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#09090b;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:0.3em;font-weight:900;">${storeName}</h1>
    </div>
    <div style="padding:40px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">${msg.emoji}</div>
      <h2 style="margin:0 0 12px;color:#09090b;font-size:20px;">${msg.heading}</h2>
      <p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${data.customerName}, ${msg.body}</p>
      <div style="background:#f9f9f9;border-radius:6px;padding:16px 20px;margin-bottom:24px;text-align:left;">
        <p style="margin:0;font-size:12px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Order ID</p>
        <p style="margin:4px 0 0;font-size:14px;color:#09090b;font-weight:700;font-family:monospace;">#${data.orderId.slice(-8).toUpperCase()}</p>
      </div>
      ${data.trackingNote ? `<p style="font-size:13px;color:#555;background:#fffbeb;border:1px solid #fef08a;border-radius:6px;padding:12px 16px;text-align:left;">${data.trackingNote}</p>` : ""}
    </div>
    <div style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#aaa;">&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${msg.emoji} Order Update – #${data.orderId.slice(-8).toUpperCase()} | ${storeName}`,
    html,
  })
}

// ─── Welcome Email ────────────────────────────────────────────────────────────
export async function sendWelcomeEmail(to: string, data: { name: string }) {
  const storeName = await getStoreName()
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#09090b;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:0.3em;font-weight:900;">${storeName}</h1>
    </div>
    <div style="padding:40px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">👋</div>
      <h2 style="margin:0 0 12px;color:#09090b;font-size:22px;">Welcome, ${data.name}!</h2>
      <p style="color:#666;font-size:15px;margin:0 0 32px;">Your account has been created successfully. We're thrilled to have you as part of the ${storeName} community.</p>
      <a href="${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/shop" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;padding:14px 32px;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;border-radius:4px;">Start Shopping</a>
    </div>
    <div style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#aaa;">&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Welcome to ${storeName}! 🎉`,
    html,
  })
}

// ─── Return Request Update ────────────────────────────────────────────────────
export async function sendReturnStatusEmail(to: string, data: {
  customerName: string
  orderId: string
  returnStatus: string
  note?: string
}) {
  const storeName = await getStoreName()
  const msgs: Record<string, { emoji: string; heading: string; body: string }> = {
    APPROVED: { emoji: "✅", heading: "Your return request has been approved", body: "Please ship the items back to us within 7 days. We'll process your refund once we receive them." },
    REJECTED: { emoji: "❌", heading: "Your return request has been declined", body: "Unfortunately your return request did not meet our return policy criteria." },
    REFUNDED: { emoji: "💰", heading: "Your refund has been processed!", body: "Your refund has been issued. It may take 3-5 business days to reflect in your account." },
  }
  const msg = msgs[data.returnStatus] || { emoji: "🔄", heading: "Return request status updated", body: "" }

  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#09090b;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:0.3em;font-weight:900;">${storeName}</h1>
    </div>
    <div style="padding:40px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">${msg.emoji}</div>
      <h2 style="margin:0 0 12px;color:#09090b;font-size:20px;">${msg.heading}</h2>
      <p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${data.customerName}, ${msg.body}</p>
      ${data.note ? `<p style="font-size:13px;color:#555;background:#f9f9f9;border-radius:6px;padding:12px 16px;text-align:left;">${data.note}</p>` : ""}
    </div>
    <div style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#aaa;">&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${msg.emoji} Return Update – Order #${data.orderId.slice(-8).toUpperCase()} | ${storeName}`,
    html,
  })
}

// ─── Guest Account Created (auto-generated password) ──────────────────────────
export async function sendAccountCreatedEmail(to: string, data: {
  name: string
  email: string
  password: string
}) {
  const storeName = await getStoreName()
  const loginUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/account`
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#09090b;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:0.3em;font-weight:900;">${storeName}</h1>
    </div>
    <div style="padding:40px;">
      <div style="text-align:center;font-size:48px;margin-bottom:16px;">🎉</div>
      <h2 style="margin:0 0 8px;color:#09090b;font-size:20px;text-align:center;">An account was created for you</h2>
      <p style="color:#666;font-size:14px;margin:0 0 24px;text-align:center;">Hi ${data.name}, thanks for your order! We've created an account so you can track your orders and check out faster next time. Use the login details below.</p>

      <div style="background:#f9f9f9;border:1px solid #eee;border-radius:6px;padding:20px 24px;margin-bottom:24px;">
        <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Email</p>
        <p style="margin:0 0 16px;font-size:15px;color:#09090b;font-weight:700;">${data.email}</p>
        <p style="margin:0 0 4px;font-size:11px;color:#888;text-transform:uppercase;letter-spacing:0.1em;">Temporary Password</p>
        <p style="margin:0;font-size:20px;color:#09090b;font-weight:900;font-family:monospace;letter-spacing:0.08em;">${data.password}</p>
      </div>

      <div style="text-align:center;margin-bottom:24px;">
        <a href="${loginUrl}" style="display:inline-block;background:#09090b;color:#fff;text-decoration:none;padding:14px 32px;font-size:13px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;border-radius:4px;">Sign In to Your Account</a>
      </div>

      <p style="font-size:12px;color:#999;text-align:center;background:#fffbeb;border:1px solid #fef08a;border-radius:6px;padding:12px 16px;">🔒 For your security, please sign in and change this password from your account, or use "Forgot password?" to set your own.</p>
    </div>
    <div style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#aaa;">&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your ${storeName} account details`,
    html,
  })
}

// ─── Password Reset OTP ───────────────────────────────────────────────────────
export async function sendPasswordResetOtpEmail(to: string, data: {
  name: string
  otp: string
  expiresInMinutes: number
}) {
  const storeName = await getStoreName()
  const html = `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#f9f9f9;font-family:'Helvetica Neue',Arial,sans-serif;">
  <div style="max-width:600px;margin:40px auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
    <div style="background:#09090b;padding:32px 40px;text-align:center;">
      <h1 style="margin:0;color:#fff;font-size:22px;letter-spacing:0.3em;font-weight:900;">${storeName}</h1>
    </div>
    <div style="padding:40px;text-align:center;">
      <div style="font-size:48px;margin-bottom:16px;">🔐</div>
      <h2 style="margin:0 0 12px;color:#09090b;font-size:20px;">Reset your password</h2>
      <p style="color:#666;font-size:14px;margin:0 0 24px;">Hi ${data.name}, use the verification code below to reset your password. Do not share this code with anyone.</p>
      <div style="display:inline-block;background:#f4f4f5;border:1px solid #e4e4e7;border-radius:8px;padding:18px 32px;margin-bottom:24px;">
        <span style="font-size:34px;font-weight:900;letter-spacing:0.4em;color:#09090b;font-family:monospace;">${data.otp}</span>
      </div>
      <p style="font-size:13px;color:#888;margin:0 0 8px;">This code expires in <strong>${data.expiresInMinutes} minutes</strong>.</p>
      <p style="font-size:12px;color:#aaa;margin:0;">If you didn't request a password reset, you can safely ignore this email.</p>
    </div>
    <div style="background:#f9f9f9;padding:20px;text-align:center;border-top:1px solid #eee;">
      <p style="margin:0;font-size:11px;color:#aaa;">&copy; ${new Date().getFullYear()} ${storeName}. All rights reserved.</p>
    </div>
  </div>
</body>
</html>`

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `${data.otp} is your ${storeName} password reset code`,
    html,
  })
}

// ─── Generic Email ────────────────────────────────────────────────────────────
export async function sendEmail({
  to,
  subject,
  html,
}: {
  to: string | string[];
  subject: string;
  html: string;
}) {
  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html,
  });
}
