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

/** Codes are scoped so a reset code cannot double as a verification code. */
export type OtpPurpose = "PASSWORD_RESET" | "EMAIL_VERIFICATION"

type VerifyResult =
  | { ok: true }
  | { ok: false; status: number; message: string }

type IssueResult =
  | { ok: true; otp: string }
  | { ok: false; status: number; message: string }

/**
 * Replace any outstanding code for (email, purpose) with a fresh one and hand
 * back the plaintext for mailing. Enforces the resend cooldown so the endpoint
 * cannot be used to spam someone's inbox.
 */
export async function issueOtp(email: string, purpose: OtpPurpose): Promise<IssueResult> {
  const recent = await prisma.passwordResetOtp.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
  })

  if (recent) {
    const ageSeconds = (Date.now() - recent.createdAt.getTime()) / 1000
    if (ageSeconds < OTP_RESEND_COOLDOWN_SECONDS) {
      return {
        ok: false,
        status: 429,
        message: `Please wait ${Math.ceil(OTP_RESEND_COOLDOWN_SECONDS - ageSeconds)}s before requesting another code.`,
      }
    }
  }

  await prisma.passwordResetOtp.deleteMany({ where: { email, purpose } })

  const otp = generateOtp()
  await prisma.passwordResetOtp.create({
    data: {
      email,
      purpose,
      otpHash: await hashOtp(otp),
      expiresAt: new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000),
    },
  })

  return { ok: true, otp }
}

/**
 * Validate an OTP against the latest reset row for an email.
 * On a wrong code it increments the attempt counter; the caller decides
 * whether to consume (delete) the row — used by both verify-otp and reset-password.
 */
export async function verifyOtp(
  email: string,
  otp: string,
  purpose: OtpPurpose = "PASSWORD_RESET"
): Promise<VerifyResult> {
  if (!email || !otp) {
    return { ok: false, status: 400, message: "Email and code are required." }
  }

  const record = await prisma.passwordResetOtp.findFirst({
    where: { email, purpose },
    orderBy: { createdAt: "desc" },
  })

  if (!record) {
    return { ok: false, status: 400, message: "No code was requested. Please request a new one." }
  }

  if (record.expiresAt < new Date()) {
    await prisma.passwordResetOtp.deleteMany({ where: { email, purpose } })
    return { ok: false, status: 400, message: "This code has expired. Please request a new one." }
  }

  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    await prisma.passwordResetOtp.deleteMany({ where: { email, purpose } })
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
