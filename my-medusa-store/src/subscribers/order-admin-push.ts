import type { SubscriberArgs, SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { PUSH_NOTIFICATIONS_MODULE } from "../modules/push-notifications"
import PushNotificationsService from "../modules/push-notifications/service"
import {
  configureWebPush,
  sendPushBatch,
} from "../modules/push-notifications/lib/web-push-client"

/**
 * ADMIN push on a new order — MINIMAL + LOUD DIAGNOSTICS.
 *
 * Uses console.log (NOT the framework logger) so the markers show up in
 * `pm2 logs` even if the logger's level is filtered to http-only — that's
 * why earlier the subscriber's firing was invisible in the logs.
 *
 * Runs only in MEDUSA_WORKER_MODE = worker | shared.
 */

// Runs ONCE when Medusa loads this subscriber file at startup. If you do
// NOT see this line right after `pm2 restart`, the file isn't deployed /
// built / registered on the server.
console.log("[AdminPush] ✅ MODULE LOADED — subscriber registered for order.placed")

export default async function orderAdminPushHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const orderId = event.data?.id
  // console.log so it's visible regardless of logger level.
  console.log(`[AdminPush] 🔔 order.placed FIRED — orderId=${orderId || "NONE"}`)
  if (!orderId) return

  const cfg = configureWebPush()
  if (!cfg.configured) {
    console.log("[AdminPush] ⚠️ VAPID not configured — skipping")
    return
  }

  const svc: PushNotificationsService = container.resolve(PUSH_NOTIFICATIONS_MODULE)

  let subs: any[] = []
  try {
    subs = await (svc as any).listAdminPushSubscriptions({ is_active: true }, { take: 200 })
  } catch (e: any) {
    console.log(`[AdminPush] ❌ listAdminPushSubscriptions failed: ${e?.message || e}`)
    return
  }
  console.log(`[AdminPush] active admin devices = ${subs?.length || 0}`)
  if (!subs?.length) return

  const payload = {
    title: "🛒 New order received",
    body: "A new order just came in — tap to view.",
    url: `/orders/${orderId}`,
    tag: `admin-order-${orderId}`,
    data: { order_id: orderId },
  }

  try {
    const result = await sendPushBatch(
      subs.map((s) => ({ id: s.id, endpoint: s.endpoint, p256dh: s.p256dh, auth: s.auth })),
      payload
    )

    if (result.expiredIds.length) {
      try {
        await (svc as any).deleteAdminPushSubscriptions(result.expiredIds)
      } catch {
        /* ignore prune errors */
      }
    }

    console.log(
      `[AdminPush] 📤 order=${orderId} sent=${result.sent}/${result.total} failed=${result.failed} pruned=${result.expiredIds.length}`
    )
  } catch (err: any) {
    console.log(`[AdminPush] ❌ SEND FAILED order=${orderId} message=${err?.message || err}`)
  }
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
