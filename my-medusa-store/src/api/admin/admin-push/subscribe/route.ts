import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../../modules/push-notifications"
import PushNotificationsService from "../../../../modules/push-notifications/service"

/**
 * POST /admin/admin-push/subscribe
 *   Register (or re-activate) the calling admin's web-push subscription.
 *   Body: { endpoint, keys: { p256dh, auth }, label? }
 *   Idempotent by `endpoint`.
 *
 * DELETE /admin/admin-push/subscribe
 *   Body: { endpoint }  — soft-delete on logout / disable.
 *
 * Auth: standard /admin Bearer JWT. The admin user id is read from
 * `req.auth_context.actor_id`.
 */

function adminId(req: MedusaRequest): string | null {
  // Medusa v2 populates auth_context for authenticated admin routes.
  return (req as any).auth_context?.actor_id || null
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )
  const body = (req.body || {}) as Record<string, any>

  const endpoint = (body.endpoint || "").toString().trim()
  const p256dh = body.keys?.p256dh?.toString().trim() || ""
  const auth = body.keys?.auth?.toString().trim() || ""

  if (!endpoint || !p256dh || !auth) {
    return res
      .status(400)
      .json({ error: "endpoint and keys.p256dh, keys.auth are required" })
  }

  const ua = (req.headers["user-agent"] || "").toString().slice(0, 255)
  const data = {
    endpoint,
    p256dh,
    auth,
    admin_id: adminId(req),
    label: body.label ? String(body.label).slice(0, 120) : null,
    device_browser: parseBrowser(ua),
    is_active: true,
  }

  const existing = await (svc as any).listAdminPushSubscriptions({ endpoint })
  if (existing && existing.length > 0) {
    await (svc as any).updateAdminPushSubscriptions({
      id: existing[0].id,
      ...data,
    })
    return res.json({ success: true, id: existing[0].id, created: false })
  }

  const [created] = await (svc as any).createAdminPushSubscriptions([data])
  res.status(201).json({ success: true, id: created.id, created: true })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )
  const body = (req.body || {}) as Record<string, any>
  const endpoint = (body.endpoint || "").toString().trim()
  if (!endpoint) return res.status(400).json({ error: "endpoint required" })

  const existing = await (svc as any).listAdminPushSubscriptions({ endpoint })
  if (!existing || existing.length === 0) {
    return res.json({ success: true, deleted: 0 })
  }
  await (svc as any).deleteAdminPushSubscriptions(existing.map((s: any) => s.id))
  res.json({ success: true, deleted: existing.length })
}

function parseBrowser(ua: string): string {
  const u = ua.toLowerCase()
  if (u.includes("edg/")) return "Edge"
  if (u.includes("chrome/") && !u.includes("edg/")) return "Chrome"
  if (u.includes("firefox/")) return "Firefox"
  if (u.includes("safari/") && !u.includes("chrome/")) return "Safari"
  if (u.includes("opera") || u.includes("opr/")) return "Opera"
  return "Other"
}
