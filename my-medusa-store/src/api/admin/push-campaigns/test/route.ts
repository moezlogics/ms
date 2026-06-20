import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../../modules/push-notifications"
import PushNotificationsService from "../../../../modules/push-notifications/service"
import {
  configureWebPush,
  sendPushTo,
} from "../../../../modules/push-notifications/lib/web-push-client"

/**
 * POST /admin/push-campaigns/test
 *   Send a test push to the most recently subscribed device only.
 *   Lets the admin verify the SW + VAPID setup before launching a real
 *   campaign. Body fields are the same as the create endpoint.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )

  const cfg = configureWebPush()
  if (!cfg.configured) {
    return res.status(503).json({ error: "VAPID keys not configured" })
  }

  const body = (req.body || {}) as Record<string, any>
  const title = (body.title || "Test Notification").toString()
  const bodyText = (body.body || "If you can read this, push is working.").toString()

  // Most recent active subscription, or one matching `endpoint` if provided
  let target: any = null
  if (body.endpoint) {
    const matches = await (svc as any).listPushSubscriptions({
      endpoint: body.endpoint,
    })
    target = matches?.[0]
  } else {
    const recent = await (svc as any).listPushSubscriptions(
      { is_active: true },
      { order: { created_at: "DESC" } as any, take: 1 }
    )
    target = recent?.[0]
  }

  if (!target) {
    return res.status(404).json({ error: "No active subscriptions found" })
  }

  const r = await sendPushTo(
    {
      id: target.id,
      endpoint: target.endpoint,
      p256dh: target.p256dh,
      auth: target.auth,
    },
    {
      title,
      body: bodyText,
      icon: body.icon_url || undefined,
      image: body.image_url || undefined,
      url: body.action_url || "/",
      tag: "admin-test",
    }
  )

  if (r.expired && target.id) {
    try {
      await (svc as any).deletePushSubscriptions([target.id])
    } catch {}
  }

  res.json({ success: r.success, error: r.error })
}
