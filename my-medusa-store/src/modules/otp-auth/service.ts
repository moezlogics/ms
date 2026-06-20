import { MedusaService, MedusaError } from "@medusajs/framework/utils"
import OtpCode from "./models/otp-code"
import crypto from "crypto"

/**
 * OTP Auth Module Service
 *
 * Handles:
 *   - Generating 6-digit OTP codes
 *   - Verifying codes with rate limiting (max 5 attempts)
 *   - Auto-expiration (10 minutes)
 *   - Invalidating old codes for same email+purpose
 */
class OtpAuthModuleService extends MedusaService({
  OtpCode,
}) {
  /**
   * Generate a new 6-digit OTP for the given email and purpose.
   * Invalidates any previous unused codes for the same email+purpose.
   */
  async generateOtp(
    email: string,
    purpose: "signup" | "password_reset" | "email_verify"
  ): Promise<{ code: string; expires_at: Date }> {
    // Invalidate old codes for same email+purpose
    const existingCodes = await this.listOtpCodes({
      email,
      purpose,
      verified: false,
    })

    for (const old of existingCodes) {
      await this.deleteOtpCodes(old.id)
    }

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString()

    // Expires in 10 minutes
    const expires_at = new Date(Date.now() + 10 * 60 * 1000)

    await this.createOtpCodes({
      email,
      code,
      purpose,
      attempts: 0,
      expires_at,
      verified: false,
    })

    return { code, expires_at }
  }

  /**
   * Verify an OTP code.
   *
   * Returns true if the code is valid.
   * Throws MedusaError if:
   *   - Code not found or expired
   *   - Already verified
   *   - Too many attempts (max 5)
   *   - Code mismatch
   */
  async verifyOtp(
    email: string,
    code: string,
    purpose: "signup" | "password_reset" | "email_verify"
  ): Promise<boolean> {
    const codes = await this.listOtpCodes({
      email,
      purpose,
      verified: false,
    })

    if (codes.length === 0) {
      throw new MedusaError(
        MedusaError.Types.NOT_FOUND,
        "No OTP code found. Please request a new code."
      )
    }

    const otpRecord = codes[codes.length - 1] // Get the latest one

    // Check expiration
    if (new Date(otpRecord.expires_at) < new Date()) {
      await this.deleteOtpCodes(otpRecord.id)
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "OTP code has expired. Please request a new code."
      )
    }

    // Check rate limiting
    if (otpRecord.attempts >= 5) {
      await this.deleteOtpCodes(otpRecord.id)
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Too many failed attempts. Please request a new code."
      )
    }

    // Verify code
    if (otpRecord.code !== code) {
      await this.updateOtpCodes({
        id: otpRecord.id,
        attempts: otpRecord.attempts + 1,
      })
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Invalid OTP code. ${4 - otpRecord.attempts} attempts remaining.`
      )
    }

    // Mark as verified
    await this.updateOtpCodes({
      id: otpRecord.id,
      verified: true,
    })

    return true
  }
}

export default OtpAuthModuleService
