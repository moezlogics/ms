import { AbstractNotificationProviderService } from "@medusajs/framework/utils"
import nodemailer from "nodemailer"
import type { Transporter } from "nodemailer"
import { buildOrderPlacedEmail } from "./templates/order-placed"
import { buildOrderPlacedAdminEmail } from "./templates/order-placed-admin"
import { buildOrderShippedEmail } from "./templates/order-shipped"
import { buildOrderCanceledEmail } from "./templates/order-canceled"
import { buildOrderCompletedEmail } from "./templates/order-completed"
import { buildContactReceivedEmail } from "./templates/contact-received"
import { buildOtpVerificationEmail } from "./templates/otp-verification"
import { buildWelcomeEmail } from "./templates/welcome"
import { buildPasswordResetEmail } from "./templates/password-reset"
import { buildAbandonedCartEmail } from "./templates/abandoned-cart"

type SmtpOptions = {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

/**
 * Custom SMTP Notification Provider for Medusa v2.
 *
 * Uses nodemailer with Gmail (or any SMTP) to send transactional emails.
 * Templates are branded with the storefront theme.
 *
 * Supported template keys:
 *   - order-placed           → Customer order confirmation
 *   - order-placed-admin     → Admin new-order alert
 *   - order-shipped          → Customer shipment notification
 *   - order-canceled         → Customer cancellation notice
 *   - order-completed        → Customer order-complete thank-you
 *   - contact-received       → Admin contact form alert
 *   - otp-verification       → OTP verification code
 *   - welcome                → New customer welcome email
 *   - password-reset         → Password reset instructions
 *   - abandoned-cart         → Abandoned cart reminder
 */
export default class SmtpNotificationService extends AbstractNotificationProviderService {
  static identifier = "smtp-notification"

  protected transporter: Transporter
  protected fromAddress: string

  constructor(container: any, options: any) {
    super()

    const smtpOpts: SmtpOptions = {
      host: options.host || "smtp.gmail.com",
      port: Number(options.port) || 587,
      user: options.user || "",
      pass: options.pass || "",
      from: options.from || options.user || "",
    }

    this.fromAddress = smtpOpts.from

    this.transporter = nodemailer.createTransport({
      host: smtpOpts.host,
      port: smtpOpts.port,
      secure: smtpOpts.port === 465,
      auth: {
        user: smtpOpts.user,
        pass: smtpOpts.pass,
      },
    })
  }

  async send(notification: {
    to: string
    template: string
    data: Record<string, unknown>
    channel: string
  }): Promise<{ id: string }> {
    const templateMap: Record<
      string,
      (data: Record<string, unknown>) => { subject: string; html: string }
    > = {
      "order-placed": buildOrderPlacedEmail,
      "order-placed-admin": buildOrderPlacedAdminEmail,
      "order-shipped": buildOrderShippedEmail,
      "order-canceled": buildOrderCanceledEmail,
      "order-completed": buildOrderCompletedEmail,
      "contact-received": buildContactReceivedEmail,
      "otp-verification": buildOtpVerificationEmail,
      "welcome": buildWelcomeEmail,
      "password-reset": buildPasswordResetEmail,
      "abandoned-cart": buildAbandonedCartEmail,
    }

    const builder = templateMap[notification.template]
    if (!builder) {
      console.warn(
        `[SmtpNotification] Unknown template "${notification.template}" — skipping.`
      )
      return { id: "skipped" }
    }

    const { subject, html } = builder(notification.data)

    // Compose a "Brand Name <noreply@…>" From header so the recipient
    // sees the brand in their inbox instead of a raw e-mail address
    // (or, on Gmail-to-Gmail, the sender's Google profile name —
    // which is what most users see when no display name is set).
    //
    // Priority order for the display name:
    //   1. `SMTP_FROM_NAME` env — explicit per-store override, wins
    //      even over the template data so multi-tenant deployments
    //      that share an SMTP account can each brand their own mail.
    //   2. `notification.data.store_name` — passed by callers from
    //      `site_settings.site_name`. Admin re-branding without a
    //      redeploy.
    //   3. `STORE_NAME` / `MEDUSA_STORE_NAME` env — legacy fallback.
    //   4. Local part of the SMTP from-address, title-cased — way
    //      better than the bare email and avoids the "Welcome"
    //      placeholder leaking into production inboxes.
    //
    // We also parse out any display name already baked into
    // `SMTP_FROM` (e.g. `SMTP_FROM='"My Brand" <a@b.com>'`) so we
    // don't double-wrap and produce a malformed header.
    const rawStoreName =
      typeof notification.data?.store_name === "string"
        ? (notification.data.store_name as string).trim()
        : ""

    // Parse `"Display" <email>` shape if SMTP_FROM was set that way.
    const fromAddressMatch = this.fromAddress.match(/<([^>]+)>/)
    const bareEmail = fromAddressMatch
      ? fromAddressMatch[1].trim()
      : this.fromAddress.trim()
    const embeddedDisplayName = (() => {
      const m = this.fromAddress.match(/^\s*"?([^"<]+?)"?\s*</)
      return m ? m[1].trim() : ""
    })()

    const localPartFallback = (() => {
      const local = bareEmail.split("@")[0] || ""
      if (!local) return ""
      // Replace separators with spaces and title-case so
      // `abdul.moez_store` → `Abdul Moez Store`.
      return local
        .replace(/[._-]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase())
    })()

    const displayName =
      process.env.SMTP_FROM_NAME?.trim() ||
      (rawStoreName && rawStoreName.toLowerCase() !== "welcome"
        ? rawStoreName
        : "") ||
      process.env.STORE_NAME?.trim() ||
      process.env.MEDUSA_STORE_NAME?.trim() ||
      embeddedDisplayName ||
      localPartFallback ||
      ""

    const fromHeader = displayName
      ? `"${displayName.replace(/"/g, '\\"')}" <${bareEmail}>`
      : bareEmail

    try {
      const info = await this.transporter.sendMail({
        from: fromHeader,
        to: notification.to,
        subject,
        html,
      })

      return { id: info.messageId || "sent" }
    } catch (err) {
      console.error("[SmtpNotification] Send failed:", err)
      throw err
    }
  }
}
