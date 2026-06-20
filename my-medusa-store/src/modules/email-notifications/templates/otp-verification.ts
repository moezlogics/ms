import { baseLayout, resolveTheme, type EmailTheme } from "./base"

/**
 * OTP Verification Email Template
 *
 * Used for: signup verification, password reset codes, email verification.
 *
 * Honours the admin-configured site theme — the OTP code box and
 * security stripe inherit `theme.primary` / `theme.accent` so the
 * email matches whatever palette is live on the storefront. Falls
 * back to the original Anvogue purple/amber when no theme tokens
 * are passed (e.g. legacy callers that haven't been updated yet).
 */
export function buildOtpVerificationEmail(data: Record<string, unknown>): {
  subject: string
  html: string
} {
  const otpCode = (data.otp_code as string) || "------"
  const purpose = (data.purpose as string) || "email_verify"
  const expiresMinutes = (data.expires_minutes as number) || 10
  const storeName =
    (data.store_name as string) ||
    process.env.STORE_NAME ||
    process.env.MEDUSA_STORE_NAME ||
    "Welcome"
  const logoUrl = data.logo_url as string | undefined
  const copyright = data.copyright as string | undefined
  const theme = (data.theme as EmailTheme | undefined) || undefined
  const t = resolveTheme(theme)

  const purposeText: Record<string, string> = {
    signup: "Complete Your Registration",
    password_reset: "Reset Your Password",
    email_verify: "Verify Your Email Address",
  }

  const purposeDescription: Record<string, string> = {
    signup:
      "Thank you for signing up! Use the code below to verify your email and complete your registration.",
    password_reset:
      "We received a request to reset your password. Use the code below to proceed.",
    email_verify: "Use the code below to verify your email address.",
  }

  const subject =
    (data.subject as string) ||
    purposeText[purpose] ||
    "Your Verification Code"

  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">
      ${purposeText[purpose] || "Verification Code"}
    </h2>
    <p style="margin:0 0 24px;font-size:15px;color:#4b5563;line-height:1.6;">
      ${purposeDescription[purpose] || "Use the code below to verify your identity."}
    </p>

    <!-- OTP Code Box — gradient borrowed from the live site palette -->
    <div style="text-align:center;margin:24px 0;">
      <div style="display:inline-block;background:linear-gradient(135deg, ${t.primary} 0%, ${t.accent} 100%);padding:4px;border-radius:12px;">
        <div style="background:#ffffff;border-radius:10px;padding:20px 40px;">
          <span style="font-size:36px;font-weight:800;letter-spacing:12px;color:#1a1a1a;font-family:'Courier New',monospace;">
            ${otpCode}
          </span>
        </div>
      </div>
    </div>

    <p style="margin:24px 0 8px;font-size:13px;color:#9ca3af;text-align:center;">
      This code expires in <strong>${expiresMinutes} minutes</strong>.
    </p>
    <p style="margin:0 0 16px;font-size:13px;color:#9ca3af;text-align:center;">
      If you didn't request this code, you can safely ignore this email.
    </p>

    <!-- Security Notice -->
    <div style="margin-top:24px;padding:16px;background:#fef3c7;border-radius:8px;border-left:4px solid ${t.primary};">
      <p style="margin:0;font-size:13px;color:#92400e;">
        <strong>Security tip:</strong> Never share this code with anyone. Our team will never ask for your verification code.
      </p>
    </div>
  `

  return {
    subject,
    html: baseLayout({
      storeName,
      logoUrl,
      copyright,
      theme,
      body,
    }),
  }
}
