/**
 * Storefront client for the backend's `/store/push-subscriptions` API.
 * Server-callable (uses MEDUSA_BACKEND_URL) and client-callable (uses
 * the public origin via the `/store` Next.js rewrite).
 *
 * Browser code should always go through the helpers in
 * `@lib/util/push-client.ts` — this module is just the HTTP layer.
 */

const PUBLIC_BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || "http://localhost:3062"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export type SubscribePayload = {
  endpoint: string
  keys: { p256dh: string; auth: string }
  customer_id?: string | null
  city?: string | null
  state?: string | null
  country?: string | null
  locale?: string | null
  timezone?: string | null
  subscribe_source?: string | null
  gender?: string | null
}

export async function syncPushSubscriptionFromCustomer(): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(
      `${PUBLIC_BACKEND_URL}/store/push-subscriptions/sync-from-customer`,
      {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
      }
    )
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}

export async function fetchVapidPublicKey(): Promise<string | null> {
  try {
    const res = await fetch(
      `${PUBLIC_BACKEND_URL}/store/push-subscriptions/vapid-public-key`,
      {
        headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
      }
    )
    if (!res.ok) return null
    const json = await res.json()
    return json.publicKey || null
  } catch {
    return null
  }
}

export async function postSubscription(
  payload: SubscribePayload
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${PUBLIC_BACKEND_URL}/store/push-subscriptions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify(payload),
    })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}

export async function deleteSubscription(
  endpoint: string
): Promise<{ ok: boolean }> {
  try {
    const res = await fetch(`${PUBLIC_BACKEND_URL}/store/push-subscriptions`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
        "x-publishable-api-key": PUBLISHABLE_KEY,
      },
      body: JSON.stringify({ endpoint }),
    })
    return { ok: res.ok }
  } catch {
    return { ok: false }
  }
}
