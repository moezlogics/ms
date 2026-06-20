import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { Modules, ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { buildEmailThemeFromSettings } from "../modules/email-notifications/util/theme-from-settings"

/**
 * Resolve an order from whatever id the event carries.
 *
 * Medusa v2 emits different events with different payload shapes:
 *   - `order.placed|completed|canceled` carry `data.id = order_id`
 *   - `order.fulfillment_created` carries `data.id = order_id`
 *   - `shipment.created|delivery.created` carry `data.id = fulfillment_id`
 *   - `payment.refunded` carries `data.id = payment_id`
 *
 * Earlier versions of this subscriber assumed the id was always an
 * order id, so any "shipment" event silently failed with
 * "Order shp_xxx not found". This helper normalizes the lookup
 * so we get the order regardless of which event fired.
 */
async function resolveOrderId(
  container: any,
  eventName: string,
  id: string,
  logger: any
): Promise<string | null> {
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  try {
    if (
      eventName === "shipment.created" ||
      eventName === "delivery.created" ||
      eventName === "order.fulfillment_created"
    ) {
      // Try fulfillment lookup first — works for shipment/delivery,
      // also works for order.fulfillment_created in some Medusa
      // versions which actually pass the fulfillment id.
      const { data } = await query.graph({
        entity: "fulfillment",
        fields: ["id", "order.id"],
        filters: { id },
      })
      const orderId = data?.[0]?.order?.id
      if (orderId) return orderId
      // Fall through to direct order lookup — the id was already
      // an order id (older Medusa version).
    }

    if (eventName === "payment.refunded") {
      const { data } = await query.graph({
        entity: "payment",
        fields: ["id", "payment_collection.order.id"],
        filters: { id },
      })
      return data?.[0]?.payment_collection?.order?.id ?? null
    }

    // Default: id is an order id
    return id
  } catch (e) {
    logger?.error?.(
      `[OrderNotification] resolveOrderId failed for ${eventName}/${id}: ${(e as Error).message}`
    )
    return null
  }
}

/**
 * Order lifecycle notification subscriber.
 *
 * Listens to order events and sends branded emails to:
 *   - Customer: confirmation, shipped, canceled, completed
 *   - Admin:    new order alert
 *
 * Site settings (logo, store name, copyright, contact email) are fetched
 * dynamically so emails always reflect the latest admin configuration.
 */
export default async function orderNotificationHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const eventName = (event as any).name || ""
  const rawId = event.data?.id

  if (!rawId) {
    logger.warn(`[OrderNotification] No id in ${eventName} event data — skipping.`)
    return
  }

  logger.info(
    `[OrderNotification] received ${eventName} for id=${rawId} — resolving order…`
  )

  try {
    // Normalize to an order id regardless of event shape.
    const orderId = await resolveOrderId(container, eventName, rawId, logger)
    if (!orderId) {
      logger.warn(
        `[OrderNotification] Could not resolve order id for ${eventName}/${rawId} — skipping.`
      )
      return
    }

    // Resolve services
    const notificationService = container.resolve(Modules.NOTIFICATION) as any
    const query = container.resolve(ContainerRegistrationKeys.QUERY)

    // Fetch full order with items + addresses using query.graph for Medusa v2 compatibility
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "email",
        "currency_code",
        "total",
        "subtotal",
        "tax_total",
        "discount_total",
        "shipping_total",
        "metadata",
        "items.*",
        "items.variant.*",
        "shipping_address.*",
        "billing_address.*"
      ],
      filters: { id: orderId },
    })

    if (!order) {
      logger.warn(`[OrderNotification] Order ${orderId} not found — skipping.`)
      return
    }

    // Fetch site settings for branding.
    //
    // CRITICAL: module identifier is `site_settings` (underscore) — matches
    // `SITE_SETTINGS_MODULE` in `src/modules/site-settings/index.ts` and the
    // key in `medusa-config.ts`. The hyphenated `"site-settings"` used here
    // earlier was silently caught and dropped, which meant every email went
    // out with default branding and the admin recipient fell back to
    // `SMTP_FROM` (i.e. the sender mailbox) — a common cause of "I never
    // got the admin alert" reports.
    let settings: Record<string, string> = {}
    try {
      const settingsModule = container.resolve("site_settings") as any
      if (settingsModule?.getAll) {
        settings = await settingsModule.getAll()
      }
    } catch (e: any) {
      logger?.warn?.(
        `[OrderNotification] site_settings resolve failed (${e?.message}) — using env defaults`
      )
    }

    const brandData = {
      store_name:
        settings.site_name ||
        process.env.STORE_NAME ||
        process.env.MEDUSA_STORE_NAME ||
        "Welcome",
      logo_url: settings.site_logo_url || undefined,
      copyright: settings.footer_copyright || undefined,
      theme: buildEmailThemeFromSettings(settings),
    }

    const adminEmail = settings.contact_email || process.env.SMTP_FROM || ""
    const customerEmail = order.email

    // Map events to template + recipient
    if (eventName.includes("placed")) {
      // Send customer confirmation
      if (customerEmail) {
        await notificationService.createNotifications({
          to: customerEmail,
          channel: "email",
          template: "order-placed",
          data: { ...brandData, order },
        })
        logger.info(`[OrderNotification] Sent order-placed email to ${customerEmail}`)
      }

      // Send admin alert
      if (adminEmail) {
        await notificationService.createNotifications({
          to: adminEmail,
          channel: "email",
          template: "order-placed-admin",
          data: { ...brandData, order },
        })
        logger.info(`[OrderNotification] Sent order-placed-admin email to ${adminEmail}`)
      }
    }

    if (
      eventName.includes("fulfillment_created") ||
      eventName === "shipment.created" ||
      eventName === "delivery.created"
    ) {
      if (customerEmail) {
        await notificationService.createNotifications({
          to: customerEmail,
          channel: "email",
          template: "order-shipped",
          data: { ...brandData, order },
        })
        logger.info(`[OrderNotification] Sent order-shipped email to ${customerEmail}`)
      } else {
        logger.warn(
          `[OrderNotification] order-shipped: order ${order.id} has no email — skipping.`
        )
      }
    }

    if (eventName.includes("canceled")) {
      if (customerEmail) {
        await notificationService.createNotifications({
          to: customerEmail,
          channel: "email",
          template: "order-canceled",
          data: { ...brandData, order },
        })
        logger.info(`[OrderNotification] Sent order-canceled email to ${customerEmail}`)
      }
    }

    if (eventName.includes("completed")) {
      if (customerEmail) {
        await notificationService.createNotifications({
          to: customerEmail,
          channel: "email",
          template: "order-completed",
          data: { ...brandData, order },
        })
        logger.info(`[OrderNotification] Sent order-completed email to ${customerEmail}`)
      }
    }
  } catch (err: any) {
    // Loud + structured so pm2 logs surface the exact failure. Earlier
    // version logged the error object directly which formatted as
    // "[Object object]" in some setups, hiding the real cause.
    logger.error(
      `[OrderNotification] FAILED event=${eventName} id=${rawId} message=${err?.message || err}`
    )
    if (err?.stack) {
      logger.error(`[OrderNotification] stack: ${err.stack.split("\n").slice(0, 5).join(" | ")}`)
    }
  }
}

export const config: SubscriberConfig = {
  event: [
    "order.placed",
    "order.completed",
    "order.canceled",
    // Fulfillment in Medusa v2 fires under multiple names depending on
    // the version. Listen to all so the email goes regardless.
    "order.fulfillment_created",
    "shipment.created",
    "delivery.created",
  ],
}
