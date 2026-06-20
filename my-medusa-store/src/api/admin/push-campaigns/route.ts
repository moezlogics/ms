import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../modules/push-notifications"
import PushNotificationsService from "../../../modules/push-notifications/service"
import {
  configureWebPush,
  sendPushBatch,
} from "../../../modules/push-notifications/lib/web-push-client"

/**
 * GET /admin/push-campaigns
 *   List campaign history (newest first) — drives the dashboard table.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )
  const [campaigns, count] = await (svc as any).listAndCountPushCampaigns(
    {},
    { order: { created_at: "DESC" } as any, take: 100 }
  )
  res.json({ campaigns, count })
}

/**
 * POST /admin/push-campaigns
 *   Create + send a campaign in one shot. Filters are applied to pick
 *   the active subscriber set, then `web-push` fans out the payload.
 *
 * Body:
 *   {
 *     title:        string,
 *     body:         string,
 *     icon_url?:    string,    // small icon (96x96 or 192x192)
 *     image_url?:   string,    // rich media banner
 *     action_url?:  string,    // where the click goes
 *     filter_cities?:  string[],
 *     filter_states?:  string[],
 *     dry_run?: boolean
 *   }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )
  const logger = req.scope.resolve("logger") as any

  const body = (req.body || {}) as Record<string, any>
  const title = (body.title || "").toString().trim()
  const bodyText = (body.body || "").toString().trim()
  if (!title) return res.status(400).json({ error: "title is required" })
  if (!bodyText) return res.status(400).json({ error: "body is required" })

  const cfg = configureWebPush()
  if (!cfg.configured) {
    return res.status(503).json({
      error:
        "VAPID keys not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in the backend .env (run `npx web-push generate-vapid-keys`).",
    })
  }

  const toList = (v: any): string[] | null =>
    Array.isArray(v) ? v.filter(Boolean).map(String) : null

  const filterCities = toList(body.filter_cities)
  const filterStates = toList(body.filter_states)
  const filterCountries = toList(body.filter_countries)
  const filterDeviceTypes = toList(body.filter_device_types)
  const filterOs = toList(body.filter_os)
  const filterBrowsers = toList(body.filter_browsers)
  const filterGenders = toList(body.filter_genders)
  const customersOnly = body.filter_customers_only === true

  // Find target subscribers
  const filter: Record<string, any> = { is_active: true }
  // We can't combine OR filters easily through the service, so we fetch
  // all active subscribers and filter in-memory (typical campaign sets
  // are < 100k; suitable for a single Node process). For production
  // scale this should be a worker queue + DB-side filtering.
  const all = await (svc as any).listPushSubscriptions(filter, {
    take: 100_000,
  })

  const matchOneOf = (val: any, list: string[] | null) => {
    if (!list || list.length === 0) return true
    if (!val) return false
    const set = new Set(list.map((c) => c.toLowerCase()))
    return set.has(String(val).toLowerCase())
  }

  let targets = all.filter((s: any) => {
    if (!matchOneOf(s.city, filterCities)) return false
    if (!matchOneOf(s.state, filterStates)) return false
    if (!matchOneOf(s.country, filterCountries)) return false
    if (!matchOneOf(s.device_type, filterDeviceTypes)) return false
    if (!matchOneOf(s.os, filterOs)) return false
    if (!matchOneOf(s.device_browser, filterBrowsers)) return false
    if (!matchOneOf(s.gender, filterGenders)) return false
    if (customersOnly && !s.customer_id) return false
    return true
  })

  if (body.dry_run) {
    return res.json({
      success: true,
      dry_run: true,
      total_targeted: targets.length,
    })
  }

  // Persist the campaign first so we have an ID for the audit log
  const [campaign] = await (svc as any).createPushCampaigns([
    {
      title,
      body: bodyText,
      icon_url: body.icon_url ? String(body.icon_url) : null,
      image_url: body.image_url ? String(body.image_url) : null,
      action_url: body.action_url ? String(body.action_url) : null,
      filter_cities: filterCities ? JSON.stringify(filterCities) : null,
      filter_states: filterStates ? JSON.stringify(filterStates) : null,
      filter_countries: filterCountries ? JSON.stringify(filterCountries) : null,
      filter_device_types: filterDeviceTypes
        ? JSON.stringify(filterDeviceTypes)
        : null,
      filter_os: filterOs ? JSON.stringify(filterOs) : null,
      filter_browsers: filterBrowsers ? JSON.stringify(filterBrowsers) : null,
      filter_genders: filterGenders ? JSON.stringify(filterGenders) : null,
      filter_customers_only: customersOnly,
      total_targeted: targets.length,
      total_sent: 0,
      total_failed: 0,
      status: "sending",
    },
  ])

  // Build the payload the SW will receive. We thread the backend URL
  // and publishable key through so the SW can post click events back
  // for CTR tracking. (See `public/sw.js` `trackClick`.)
  const payload: any = {
    title,
    body: bodyText,
    icon: body.icon_url || undefined,
    image: body.image_url || undefined,
    url: body.action_url || "/",
    tag: `campaign-${campaign.id}`,
    backend_url:
      process.env.STORE_PUBLIC_BACKEND_URL ||
      process.env.MEDUSA_BACKEND_URL ||
      undefined,
    publishable_key:
      process.env.MEDUSA_PUBLISHABLE_KEY ||
      process.env.STORE_PUBLISHABLE_KEY ||
      undefined,
    data: { campaign_id: campaign.id },
  }

  // Fan out
  const result = await sendPushBatch(
    targets.map((t: any) => ({
      id: t.id,
      endpoint: t.endpoint,
      p256dh: t.p256dh,
      auth: t.auth,
    })),
    payload
  )

  // Mark expired subscriptions for pruning
  if (result.expiredIds.length > 0) {
    try {
      await (svc as any).deletePushSubscriptions(result.expiredIds)
    } catch (e) {
      logger?.warn?.(
        `[PushCampaign] Failed to prune ${result.expiredIds.length} expired subs: ${(e as Error).message}`
      )
    }
  }

  // Update campaign with final stats
  await (svc as any).updatePushCampaigns({
    id: campaign.id,
    total_sent: result.sent,
    total_failed: result.failed,
    status: result.failed === result.total ? "failed" : "sent",
    sent_at: new Date(),
  })

  res.json({
    success: true,
    campaign_id: campaign.id,
    total_targeted: result.total,
    total_sent: result.sent,
    total_failed: result.failed,
    expired_pruned: result.expiredIds.length,
  })
}
