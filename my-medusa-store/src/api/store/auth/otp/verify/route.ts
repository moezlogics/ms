import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OTP_AUTH_MODULE } from "../../../../../modules/otp-auth"

/**
 * POST /store/auth/otp/verify
 *
 * Verifies a 6-digit OTP code.
 *
 * Body: { email: string, code: string, purpose: "signup" | "password_reset" | "email_verify" }
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, code, purpose } = req.body as {
    email: string
    code: string
    purpose: "signup" | "password_reset" | "email_verify"
  }

  if (!email || !code || !purpose) {
    return res.status(400).json({
      message: "Email, code, and purpose are required.",
    })
  }

  const otpService = req.scope.resolve(OTP_AUTH_MODULE) as any

  try {
    const verified = await otpService.verifyOtp(email, code, purpose)

    return res.json({
      success: true,
      verified,
      message: "OTP verified successfully.",
    })
  } catch (error: any) {
    return res.status(400).json({
      success: false,
      verified: false,
      message: error.message || "OTP verification failed.",
    })
  }
}
