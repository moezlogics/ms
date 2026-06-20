/**
 * Thin wrapper around the `web-push` npm package.
 *
 * Centralizes VAPID setup so every code path (subscribers, admin
 * campaign sender) uses the same configured client. Reads VAPID keys
 * from env at first use.
 *
 * To generate keys:
 *   npx web-push generate-vapid-keys
 *
 * Then add to `.env`:
 *   VAPID_PUBLIC_KEY=<public>
 *   VAPID_PRIVATE_KEY=<private>
 *   VAPID_SUBJECT=mailto:admin@example.com
 *
 * The same `VAPID_PUBLIC_KEY` must also be exposed to the storefront
 * as `NEXT_PUBLIC_VAPID_PUBLIC_KEY` so the SW can subscribe.
 */

let _wp: any = null
let _configured = false

function getWebPush(): any {
  if (_wp) return _wp
  // Lazy require so the module loads even when web-push isn't installed yet
  // (during initial install or in test environments).
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  _wp = require("web-push")
  return _wp
}

/**
 * Configure the VAPID details on first call. Idempotent.
 */
export function configureWebPush(): {
  configured: boolean
  publicKey: string
  privateKey: string
  subject: string
} {
  const publicKey = process.env.VAPID_PUBLIC_KEY || ""
  const privateKey = process.env.VAPID_PRIVATE_KEY || ""
  const subject = process.env.VAPID_SUBJECT || "mailto:admin@example.com"

  if (!publicKey || !privateKey) {
    return { configured: false, publicKey, privateKey, subject }
  }

  if (!_configured) {
    try {
      getWebPush().setVapidDetails(subject, publicKey, privateKey)
      _configured = true
    } catch (e) {
      // Bad keys; surface a clear error at send time
      _configured = false
    }
  }

  return { configured: _configured, publicKey, privateKey, subject }
}

export type PushPayload = {
  title: string
  body: string
  icon?: string
  image?: string
  url?: string
  badge?: string
  tag?: string
  data?: Record<string, any>
}

export type PushSubscriptionLite = {
  id?: string
  endpoint: string
  p256dh: string
  auth: string
}

export type SendResult = {
  success: boolean
  /** HTTP status code from the push service (when reachable) */
  statusCode?: number
  /** True when the subscription is permanently dead (410 Gone or 404). */
  expired?: boolean
  error?: string
}

/**
 * Send a single notification. Always resolves — never throws — so callers
 * can fan out a batch send without try/catch noise.
 */
export async function sendPushTo(
  sub: PushSubscriptionLite,
  payload: PushPayload
): Promise<SendResult> {
  const cfg = configureWebPush()
  if (!cfg.configured) {
    return { success: false, error: "VAPID keys not configured" }
  }

  const wp = getWebPush()
  const subscription = {
    endpoint: sub.endpoint,
    keys: { p256dh: sub.p256dh, auth: sub.auth },
  }

  try {
    const res = await wp.sendNotification(
      subscription,
      JSON.stringify(payload),
      {
        TTL: 60 * 60 * 24, // 24h — push services can hold the notification this long
        // `high` urgency tells FCM/APNs to wake the device and deliver
        // IMMEDIATELY instead of batching it for a later Doze/maintenance
        // window — critical for "instant" new-order alerts on Android.
        urgency: "high",
      }
    )
    return { success: true, statusCode: res?.statusCode }
  } catch (err: any) {
    const statusCode = err?.statusCode
    // 404 / 410: subscription is dead, prune it
    const expired = statusCode === 404 || statusCode === 410
    return {
      success: false,
      statusCode,
      expired,
      error: err?.body || err?.message || "send failed",
    }
  }
}

/**
 * Fan-out send. Returns aggregate stats and the list of expired
 * subscription IDs the caller should soft-delete.
 */
export async function sendPushBatch(
  subs: PushSubscriptionLite[],
  payload: PushPayload,
  concurrency = 20
): Promise<{
  total: number
  sent: number
  failed: number
  expiredIds: string[]
}> {
  const expiredIds: string[] = []
  let sent = 0
  let failed = 0

  // Simple concurrency-limited fan-out
  let cursor = 0
  async function worker() {
    while (cursor < subs.length) {
      const i = cursor++
      const sub = subs[i]
      const r = await sendPushTo(sub, payload)
      if (r.success) sent++
      else {
        failed++
        if (r.expired && sub.id) expiredIds.push(sub.id)
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, subs.length) }, worker))

  return { total: subs.length, sent, failed, expiredIds }
}
