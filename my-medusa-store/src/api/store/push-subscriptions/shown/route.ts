import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../../modules/push-notifications"
import PushNotificationsService from "../../../../modules/push-notifications/service"

/**
 * POST /store/push-subscriptions/shown
 *
 * Fired by the service worker's `push` event when a notification is shown on the device.
 * Increments the subscription's and campaign's impression/shown counters.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  try {
    const svc: PushNotificationsService = req.scope.resolve(
      PUSH_NOTIFICATIONS_MODULE
    )
    const body = (req.body || {}) as Record<string, any>
    const endpoint = (body.endpoint || "").toString().trim()
    const campaignId = body.campaign_id ? String(body.campaign_id) : null

    if (!endpoint) {
      return res.json({ success: true, ignored: true })
    }

    const now = new Date()

    // Bump per-subscription impression count
    const subs = await (svc as any).listPushSubscriptions({ endpoint })
    const sub = subs?.[0]
    if (sub) {
      await (svc as any).updatePushSubscriptions({
        id: sub.id,
        total_shown: (sub.total_shown || 0) + 1,
        last_shown_at: now,
      })
    }

    // Bump campaign impression/shown count
    if (campaignId) {
      try {
        const camps = await (svc as any).listPushCampaigns({ id: campaignId })
        const camp = camps?.[0]
        if (camp) {
          await (svc as any).updatePushCampaigns({
            id: camp.id,
            total_shown: (camp.total_shown || 0) + 1,
          })
        }
      } catch {
        // ignore — campaign may have been deleted
      }
    }

    res.json({ success: true })
  } catch {
    res.json({ success: true })
  }
}
