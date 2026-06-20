import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { buildEmailThemeFromSettings } from "../modules/email-notifications/util/theme-from-settings"

/**
 * Welcome email subscriber.
 *
 * Fires on `customer.created` and sends the branded/themed `welcome`
 * email. Until now the `welcome` template existed but NOTHING ever
 * triggered it — so new shoppers never received a welcome message.
 *
 * Branding (store name, logo, copyright) and the palette (theme_*) come
 * from the site_settings module so the email always matches the admin's
 * current configuration without a redeploy.
 */
export default async function customerWelcomeHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const customerId = event.data?.id
  if (!customerId) {
    logger.warn("[CustomerWelcome] No customer id in event — skipping.")
    return
  }

  try {
    const query = container.resolve(ContainerRegistrationKeys.QUERY)
    const notificationService = container.resolve(Modules.NOTIFICATION) as any

    const {
      data: [customer],
    } = await query.graph({
      entity: "customer",
      fields: ["id", "email", "first_name", "last_name", "has_account"],
      filters: { id: customerId },
    })

    if (!customer?.email) {
      logger.info(
        `[CustomerWelcome] Customer ${customerId} has no email — skipping.`
      )
      return
    }

    // Only welcome real registered accounts, not the guest customer
    // records Medusa auto-creates for anonymous checkouts (those would
    // get an order-placed email instead).
    if (customer.has_account === false) {
      logger.info(
        `[CustomerWelcome] Customer ${customerId} is a guest (no account) — skipping welcome.`
      )
      return
    }

    // Site settings → branding + theme (module key is `site_settings`).
    let settings: Record<string, string> = {}
    try {
      const settingsModule = container.resolve("site_settings") as any
      if (settingsModule?.getAll) {
        settings = await settingsModule.getAll()
      }
    } catch (e: any) {
      logger?.warn?.(
        `[CustomerWelcome] site_settings resolve failed (${e?.message}) — using defaults`
      )
    }

    const storeUrl =
      settings.store_url ||
      process.env.STORE_URL ||
      process.env.STOREFRONT_URL ||
      process.env.STORE_CORS?.split(",")[0] ||
      "#"

    await notificationService.createNotifications({
      to: customer.email,
      channel: "email",
      template: "welcome",
      data: {
        first_name: customer.first_name || "there",
        store_name:
          settings.site_name ||
          process.env.STORE_NAME ||
          process.env.MEDUSA_STORE_NAME ||
          "our store",
        store_url: storeUrl,
        logo_url: settings.site_logo_url || undefined,
        copyright: settings.footer_copyright || undefined,
        theme: buildEmailThemeFromSettings(settings),
      },
    })

    logger.info(`[CustomerWelcome] Sent welcome email to ${customer.email}`)
  } catch (err: any) {
    logger.error(
      `[CustomerWelcome] FAILED customer=${customerId} message=${err?.message || err}`
    )
  }
}

export const config: SubscriberConfig = {
  event: "customer.created",
}
