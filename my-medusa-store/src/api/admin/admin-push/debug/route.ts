import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../../modules/push-notifications"
import PushNotificationsService from "../../../../modules/push-notifications/service"
import { configureWebPush } from "../../../../modules/push-notifications/lib/web-push-client"

/**
 * GET /admin/admin-push/debug
 *
 * Diagnostic endpoint: returns the current state of the admin push
 * infrastructure so the operator can verify in one request whether:
 *   - VAPID keys are configured
 *   - Admin push subscriptions exist in the database
 *   - The worker process is likely running
 *
 * Auth: admin Bearer JWT.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const cfg = configureWebPush()

  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )

  let adminSubs: any[] = []
  let customerSubs: any[] = []
  try {
    adminSubs = await (svc as any).listAdminPushSubscriptions(
      { is_active: true },
      { take: 100 }
    )
  } catch (e: any) {
    adminSubs = [{ error: e?.message || "listAdminPushSubscriptions failed" }]
  }

  try {
    customerSubs = await (svc as any).listPushSubscriptions(
      { is_active: true },
      { take: 100 }
    )
  } catch (e: any) {
    customerSubs = [{ error: e?.message || "listPushSubscriptions failed" }]
  }

  const workerMode = process.env.MEDUSA_WORKER_MODE || "shared (default)"

  res.json({
    vapid: {
      configured: cfg.configured,
      publicKey: cfg.publicKey ? cfg.publicKey.slice(0, 20) + "..." : null,
      subject: cfg.configured ? process.env.VAPID_SUBJECT : null,
    },
    workerMode,
    adminSubscriptions: {
      count: Array.isArray(adminSubs) ? adminSubs.filter((s: any) => !s.error).length : 0,
      items: adminSubs.map((s: any) => ({
        id: s.id,
        admin_id: s.admin_id,
        device_browser: s.device_browser,
        is_active: s.is_active,
        endpoint: s.endpoint ? s.endpoint.slice(0, 60) + "..." : null,
        created_at: s.created_at,
        updated_at: s.updated_at,
        error: s.error,
      })),
    },
    customerSubscriptions: {
      count: Array.isArray(customerSubs) ? customerSubs.filter((s: any) => !s.error).length : 0,
      sample: customerSubs.slice(0, 5).map((s: any) => ({
        id: s.id,
        customer_id: s.customer_id,
        endpoint: s.endpoint ? s.endpoint.slice(0, 60) + "..." : null,
        is_active: s.is_active,
        created_at: s.created_at,
        error: s.error,
      })),
    },
    hints: [
      !cfg.configured && "⚠️ VAPID keys not configured — set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in .env",
      workerMode === "server" && "⚠️ This process is in SERVER mode — subscribers (push, email, etc.) only run in WORKER mode. Make sure medusa-worker is running.",
      workerMode === "shared (default)" && "ℹ️ Running in shared mode (server + worker in same process). Subscribers should fire.",
      (!adminSubs.length || adminSubs[0]?.error) && "⚠️ No active admin push subscriptions — open the admin app and enable notifications first.",
    ].filter(Boolean),
  })
}
