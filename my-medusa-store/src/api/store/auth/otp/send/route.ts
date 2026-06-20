import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { OTP_AUTH_MODULE } from "../../../../../modules/otp-auth"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { buildEmailThemeFromSettings } from "../../../../../modules/email-notifications/util/theme-from-settings"

/**
 * POST /store/auth/otp/send
 *
 * Generates and sends a 6-digit OTP code to the provided email.
 *
 * Body: { email: string, purpose: "signup" | "password_reset" | "email_verify" }
 */
export const POST = async (req: MedusaRequest, res: MedusaResponse) => {
  const { email, purpose } = req.body as {
    email: string
    purpose: "signup" | "password_reset" | "email_verify"
  }

  if (!email || !purpose) {
    return res.status(400).json({
      message: "Email and purpose are required.",
    })
  }

  const otpService = req.scope.resolve(OTP_AUTH_MODULE) as any

  try {
    const { code, expires_at } = await otpService.generateOtp(email, purpose)

    // Send OTP via email notification
    const notificationService = req.scope.resolve(Modules.NOTIFICATION)

    const subjectMap: Record<string, string> = {
      signup: "Verify your email address",
      password_reset: "Reset your password",
      email_verify: "Email verification code",
    }

    // Pull branding from site settings so the email reflects current admin config.
    // NOTE: the module is registered as `site_settings` (underscore). The old
    // hyphenated `"site-settings"` threw and was swallowed by the catch, so OTP
    // / password-reset emails always went out with DEFAULT branding + theme
    // (store name "Welcome", no logo, no colours). This was the root cause of
    // "OTP emails don't follow site settings".
    let settings: Record<string, string> = {}
    try {
      const settingsModule = req.scope.resolve("site_settings") as any
      if (settingsModule?.getAll) {
        settings = await settingsModule.getAll()
      }
    } catch {
      // Site settings module unavailable — fall back to defaults inside template
    }

    // Resolve store name with a sane fallback ladder. The literal
    // "Store" used to leak through when neither admin nor env was
    // configured — that's what made earlier OTP emails feel generic.
    const storeName =
      settings.site_name ||
      process.env.STORE_NAME ||
      process.env.MEDUSA_STORE_NAME ||
      "Welcome"

    // Prefix the subject with the store name so the inbox preview
    // immediately tells the recipient who the email is from, e.g.
    // "Acme Pharmacy · Verify your email address".
    const baseSubject = subjectMap[purpose] || "Your verification code"
    const subject = `${storeName} · ${baseSubject}`

    await (notificationService as any).createNotifications({
      to: email,
      channel: "email",
      template: "otp-verification",
      data: {
        otp_code: code,
        purpose,
        subject,
        expires_minutes: 10,
        store_name: storeName,
        logo_url: settings.site_logo_url || undefined,
        copyright: settings.footer_copyright || undefined,
        theme: buildEmailThemeFromSettings(settings),
      },
    })

    return res.json({
      success: true,
      message: "OTP code sent to your email.",
      expires_at,
    })
  } catch (error: any) {
    return res.status(400).json({
      message: error.message || "Failed to send OTP.",
    })
  }
}
