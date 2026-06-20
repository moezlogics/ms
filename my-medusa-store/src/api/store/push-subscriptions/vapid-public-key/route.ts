import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

/**
 * GET /store/push-subscriptions/vapid-public-key
 *   Returns the VAPID public key the storefront needs to call
 *   `pushManager.subscribe({ applicationServerKey })`.
 *
 *   The public key is safe to expose. The private key MUST stay on the
 *   server — never returned by this endpoint.
 */
export async function GET(_req: MedusaRequest, res: MedusaResponse) {
  const publicKey = process.env.VAPID_PUBLIC_KEY || ""
  if (!publicKey) {
    return res.status(503).json({
      error:
        "VAPID public key is not configured. Run `npx web-push generate-vapid-keys` and set VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY in the backend .env.",
    })
  }
  res.json({ publicKey })
}
