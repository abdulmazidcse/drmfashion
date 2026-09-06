import { prisma } from "@/lib/prisma"
import { sendEmailVerificationOtpEmail } from "@/lib/email"
import { issueOtp, OTP_EXPIRY_MINUTES } from "@/lib/passwordResetOtp"

/**
 * Mail a fresh sign-up verification code.
 *
 * Returns the cooldown error from issueOtp untouched so the caller can pass it
 * straight to the client; a mail failure is reported separately because the
 * code is already stored by then and a resend is the right recovery.
 */
export async function sendVerificationCode(
  email: string,
  name: string
): Promise<{ ok: true } | { ok: false; status: number; message: string }> {
  const issued = await issueOtp(email, "EMAIL_VERIFICATION")
  if (!issued.ok) return issued

  try {
    await sendEmailVerificationOtpEmail(email, {
      name,
      otp: issued.otp,
      expiresInMinutes: OTP_EXPIRY_MINUTES,
    })
  } catch (e) {
    console.error("[EMAIL_VERIFICATION_SEND_ERROR]", e)
    return { ok: false, status: 502, message: "Could not send the verification email. Please try again." }
  }

  return { ok: true }
}

/** Clear any outstanding verification codes once the address is confirmed. */
export async function consumeVerificationCodes(email: string) {
  await prisma.passwordResetOtp.deleteMany({
    where: { email, purpose: "EMAIL_VERIFICATION" },
  })
}
