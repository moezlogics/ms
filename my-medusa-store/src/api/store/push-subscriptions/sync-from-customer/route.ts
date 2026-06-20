import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../../modules/push-notifications"
import PushNotificationsService from "../../../../modules/push-notifications/service"

/**
 * POST /store/push-subscriptions/sync-from-customer
 *
 * Copies demographic data from the signed-in customer's profile onto
 * their push subscription row(s). Called by the storefront onboarding
 * wizard right after the gender step saves, so the newly-picked value
 * lands in the subscriber record the marketer will filter on.
 *
 * Two subscriber lookup strategies run together (the results are
 * unioned, deduped by id):
 *
 *   1. Every active subscription already linked to this `customer_id`
 *      — catches the case where the user has subscribed and signed in
 *      on the same browser (the browser then re-subscribed with a
 *      `customer_id` attached).
 *
 *   2. The `endpoint` the storefront caches in `localStorage` at
 *      subscribe time. This is the glue for the very common flow:
 *
 *         a. Anonymous visitor allows push → row created with
 *            `customer_id = null`.
 *         b. Visitor signs up / signs in → we don't re-subscribe
 *            the service worker, but we do know the endpoint from
 *            localStorage. Passing it here lets us back-fill both
 *            the `customer_id` and `gender` in one call.
 *
 * Body:
 *   {
 *     endpoint?: string  // optional — the browser's current push endpoint
 *   }
 *
 * Response:
 *   {
 *     synced: number,          // rows updated
 *     gender: string | null,   // value applied (for debugging)
 *     customer_id: string,
 *   }
 *
 * Requires the customer auth cookie. Silently returns `synced: 0` if
 * the customer hasn't picked a gender yet — harmless no-op, so the
 * storefront can call this every time the wizard finishes without
 * checking state first.
 */
export async function POST(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) {
  const customerId = req.auth_context?.actor_id
  if (!customerId) {
    return res.status(401).json({ message: "Not authenticated" })
  }

  const body = (req.body || {}) as Record<string, any>
  const endpoint = body.endpoint ? String(body.endpoint).trim() : null

  // Pull the latest customer record so we read freshly-saved metadata.
  const customerModuleService = req.scope.resolve(Modules.CUSTOMER) as any
  const customer = await customerModuleService
    .retrieveCustomer(customerId)
    .catch(() => null)
  if (!customer) {
    return res.status(404).json({ message: "Customer not found" })
  }

  const rawGender =
    customer.metadata && typeof customer.metadata.gender === "string"
      ? String(customer.metadata.gender).trim().toLowerCase()
      : ""
  const gender = rawGender ? rawGender.slice(0, 32) : null

  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )

  // ── Collect candidate subscriber rows ──
  const byCustomer = await (svc as any).listPushSubscriptions(
    { customer_id: customerId, is_active: true },
    { take: 50 }
  )

  let byEndpoint: any[] = []
  if (endpoint) {
    byEndpoint = await (svc as any).listPushSubscriptions({
      endpoint,
      is_active: true,
    })
  }

  const seen = new Set<string>()
  const targets = [...byCustomer, ...byEndpoint].filter((row: any) => {
    if (seen.has(row.id)) return false
    seen.add(row.id)
    return true
  })

  // ── Apply updates ──
  // We always attach customer_id (cheap idempotent back-fill for the
  // anonymous-then-signed-in flow). Gender only gets written when set;
  // we never clobber an existing value with null.
  let synced = 0
  for (const row of targets) {
    const patch: Record<string, any> = { id: row.id, customer_id: customerId }
    if (gender && row.gender !== gender) {
      patch.gender = gender
    } else if (!row.customer_id) {
      // no-op besides customer_id back-fill — still counts as synced
    } else if (!gender) {
      // customer hasn't picked a gender yet; skip this row
      continue
    }
    await (svc as any).updatePushSubscriptions(patch)
    synced++
  }

  res.json({
    synced,
    gender,
    customer_id: customerId,
  })
}
