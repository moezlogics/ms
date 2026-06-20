import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { configureWebPush } from "../../../../modules/push-notifications/lib/web-push-client"

/**
 * GET /admin/admin-push/vapid
 *
 * Returns the VAPID public key so the admin PWA's service worker can
 * call pushManager.subscribe({ applicationServerKey }). Reuses the same
 * VAPID keypair as the customer web-push system (no Firebase).
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const cfg = configureWebPush()
  if (!cfg.configured) {
    return res.status(503).json({
      error:
        "VAPID keys not configured on the server (VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY).",
    })
  }
  res.json({ publicKey: cfg.publicKey })
}
