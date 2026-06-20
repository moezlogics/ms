import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { buildEmailThemeFromSettings } from "../modules/email-notifications/util/theme-from-settings"

/**
 * Contact form notification subscriber.
 *
 * Listens to the custom `contact.created` event (emitted by the store
 * contact API route) and sends an admin alert email with the submission.
 */
export default async function contactNotificationHandler({
  event,
  container,
}: SubscriberArgs<{
  name: string
  email: string
  phone?: string
  subject?: string
  message: string
}>) {
  const logger = container.resolve("logger")

  try {
    const notificationService = container.resolve(Modules.NOTIFICATION) as any

    // Fetch site settings for branding + admin email.
    // Module is registered as `site_settings` (underscore) — see
    // `src/modules/site-settings/index.ts`. The hyphenated lookup used
    // here previously was silently swallowed and `adminEmail` always
    // fell back to `SMTP_FROM`, so admin alerts effectively went to the
    // sender mailbox instead of the configured contact address.
    let settings: Record<string, string> = {}
    try {
      const settingsModule = container.resolve("site_settings") as any
      if (settingsModule?.getAll) {
        settings = await settingsModule.getAll()
      }
    } catch (e: any) {
      const logger = container.resolve("logger")
      logger?.warn?.(
        `[ContactNotification] site_settings resolve failed (${e?.message}) — using env defaults`
      )
    }

    const adminEmail = settings.contact_email || process.env.SMTP_FROM || ""
    if (!adminEmail) {
      logger.warn("[ContactNotification] No admin email configured — skipping.")
      return
    }

    const contactData = event.data
    await notificationService.createNotifications({
      to: adminEmail,
      channel: "email",
      template: "contact-received",
      data: {
        store_name:
          settings.site_name ||
          process.env.STORE_NAME ||
          process.env.MEDUSA_STORE_NAME ||
          "Welcome",
        logo_url: settings.site_logo_url || undefined,
        copyright: settings.footer_copyright || undefined,
        theme: buildEmailThemeFromSettings(settings),
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone || "",
        subject: contactData.subject || "No Subject",
        message: contactData.message,
      },
    })

    logger.info(
      `[ContactNotification] Sent contact alert to ${adminEmail} for submission from ${contactData.email}`
    )
  } catch (err) {
    logger.error("[ContactNotification] Failed:", err)
  }
}

export const config: SubscriberConfig = {
  event: "contact.created",
}
