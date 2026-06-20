import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { PUSH_NOTIFICATIONS_MODULE } from "../../../modules/push-notifications"
import PushNotificationsService from "../../../modules/push-notifications/service"
import { resolveGeoFromIp, extractClientIp } from "../../../utils/ip-geolocation"

/**
 * GET /store/push-subscriptions/vapid-public-key
 *   (handled in ./vapid-public-key/route.ts)
 *
 * POST /store/push-subscriptions
 *   Register a new browser subscription. Idempotent — if the same
 *   `endpoint` is sent again it updates the existing row (re-activates,
 *   refreshes geo/customer link).
 *
 * Body:
 *   {
 *     endpoint: string,
 *     keys: { p256dh: string, auth: string },
 *     city?: string, state?: string, country?: string,
 *     customer_id?: string
 *   }
 *
 * Geo resolution priority (highest → lowest):
 *   1. Body-supplied city/state/country (legacy clients)
 *   2. Cloudflare headers (`cf-ipcity`, `cf-region`, `cf-ipcountry`)
 *   3. Server-side IP geolocation lookup (cached, multi-provider)
 *      — used by the modern storefront which doesn't ship geo at all,
 *      so we always have city/state for every subscriber.
 */
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
  const deviceBrowser = parseBrowser(ua)
  const deviceType = parseDeviceType(ua)
  const os = parseOS(ua)

  // Locale from Accept-Language header (best-effort), or body override
  const acceptLang = (req.headers["accept-language"] || "").toString()
  const locale =
    (body.locale ? String(body.locale) : null) ||
    acceptLang.split(",")[0]?.trim() ||
    null

  const timezone = body.timezone ? String(body.timezone) : null
  const subscribeSource = body.subscribe_source
    ? String(body.subscribe_source).slice(0, 255)
    : null

  // ── Resolve geo (city / state / country) ──
  // 1. Body-supplied wins (legacy clients that did their own lookup)
  let city: string | null = body.city ? String(body.city) : null
  let state: string | null = body.state ? String(body.state) : null
  let country: string | null = body.country ? String(body.country) : null

  // 2. Cloudflare headers — free and accurate when CF is in front
  if (!city) city = (req.headers["cf-ipcity"] || "").toString() || null
  if (!state) state = (req.headers["cf-region"] || "").toString() || null
  if (!country) country = (req.headers["cf-ipcountry"] || "").toString() || null

  // 3. Server-side IP geolocation as the last fallback. We do this even
  // when one of the above is set but missing city — a Cloudflare edge
  // sometimes returns country only.
  if (!city || !state || !country) {
    const ip = extractClientIp(req as any)
    const geo = await resolveGeoFromIp(ip)
    if (geo) {
      city = city || geo.city
      state = state || geo.state
      country = country || geo.country
    }
  }

  // Optional gender. We accept male / female / other / prefer_not_to_say
  // but store whatever the caller sends (normalized lowercase) so future
  // values don't need code changes. Empty / missing = unknown (null).
  const rawGender = body.gender ? String(body.gender).trim().toLowerCase() : ""
  const gender = rawGender ? rawGender.slice(0, 32) : null

  const data = {
    endpoint,
    p256dh,
    auth,
    customer_id: body.customer_id ? String(body.customer_id) : null,
    city,
    state,
    country,
    user_agent: ua || null,
    device_browser: deviceBrowser,
    device_type: deviceType,
    os,
    locale,
    timezone,
    subscribe_source: subscribeSource,
    gender,
    is_active: true,
  }

  // Upsert by endpoint
  const existing = await (svc as any).listPushSubscriptions({ endpoint })
  if (existing && existing.length > 0) {
    await (svc as any).updatePushSubscriptions({
      id: existing[0].id,
      ...data,
    })
    return res.json({ success: true, id: existing[0].id, created: false })
  }

  const [created] = await (svc as any).createPushSubscriptions([data])
  res.status(201).json({ success: true, id: created.id, created: true })
}

/**
 * DELETE /store/push-subscriptions
 *   Body: { endpoint: string }
 *   Soft-delete a subscription (used when user toggles notifications off
 *   in the browser or in a UI control).
 */
export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: PushNotificationsService = req.scope.resolve(
    PUSH_NOTIFICATIONS_MODULE
  )
  const body = (req.body || {}) as Record<string, any>
  const endpoint = (body.endpoint || "").toString().trim()
  if (!endpoint) return res.status(400).json({ error: "endpoint required" })

  const existing = await (svc as any).listPushSubscriptions({ endpoint })
  if (!existing || existing.length === 0) {
    return res.json({ success: true, deleted: 0 })
  }

  await (svc as any).deletePushSubscriptions(existing.map((s: any) => s.id))
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

function parseDeviceType(ua: string): string {
  const u = ua.toLowerCase()
  if (/ipad|tablet|kindle|playbook/.test(u)) return "tablet"
  if (/android(?!.*mobile)/.test(u)) return "tablet"
  if (/mobi|iphone|ipod|blackberry|windows phone/.test(u)) return "mobile"
  return "desktop"
}

function parseOS(ua: string): string {
  const u = ua.toLowerCase()
  if (u.includes("android")) return "Android"
  if (/ipad|iphone|ipod/.test(u)) return "iOS"
  if (u.includes("windows")) return "Windows"
  if (u.includes("mac os")) return "macOS"
  if (u.includes("linux")) return "Linux"
  return "Other"
}
