import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../../modules/push-notifications"
import PushNotificationsService from "../../../../modules/push-notifications/service"
import {
  configureWebPush,
  sendPushBatch,
} from "../../../../modules/push-notifications/lib/web-push-client"

/**
 * POST /admin/admin-push/test
 *   Sends a test push to EVERY registered admin device (every phone /
 *   desktop where the app is installed and notifications are allowed) —
 *   so you can confirm the whole fleet receives order notifications, not
 *   just one device. Optional body: { endpoint } to target a single device.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const cfg = configureWebPush()
  if (!cfg.configured) {
    return res
      .status(503)
      .json({ ok: false, error: "VAPID keys not configured on the server." })
  }

  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )
  const body = (req.body || {}) as Record<string, any>
  const endpoint = body.endpoint ? String(body.endpoint).trim() : null

  // Default: ALL active admin devices. (Only narrow to one device if an
  // explicit endpoint is passed.) This matches how order notifications
  // fan out — every admin device, everywhere.
  let subs: any[] = endpoint
    ? await (svc as any).listAdminPushSubscriptions({ endpoint, is_active: true })
    : await (svc as any).listAdminPushSubscriptions(
        { is_active: true },
        { take: 500 }
      )

  if (!subs?.length) {
    return res.json({
      ok: false,
      error:
        "No active admin subscriptions found. Open the app, allow notifications, then try again.",
    })
  }

  const payload = {
    title: "✅ Admin push test",
    body: "If you can read this, order notifications will work on this device.",
    url: "/orders",
    tag: "admin-push-test",
    data: { test: true },
  }

  const result = await sendPushBatch(
    subs.map((s: any) => ({
      id: s.id,
      endpoint: s.endpoint,
      p256dh: s.p256dh,
      auth: s.auth,
    })),
    payload
  )

  if (result.expiredIds.length) {
    try {
      await (svc as any).deleteAdminPushSubscriptions(result.expiredIds)
    } catch {
      /* ignore prune errors */
    }
  }

  res.json({ ok: result.sent > 0, ...result })
}
