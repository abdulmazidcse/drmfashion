import crypto from "crypto"
import bcrypt from "bcryptjs"
import { prisma } from "@/lib/prisma"

export const OTP_EXPIRY_MINUTES = 10
export const OTP_MAX_ATTEMPTS = 5
export const OTP_RESEND_COOLDOWN_SECONDS = 60

/** Cryptographically-random 6-digit numeric code (leading zeros preserved). */
export function generateOtp(): string {
  return crypto.randomInt(0, 1_000_000).toString().padStart(6, "0")
}

export async function hashOtp(otp: string): Promise<string> {
  return bcrypt.hash(otp, 10)
}

type VerifyResult =
  | { ok: true }
  | { ok: false; status: number; message: string }

/**
 * Validate an OTP against the latest reset row for an email.
 * On a wrong code it increments the attempt counter; the caller decides
 * whether to consume (delete) the row — used by both verify-otp and reset-password.
 */
export async function verifyOtp(email: string, otp: string): Promise<VerifyResult> {
  if (!email || !otp) {
    return { ok: false, status: 400, message: "Email and code are required." }
  }

  const record = await prisma.passwordResetOtp.findFirst({
    where: { email },
    orderBy: { createdAt: "desc" },
  })

  if (!record) {
    return { ok: false, status: 400, message: "No reset request found. Please request a new code." }
  }

  if (record.expiresAt < new Date()) {
    await prisma.passwordResetOtp.deleteMany({ where: { email } })
    return { ok: false, status: 400, message: "This code has expired. Please request a new one." }
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.passwordResetOtp.deleteMany({ where: { email } })
    return { ok: false, status: 429, message: "Too many incorrect attempts. Please request a new code." }
  }

  const matches = await bcrypt.compare(otp, record.otpHash)
  if (!matches) {
    await prisma.passwordResetOtp.update({
      where: { id: record.id },
      data: { attempts: { increment: 1 } },
    })
    const left = OTP_MAX_ATTEMPTS - (record.attempts + 1)
    return {
      ok: false,
      status: 400,
      message: left > 0 ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} left.` : "Too many incorrect attempts. Please request a new code.",
    }
  }

  return { ok: true }
}
