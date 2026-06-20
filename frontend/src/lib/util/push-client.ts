/**
 * Browser-side helpers for Web Push subscription.
 *
 * Flow:
 *   1. `isPushSupported()` — quick capability check
 *   2. `getCurrentPermission()` — read Notification.permission
 *   3. `subscribeToPush({ vapidPublicKey, customerId? })`
 *      → registers /sw.js, calls Notification.requestPermission(),
 *        creates a PushSubscription, and POSTs the result to the backend.
 *   4. `unsubscribeFromPush()` — undoes the above and DELETEs server-side
 *
 * Geo (city / state / country) is resolved SERVER-SIDE in the backend
 * route from the request IP. Client-side IP geo APIs (ipapi.co etc.)
 * are blocked by ad-blockers and rate-limit aggressively, so we don't
 * call them anymore — the backend has the real client IP via headers
 * and can do the lookup reliably with cache.
 */

import {
  postSubscription,
  deleteSubscription,
} from "@lib/data/push-subscriptions"

export function isPushSupported(): boolean {
  if (typeof window === "undefined") return false
  return (
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  )
}

export function getCurrentPermission(): NotificationPermission | "unsupported" {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return "unsupported"
  }
  return Notification.permission
}

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i)
  return arr
}

function arrayBufferToBase64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf)
  let s = ""
  for (let i = 0; i < bytes.byteLength; i++) s += String.fromCharCode(bytes[i])
  return btoa(s)
}

export type SubscribeOptions = {
  vapidPublicKey: string
  customerId?: string | null
}

export type SubscribeResult =
  | { status: "subscribed"; endpoint: string }
  | { status: "denied" }
  | { status: "unsupported" }
  | { status: "error"; error: string }

export async function subscribeToPush({
  vapidPublicKey,
  customerId,
}: SubscribeOptions): Promise<SubscribeResult> {
  if (!isPushSupported()) return { status: "unsupported" }

  try {
    // 1. Register the service worker
    let reg: ServiceWorkerRegistration
    try {
      reg = await navigator.serviceWorker.register("/sw.js", { scope: "/" })
    } catch (e: any) {
      return { status: "error", error: "service worker register failed: " + (e?.message || "") }
    }

    // 2. Request permission (no-op if already granted)
    const perm = await Notification.requestPermission()
    if (perm !== "granted") {
      return { status: "denied" }
    }

    // 3. Create the push subscription
    let pushSub = await reg.pushManager.getSubscription()
    if (!pushSub) {
      pushSub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      })
    }

    const json = pushSub.toJSON() as any
    const endpoint = json.endpoint as string
    const p256dh = json.keys?.p256dh
    const auth = json.keys?.auth

    if (!endpoint || !p256dh || !auth) {
      return { status: "error", error: "missing keys on PushSubscription" }
    }

    // 4. POST to backend — geo is resolved server-side from the request IP.
    //    We attach the things only the browser knows: timezone, locale,
    //    and the page where the subscribe gesture happened.
    let timezone: string | null = null
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null
    } catch {}
    const locale =
      typeof navigator !== "undefined" ? navigator.language || null : null
    const subscribeSource =
      typeof window !== "undefined"
        ? (window.location.pathname + window.location.search).slice(0, 255)
        : null

    const r = await postSubscription({
      endpoint,
      keys: { p256dh, auth },
      customer_id: customerId || null,
      locale,
      timezone,
      subscribe_source: subscribeSource,
    })
    if (!r.ok) {
      return { status: "error", error: "backend rejected subscription" }
    }

    // Mark in localStorage so we don't re-prompt
    try {
      localStorage.setItem("push:subscribed", "1")
      localStorage.setItem("push:endpoint", endpoint)
    } catch {}

    return { status: "subscribed", endpoint }
  } catch (e: any) {
    return { status: "error", error: e?.message || "unknown error" }
  }
}

export async function unsubscribeFromPush(): Promise<boolean> {
  if (!isPushSupported()) return false
  try {
    const reg = await navigator.serviceWorker.getRegistration("/")
    if (!reg) return false
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return true
    const endpoint = sub.endpoint
    await sub.unsubscribe()
    await deleteSubscription(endpoint)
    try {
      localStorage.removeItem("push:subscribed")
      localStorage.removeItem("push:endpoint")
    } catch {}
    return true
  } catch {
    return false
  }
}

export async function syncCurrentSubscription(
  customerId?: string | null
): Promise<void> {
  // Re-POSTs the current subscription. Useful after login so the
  // anonymous subscription gets linked to the customer record. The
  // backend re-resolves geo from the request IP on every POST, so
  // the city/state row stays fresh whenever the user moves networks.
  if (!isPushSupported()) return
  try {
    const reg = await navigator.serviceWorker.getRegistration("/")
    if (!reg) return
    const sub = await reg.pushManager.getSubscription()
    if (!sub) return
    const json = sub.toJSON() as any
    if (!json.endpoint || !json.keys?.p256dh || !json.keys?.auth) return
    let timezone: string | null = null
    try {
      timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || null
    } catch {}
    const locale =
      typeof navigator !== "undefined" ? navigator.language || null : null
    const subscribeSource =
      typeof window !== "undefined"
        ? (window.location.pathname + window.location.search).slice(0, 255)
        : null
    await postSubscription({
      endpoint: json.endpoint,
      keys: { p256dh: json.keys.p256dh, auth: json.keys.auth },
      customer_id: customerId || null,
      locale,
      timezone,
      subscribe_source: subscribeSource,
    })
  } catch {}
}
