import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { OTP_AUTH_MODULE } from "../../../../../modules/otp-auth"

/**
 * POST /store/auth/otp/reset-password
 *
 * Final step of forgot-password flow. The caller must already have a
 * valid OTP for purpose="password_reset" — we re-verify here for safety,
 * which also marks the OTP as consumed so it can't be reused.
 *
 * Body: { email, code, new_password }
 *
 * Calls Medusa's auth module → emailpass provider → `update()` which
 * hashes the new password using the same scrypt config as registration.
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, code, new_password } = (req.body || {}) as {
    email?: string
    code?: string
    new_password?: string
  }

  if (!email || !code || !new_password) {
    return res
      .status(400)
      .json({ message: "email, code and new_password are required" })
  }
  if (new_password.length < 6) {
    return res
      .status(400)
      .json({ message: "Password must be at least 6 characters" })
  }

  const otpService = req.scope.resolve(OTP_AUTH_MODULE) as any
  try {
    await otpService.verifyOtp(email, code, "password_reset")
  } catch (error: any) {
    return res
      .status(400)
      .json({ message: error?.message || "OTP verification failed" })
  }

  const authModule = req.scope.resolve(Modules.AUTH) as any
  const result = await authModule.updateProvider("emailpass", {
    entity_id: email,
    password: new_password,
  })

  if (!result?.success) {
    return res.status(400).json({
      success: false,
      message:
        result?.error ||
        "Failed to update password — make sure an account exists with this email.",
    })
  }

  return res.json({ success: true, message: "Password updated successfully." })
}
