import { model } from "@medusajs/framework/utils"

/**
 * OTP Code model — stores 6-digit OTP codes for email verification.
 *
 * Fields:
 *   - email: The target email address
 *   - code: 6-digit OTP string
 *   - purpose: "signup" | "password_reset" | "email_verify"
 *   - attempts: Number of failed verification attempts (rate limiting)
 *   - expires_at: When this OTP expires
 *   - verified: Whether it has been successfully verified
 */
const OtpCode = model.define("otp_code", {
  id: model.id().primaryKey(),
  email: model.text(),
  code: model.text(),
  purpose: model.enum(["signup", "password_reset", "email_verify"]),
  attempts: model.number().default(0),
  expires_at: model.dateTime(),
  verified: model.boolean().default(false),
})

export default OtpCode
