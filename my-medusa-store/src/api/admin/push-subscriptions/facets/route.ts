import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../../modules/push-notifications"
import PushNotificationsService from "../../../../modules/push-notifications/service"

/**
 * GET /admin/push-subscriptions/facets
 *
 * Drives the audience-filter UI on the campaign composer. Returns every
 * distinct value present in the active subscriber set together with a
 * subscriber count so the admin can see "Lahore (324)" etc. and pick
 * targets without typos.
 *
 * Response:
 *   {
 *     cities:       [{ key, count }, ...],
 *     states:       [{ key, count }, ...],
 *     countries:    [{ key, count }, ...],
 *     device_types: [{ key, count }, ...],
 *     os:           [{ key, count }, ...],
 *     browsers:     [{ key, count }, ...],
 *     locales:      [{ key, count }, ...],
 *     total_active: number,
 *     with_customer: number,
 *   }
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )

  // Fetch the full active set. For a typical store this is well under
  // the 50k cap; for very large stores swap this for a SQL GROUP BY.
  const all = await (svc as any).listPushSubscriptions(
    { is_active: true },
    { take: 50_000 }
  )

  const facet = (key: keyof any) => {
    const counts: Record<string, number> = {}
    for (const s of all) {
      const v = (s as any)[key]
      if (!v) continue
      counts[v] = (counts[v] || 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .map(([k, count]) => ({ key: k, count }))
  }

  let withCustomer = 0
  for (const s of all) if ((s as any).customer_id) withCustomer++

  res.json({
    cities: facet("city"),
    states: facet("state"),
    countries: facet("country"),
    device_types: facet("device_type"),
    os: facet("os"),
    browsers: facet("device_browser"),
    locales: facet("locale"),
    genders: facet("gender"),
    total_active: all.length,
    with_customer: withCustomer,
    anonymous: all.length - withCustomer,
  })
}
