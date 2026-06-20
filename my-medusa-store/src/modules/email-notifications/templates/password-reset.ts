import { baseLayout, type EmailTheme } from "./base"

/**
 * Password Reset Email Template
 *
 * Sent when a user requests a password reset via OTP.
 */
export function buildPasswordResetEmail(data: Record<string, unknown>): {
  subject: string
  html: string
} {
  const resetUrl = (data.reset_url as string) || "#"
  const firstName = (data.first_name as string) || "there"
  const storeName =
    (data.store_name as string) ||
    process.env.STORE_NAME ||
    process.env.MEDUSA_STORE_NAME ||
    "Welcome"
  const logoUrl = data.logo_url as string | undefined
  const copyright = data.copyright as string | undefined
  const theme = (data.theme as EmailTheme | undefined) || undefined

  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">
      Password Reset Request
    </h2>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
      Hi ${firstName}, we received a request to reset your password. Click the button below to set a new password.
    </p>

    <div style="text-align:center;margin:24px 0;">
      <a href="${resetUrl}" style="display:inline-block;background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
        Reset My Password
      </a>
    </div>

    <p style="margin:16px 0;font-size:13px;color:#9ca3af;text-align:center;">
      This link will expire in 30 minutes.
    </p>

    <div style="margin-top:24px;padding:16px;background:#fef2f2;border-radius:8px;border-left:4px solid #ef4444;">
      <p style="margin:0;font-size:13px;color:#991b1b;">
        🔒 If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
      </p>
    </div>
  `

  return {
    subject: "Password Reset Request",
    html: baseLayout({
      storeName,
      logoUrl,
      copyright,
      theme,
      body,
    }),
  }
}
