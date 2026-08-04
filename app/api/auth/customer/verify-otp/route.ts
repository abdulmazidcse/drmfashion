import { NextRequest, NextResponse } from "next/server"
import { verifyOtp } from "@/lib/passwordResetOtp"

// Validates the OTP without consuming it, so the UI can move to the
// "set new password" step. The code is re-checked at reset time.
export async function POST(req: NextRequest) {
  try {
    const { email, otp } = await req.json()

    const result = await verifyOtp(email, otp)
    if (!result.ok) {
      return NextResponse.json({ message: result.message }, { status: result.status })
    }

    return NextResponse.json({ success: true, message: "Code verified." })
  } catch (error) {
    console.error("[VERIFY_OTP_ERROR]", error)
    return NextResponse.json({ message: "Internal server error." }, { status: 500 })
  }
}
