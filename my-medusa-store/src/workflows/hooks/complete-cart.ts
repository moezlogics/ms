import { completeCartWorkflow } from "@medusajs/medusa/core-flows";
import LoyaltyModuleService from "../../modules/loyalty/service";
import { LOYALTY_MODULE } from "../../modules/loyalty";
import { CartData, getCartLoyaltyPromotion } from "../../utils/promo";
import { MedusaError } from "@medusajs/framework/utils";
import { FIRST_PURCHASE_PROMOTION_CODE } from "../../constants";
import { PUSH_NOTIFICATIONS_MODULE } from "../../modules/push-notifications";
import {
  configureWebPush,
  sendPushBatch,
} from "../../modules/push-notifications/lib/web-push-client";

completeCartWorkflow.hooks.validate(
  async ({ input, cart }, { container }) => {
    const query = container.resolve("query")
    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )

    const { data: carts } = await query.graph({
      entity: "cart",
      fields: [
        "id", 
        "promotions.*", 
        "customer.*", 
        "promotions.rules.*", 
        "promotions.rules.values.*", 
        "promotions.application_method.*", 
        "metadata"
      ],
      filters: {
        id: cart.id
      }
    }, {
      throwIfKeyNotFound: true
    })

    const loyaltyPromo = getCartLoyaltyPromotion(carts[0] as unknown as CartData)

    if (!loyaltyPromo) {
      return
    }

    // Reservation model: points are deducted at *apply* time by
    // `reserveLoyaltyPointsStep`, so by the time the customer reaches
    // checkout the balance has already been spent. We no longer compare
    // `getPoints()` against the promo value — that would always fail
    // (the balance is now lower-by-the-redeemed-amount than it was when
    // they hit Apply).
    //
    // Instead, sanity-check that the cart actually carries the
    // `loyalty_promo_id`/`loyalty_amount` metadata pair, so the
    // downstream `order-placed` copy + `handle-order-points` workflow
    // have what they need. A promo without that pairing is a corrupt
    // state (cart was edited admin-side, race during apply, etc.) and
    // we'd rather fail loudly than place an order whose loyalty
    // accounting is broken.
    const cartMeta = (carts[0].metadata || {}) as Record<string, any>
    const hasLoyaltyMeta =
      typeof cartMeta.loyalty_promo_id === "string" &&
      Number(cartMeta.loyalty_amount) > 0
    if (!hasLoyaltyMeta) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Loyalty redemption is in an inconsistent state — please remove and re-apply your points."
      )
    }

    // First purchase discount validation logic
    const hasFirstPurchasePromo = cart.promotions?.some(
      (promo: any) => promo?.code === FIRST_PURCHASE_PROMOTION_CODE
    )

    if (hasFirstPurchasePromo) {
      if (!cart.customer_id) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "First purchase discount can only be applied to carts with a customer"
        )
      }

      const { data: [customerFirstPurchase] } = await query.graph({
        entity: "customer",
        fields: ["orders.*", "has_account"],
        filters: {
          id: cart.customer_id
        }
      })

      if (!customerFirstPurchase.has_account || (customerFirstPurchase?.orders?.length || 0) > 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "First purchase discount can only be applied to carts with no previous orders"
        )
      }
    }

  }
)

/**
 * ADMIN NEW-ORDER PUSH — runs INLINE inside completeCartWorkflow, right
 * after the order is created, in the SAME HTTP request as `/store/carts/
 * :id/complete`. This deliberately does NOT use the `order.placed` event
 * subscriber, because on this deployment the event bus was not delivering
 * `order.placed` to subscribers (orders completed fine, but no subscriber
 * — admin push, emails — ever fired). A workflow hook executes inline, so
 * it always runs when an order is placed.
 *
 * CRITICAL: this handler must NEVER throw. A throw here would trigger the
 * workflow's compensation and could roll the order back. Everything is
 * wrapped in try/catch and uses console.log (visible in pm2 logs).
 */
// `as any`: this @medusajs version's type defs only declare `hooks.validate`,
// but `orderCreated` DOES exist at runtime (confirmed: hooks = ['validate',
// 'beforePaymentAuthorization', 'orderCreated']). Cast past the stale types.
;(completeCartWorkflow.hooks as any).orderCreated(
  async (
    { order_id }: { order_id: string },
    { container }: { container: any }
  ) => {
    const cfg = configureWebPush()
    if (!cfg.configured) {
      console.log("[Push/hook] ⚠️ VAPID not configured — skipping all push")
      return
    }
    const svc: any = container.resolve(PUSH_NOTIFICATIONS_MODULE)

    // ── 1. ADMIN push — every installed admin device ──────────────────
    try {
      console.log(`[AdminPush/hook] 🔔 orderCreated — order_id=${order_id}`)
      const subs = await svc.listAdminPushSubscriptions({ is_active: true }, { take: 200 })
      console.log(`[AdminPush/hook] active admin devices = ${subs?.length || 0}`)
      if (subs?.length) {
        const result = await sendPushBatch(
          subs.map((s: any) => ({ id: s.id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
          {
            title: "🛒 New order received",
            body: "A new order just came in — tap to view.",
            url: `/orders/${order_id}`,
            tag: `admin-order-${order_id}`,
            data: { order_id },
          }
        )
        if (result.expiredIds.length) {
          try { await svc.deleteAdminPushSubscriptions(result.expiredIds) } catch { /* noop */ }
        }
        console.log(`[AdminPush/hook] 📤 sent=${result.sent}/${result.total} failed=${result.failed}`)
      }
    } catch (e: any) {
      console.log(`[AdminPush/hook] ❌ ERROR (ignored): ${e?.message || e}`)
    }

    // ── 2. CUSTOMER "order confirmed" push — the device that ordered ──
    // Same matching as order-push-notification.ts (by push_endpoint from
    // cart/order metadata, else customer_id) but INLINE, because the event
    // bus was not delivering order.placed. Uses the SAME `tag` as the
    // subscriber so if both ever fire, the SW dedupes (no double push).
    try {
      // Check if customer push notifications are disabled in site settings
      try {
        const sm: any = container.resolve("site_settings")
        const s = sm?.getAll ? await sm.getAll() : {}
        if (s?.push_notifications_enabled === "false") {
          console.log(`[CustomerPush/hook] Push notifications disabled in site settings — skipping auto-push for order=${order_id}`)
          return
        }
      } catch (e: any) {
        console.log(`[CustomerPush/hook] Failed to retrieve site settings: ${e.message}`)
      }

      const query = container.resolve("query")
      const { data: [ord] } = await query.graph({
        entity: "order",
        fields: [
          "id", "display_id", "total", "currency_code", "customer_id",
          "shipping_address.country_code", "metadata", "cart.metadata",
        ],
        filters: { id: order_id },
      })
      if (ord) {
        const pushEndpoint = ord.metadata?.push_endpoint || ord.cart?.metadata?.push_endpoint
        let csubs: any[] = []
        if (pushEndpoint) {
          csubs = await svc.listPushSubscriptions({ endpoint: pushEndpoint, is_active: true }, { take: 1 })
        }
        if (!csubs?.length && ord.customer_id) {
          csubs = await svc.listPushSubscriptions({ customer_id: ord.customer_id, is_active: true }, { take: 50 })
        }
        console.log(
          `[CustomerPush/hook] order=${order_id} endpoint=${pushEndpoint ? "yes" : "no"} customer_id=${ord.customer_id || "guest"} matches=${csubs?.length || 0}`
        )
        if (csubs?.length) {
          let storeName = process.env.STORE_NAME || "our store"
          let icon: string | undefined
          try {
            const sm: any = container.resolve("site_settings")
            const s = sm?.getAll ? await sm.getAll() : {}
            storeName = s?.site_name || storeName
            icon = s?.site_logo_url || undefined
          } catch { /* branding optional */ }
          const cc = (ord.shipping_address?.country_code || process.env.NEXT_PUBLIC_DEFAULT_REGION || "pk").toLowerCase()
          const oid = ord.display_id != null ? `#${ord.display_id}` : `#${String(ord.id).slice(-6)}`
          const r = await sendPushBatch(
            csubs.map((s: any) => ({ id: s.id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
            {
              title: "Order confirmed 🎉",
              body: `Thank you for shopping with ${storeName}! Order ${oid} has been received.`,
              icon,
              url: `/${cc}/account/orders/details/${ord.id}`,
              tag: `order-${ord.id}-order.placed`,
              data: { order_id: ord.id, event: "order.placed" },
            }
          )
          if (r.expiredIds.length) {
            try { await svc.deletePushSubscriptions(r.expiredIds) } catch { /* noop */ }
          }
          console.log(`[CustomerPush/hook] 📤 sent=${r.sent}/${r.total} failed=${r.failed}`)
        }
      }
    } catch (e: any) {
      console.log(`[CustomerPush/hook] ❌ ERROR (ignored): ${e?.message || e}`)
    }
  }
)