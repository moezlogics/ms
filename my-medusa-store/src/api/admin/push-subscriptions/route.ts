import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../modules/push-notifications"
import PushNotificationsService from "../../../modules/push-notifications/service"

/**
 * GET /admin/push-subscriptions
 *   List subscribers with optional filters and a small stats summary
 *   used to power the dashboard chips.
 *
 * Query:
 *   ?city=Lahore       — filter by city
 *   ?state=Punjab      — filter by state
 *   ?browser=Chrome    — filter by device browser
 *   ?customers_only=1  — only logged-in customers
 *   ?take=100          — page size (default 100, max 500)
 *   ?skip=0            — offset
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )

  const filter: Record<string, any> = { is_active: true }
  if (req.query.city) filter.city = req.query.city
  if (req.query.state) filter.state = req.query.state
  if (req.query.country) filter.country = req.query.country
  if (req.query.browser) filter.device_browser = req.query.browser
  if (req.query.device_type) filter.device_type = req.query.device_type
  if (req.query.os) filter.os = req.query.os
  if (req.query.gender) filter.gender = String(req.query.gender).toLowerCase()
  if (req.query.customers_only === "1") {
    // Filter out null customer_id — handled in JS below since MikroORM
    // operators need explicit `$ne` syntax on a different code path.
  }

  const take = Math.min(Number(req.query.take) || 100, 500)
  const skip = Number(req.query.skip) || 0

  const [rows, total] = await (svc as any).listAndCountPushSubscriptions(
    filter,
    { order: { created_at: "DESC" } as any, take, skip }
  )

  let subscribers = rows
  if (req.query.customers_only === "1") {
    subscribers = rows.filter((r: any) => !!r.customer_id)
  }

  // Aggregate stats over the active set (small enough to compute in-memory)
  const all = await (svc as any).listPushSubscriptions(
    { is_active: true },
    { take: 10_000 } // sane upper bound for dashboard stats
  )

  const cityCounts: Record<string, number> = {}
  const stateCounts: Record<string, number> = {}
  const browserCounts: Record<string, number> = {}
  const genderCounts: Record<string, number> = {}
  let withCustomer = 0
  for (const s of all) {
    if (s.city) cityCounts[s.city] = (cityCounts[s.city] || 0) + 1
    if (s.state) stateCounts[s.state] = (stateCounts[s.state] || 0) + 1
    if (s.device_browser) {
      browserCounts[s.device_browser] = (browserCounts[s.device_browser] || 0) + 1
    }
    if (s.gender) genderCounts[s.gender] = (genderCounts[s.gender] || 0) + 1
    if (s.customer_id) withCustomer++
  }

  const stats = {
    total_active: all.length,
    with_customer: withCustomer,
    anonymous: all.length - withCustomer,
    by_city: topN(cityCounts, 20),
    by_state: topN(stateCounts, 20),
    by_browser: browserCounts,
    by_gender: genderCounts,
  }

  res.json({ subscribers, count: total, stats })
}

function topN(obj: Record<string, number>, n: number) {
  return Object.entries(obj)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([key, count]) => ({ key, count }))
}
