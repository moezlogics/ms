import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PUSH_NOTIFICATIONS_MODULE } from "../modules/push-notifications"
import PushNotificationsService from "../modules/push-notifications/service"
import {
  configureWebPush,
  sendPushBatch,
} from "../modules/push-notifications/lib/web-push-client"

/**
 * Transactional push notifications driven by order/payment/fulfillment
 * lifecycle events.
 *
 * Each event maps to a small template that is rendered with the order
 * (display_id, currency, totals). Pushes are delivered to every active
 * web-push subscription belonging to the order's customer.
 *
 * Anonymous orders (no customer_id on the order) cannot be matched to a
 * subscription right now — this is a known gap; see the dashboard.
 *
 * Click URLs always include the storefront's `[countryCode]` segment so
 * the SW opens the page directly without a middleware redirect hop. The
 * country is inferred from the subscription row, falling back to the
 * configured default.
 */

type EventName =
  | "order.placed"
  | "order.canceled"
  | "order.completed"
  | "order.fulfillment_created"
  | "order.return_requested"
  | "shipment.created"
  | "delivery.created"
  | "payment.refunded"

type TemplateInput = {
  order: {
    id: string
    display_id: number | string | null
    currency_code: string | null
    total: number | null
    customer_id: string | null
  }
}

type Template = {
  title: string
  body: string
  /** Storefront path (without country code; we add that at send-time). */
  path: string
  /** Optional icon override; falls back to site logo. */
  icon?: string
}

const DEFAULT_COUNTRY = (process.env.NEXT_PUBLIC_DEFAULT_REGION || "us")
  .toLowerCase()

function fmtMoney(amount: number | null, currency: string | null): string {
  if (amount == null) return ""
  const c = (currency || "USD").toUpperCase()
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: c,
      maximumFractionDigits: 0,
    }).format(amount)
  } catch {
    return `${c} ${Math.round(amount)}`
  }
}

function shortId(displayId: number | string | null, fallback: string): string {
  if (displayId != null && String(displayId).length > 0) return `#${displayId}`
  // Fallback: last 6 chars of the order id
  return `#${fallback.slice(-6).toUpperCase()}`
}

/**
 * Build the push payload for an event.
 *
 * `store` is the live store name from site_settings (falls back to a
 * neutral word). It's woven into the copy so every push is clearly
 * branded — and updates automatically when the admin renames the
 * store, with no code change.
 */
function templateFor(
  event: EventName,
  ctx: TemplateInput,
  store: string
): Template {
  const { order } = ctx
  const oid = shortId(order.display_id, order.id)
  const total = fmtMoney(order.total, order.currency_code)
  const orderPath = `/account/orders/details/${order.id}`

  switch (event) {
    case "order.placed":
      return {
        title: "Order confirmed 🎉",
        body: `Thank you for shopping with ${store}! Order ${oid}${total ? ` (${total})` : ""} has been received.`,
        path: orderPath,
      }
    case "order.canceled":
      return {
        title: "Order cancelled",
        body: `Your ${store} order ${oid} has been cancelled. Any payment will be refunded.`,
        path: orderPath,
      }
    case "order.fulfillment_created":
      return {
        title: "Order packed 📦",
        body: `Good news! Order ${oid} is packed and ready to ship.`,
        path: orderPath,
      }
    case "shipment.created":
      return {
        title: "On the way 🚚",
        body: `Your ${store} order ${oid} has shipped — tap to track it.`,
        path: orderPath,
      }
    case "delivery.created":
      return {
        title: "Delivered ✅",
        body: `Order ${oid} has been delivered. We'd love your review!`,
        path: orderPath,
      }
    case "order.completed":
      return {
        title: "Order complete ✅",
        body: `Order ${oid} is complete. Tap to leave a review and earn points.`,
        path: orderPath,
      }
    case "order.return_requested":
      return {
        title: "Return requested",
        body: `We've received your return request for ${store} order ${oid}.`,
        path: orderPath,
      }
    case "payment.refunded":
      return {
        title: "Refund issued 💰",
        body: `A refund${total ? ` of ${total}` : ""} has been issued for your ${store} order ${oid}.`,
        path: orderPath,
      }
  }
}

async function loadOrderById(query: any, orderId: string) {
  const { data } = await query.graph({
    entity: "order",
    fields: [
      "id",
      "display_id",
      "currency_code",
      "total",
      "customer_id",
      "shipping_address.country_code",
      "metadata",
      // Pull `cart.metadata` too so we can read `push_endpoint` from the
      // cart even when `order-placed.ts` hasn't finished copying it onto
      // the order yet. Both subscribers fire on `order.placed` in parallel
      // and Medusa makes no ordering guarantees — without this fallback,
      // every guest-checkout push race-loses and is silently dropped.
      "cart.metadata",
    ],
    filters: { id: orderId },
  })
  return data?.[0] || null
}

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
      const { data } = await query.graph({
        entity: "fulfillment",
        fields: ["id", "order.id"],
        filters: { id },
      })
      const orderId = data?.[0]?.order?.id
      if (orderId) return orderId
    }

    if (eventName === "payment.refunded") {
      const { data } = await query.graph({
        entity: "payment",
        fields: ["id", "payment_collection.order.id"],
        filters: { id },
      })
      return data?.[0]?.payment_collection?.order?.id ?? null
    }

    return id
  } catch (e) {
    logger?.error?.(
      `[PushNotification] resolveOrderId failed for ${eventName}/${id}: ${(e as Error).message}`
    )
    return null
  }
}

export default async function pushNotificationOrderHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const eventName = event.name as EventName
  const targetId = event.data?.id
  if (!targetId) return

  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  logger.info(`[PushNotification] ✅ SUBSCRIBER FIRED for ${eventName} — id=${targetId}`)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  // VAPID is required to send anything — bail early if unconfigured.
  const cfg = configureWebPush()
  if (!cfg.configured) {
    logger.warn(
      `[PushNotification] VAPID keys not configured — skipping ${eventName}`
    )
    return
  }

  // Resolve to an order regardless of which entity the event carries.
  let order: any = null
  try {
    const orderId = await resolveOrderId(container, eventName, targetId, logger)
    if (!orderId) {
      logger.warn(
        `[PushNotification] Could not resolve order id for ${eventName}/${targetId} — skipping.`
      )
      return
    }
    order = await loadOrderById(query, orderId)
  } catch (e) {
    logger.error(
      `[PushNotification] Failed to load order for ${eventName}/${targetId}: ${(e as Error).message}`
    )
    return
  }

  if (!order) {
    logger.warn(
      `[PushNotification] No order found for ${eventName}/${targetId} — skipping`
    )
    return
  }

  // Anonymous orders can't target a subscription unless we have a
  // `push_endpoint` somewhere reachable. Try order.metadata first, then
  // fall back to cart.metadata — see comment in loadOrderById for the
  // race-condition reasoning.
  const pushEndpoint =
    order.metadata?.push_endpoint || order.cart?.metadata?.push_endpoint
  if (!order.customer_id && !pushEndpoint) {
    logger.info(
      `[PushNotification] Order ${order.id} has no customer_id and no push_endpoint (order.metadata or cart.metadata) — skipping push`
    )
    return
  }

  // Pull branding (store name + logo icon) from site settings up front so
  // both the copy and the icon stay in sync with the admin's config.
  // Module identifier is `site_settings` (underscore) with a `getAll()` API.
  let storeName = process.env.STORE_NAME || process.env.MEDUSA_STORE_NAME || "our store"
  let iconUrl: string | undefined
  try {
    const settingsModule = container.resolve("site_settings" as any)
    const settings = settingsModule?.getAll ? await settingsModule.getAll() : {}
    storeName = settings?.site_name || storeName
    iconUrl = settings?.site_logo_url || undefined
  } catch {
    // optional — copy uses env/default store name, icon falls back to SW default
  }

  const tpl = templateFor(
    eventName,
    {
      order: {
        id: order.id,
        display_id: order.display_id,
        currency_code: order.currency_code,
        total: order.total,
        customer_id: order.customer_id,
      },
    },
    storeName
  )

  // Find active subscriptions for this customer or push endpoint
  const svc: PushNotificationsService = container.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )
  let subs: any[] = []
  if (pushEndpoint) {
    subs = await (svc as any).listPushSubscriptions(
      { endpoint: pushEndpoint, is_active: true },
      { take: 1 }
    )
  }
  if (!subs?.length && order.customer_id) {
    subs = await (svc as any).listPushSubscriptions(
      { customer_id: order.customer_id, is_active: true },
      { take: 50 }
    )
  }

  if (!subs?.length) {
    logger.info(
      `[PushNotification] No active subscriptions found for customer ${order.customer_id || "guest"} with endpoint ${pushEndpoint || "none"} (${eventName})`
    )
    return
  }

  // Resolve the country prefix from the order's shipping address; fall
  // back to subscription country, then env default. This keeps the SW
  // click target on a route that exists without a redirect hop.
  const orderCountry =
    order.shipping_address?.country_code?.toLowerCase() || ""

  // (storeName + iconUrl already resolved from site_settings above.)

  // Fan out per-subscription so each push uses the correct country prefix
  let total = 0
  let sent = 0
  let failed = 0
  const expiredIds: string[] = []

  for (const sub of subs) {
    const cc =
      orderCountry ||
      (sub.country ? String(sub.country).toLowerCase() : "") ||
      DEFAULT_COUNTRY
    const url = `/${cc}${tpl.path}`

    const payload: any = {
      title: tpl.title,
      body: tpl.body,
      icon: iconUrl,
      url,
      tag: `order-${order.id}-${eventName}`,
      // Forward backend URL + publishable key so the SW click handler
      // can record engagement (CTR per transactional event type).
      backend_url:
        process.env.STORE_PUBLIC_BACKEND_URL ||
        process.env.MEDUSA_BACKEND_URL ||
        undefined,
      publishable_key:
        process.env.MEDUSA_PUBLISHABLE_KEY ||
        process.env.STORE_PUBLISHABLE_KEY ||
        undefined,
      data: {
        order_id: order.id,
        event: eventName,
      },
    }

    const r = await sendPushBatch(
      [
        {
          id: sub.id,
          endpoint: sub.endpoint,
          p256dh: sub.p256dh,
          auth: sub.auth,
        },
      ],
      payload
    )
    total += r.total
    sent += r.sent
    failed += r.failed
    expiredIds.push(...r.expiredIds)
  }

  // Prune dead endpoints
  if (expiredIds.length) {
    try {
      await (svc as any).deletePushSubscriptions(expiredIds)
    } catch (e) {
      logger.warn(
        `[PushNotification] Failed to prune ${expiredIds.length} dead subs: ${(e as Error).message}`
      )
    }
  }

  logger.info(
    `[PushNotification] ${eventName} order=${order.id} sent=${sent}/${total} failed=${failed} pruned=${expiredIds.length}`
  )
}

export const config: SubscriberConfig = {
  event: [
    "order.placed",
    "order.canceled",
    "order.completed",
    "order.fulfillment_created",
    "order.return_requested",
    "shipment.created",
    "delivery.created",
    "payment.refunded",
  ],
}
