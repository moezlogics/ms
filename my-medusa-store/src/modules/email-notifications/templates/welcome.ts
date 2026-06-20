import { baseLayout, type EmailTheme } from "./base"

/**
 * Welcome Email Template
 *
 * Sent to new customers after successful registration + OTP verification.
 */
export function buildWelcomeEmail(data: Record<string, unknown>): {
  subject: string
  html: string
} {
  const firstName = (data.first_name as string) || "there"
  const storeName =
    (data.store_name as string) ||
    process.env.STORE_NAME ||
    process.env.MEDUSA_STORE_NAME ||
    "Welcome"
  const storeUrl = (data.store_url as string) || "#"
  const logoUrl = data.logo_url as string | undefined
  const copyright = data.copyright as string | undefined
  const theme = (data.theme as EmailTheme | undefined) || undefined

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);border-radius:50%;line-height:64px;font-size:28px;">
        🎉
      </div>
    </div>

    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;text-align:center;">
      Welcome, ${firstName}!
    </h2>

    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;text-align:center;">
      Your account has been created successfully. We're excited to have you on board!
    </p>

    <div style="background:#f9fafb;border-radius:12px;padding:24px;margin:24px 0;">
      <h3 style="margin:0 0 16px;font-size:16px;font-weight:600;color:#111827;">
        What you can do now:
      </h3>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#667eea;font-size:18px;margin-right:12px;">🛍️</span>
            <span style="font-size:14px;color:#374151;">Browse our latest products and deals</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#667eea;font-size:18px;margin-right:12px;">⭐</span>
            <span style="font-size:14px;color:#374151;">Earn loyalty points with every purchase</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#667eea;font-size:18px;margin-right:12px;">💰</span>
            <span style="font-size:14px;color:#374151;">Enjoy your first-purchase discount</span>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="color:#667eea;font-size:18px;margin-right:12px;">📦</span>
            <span style="font-size:14px;color:#374151;">Track your orders in real-time</span>
          </td>
        </tr>
      </table>
    </div>

    <div style="text-align:center;margin:24px 0;">
      <a href="${storeUrl}" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
        Start Shopping →
      </a>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
      If you have any questions, feel free to reply to this email or contact our support team.
    </p>
  `

  return {
    subject: `Welcome to ${storeName}! 🎉`,
    html: baseLayout({
      storeName,
      logoUrl,
      copyright,
      theme,
      body,
    }),
  }
}
