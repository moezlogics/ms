import { getVapidKey, registerPush, unregisterPush } from "./api"

/** base64url VAPID public key → Uint8Array for applicationServerKey. */
function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4)
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/")
  const raw = atob(base64)
  const out = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i)
  return out
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
}

export type PushStatus = "on" | "off" | "denied" | "unsupported"

/** Current push state on this device, so the UI can show it. */
export async function getPushStatus(): Promise<PushStatus> {
  if (!pushSupported()) return "unsupported"
  if (Notification.permission === "denied") return "denied"
  try {
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.getSubscription()
    return sub ? "on" : "off"
  } catch {
    return "off"
  }
}

export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | null> {
  if (!("serviceWorker" in navigator)) return null
  return navigator.serviceWorker.register("/sw.js")
}

/**
 * Ask permission, subscribe via the existing VAPID key, and register the
 * subscription with the backend. Returns a human status string.
 */
export async function enablePush(): Promise<{ ok: boolean; message: string }> {
  if (!pushSupported()) {
    return { ok: false, message: "This browser doesn't support push. Use Chrome on Android." }
  }

  const permission = await Notification.requestPermission()
  if (permission !== "granted") {
    return { ok: false, message: "Notification permission was not granted." }
  }

  const reg = (await navigator.serviceWorker.ready) as ServiceWorkerRegistration

  let sub = await reg.pushManager.getSubscription()
  if (!sub) {
    const { publicKey } = await getVapidKey()
    sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: urlBase64ToUint8Array(publicKey) as any,
    })
  }

  await registerPush(sub, navigator.userAgent.slice(0, 100))
  return { ok: true, message: "Notifications enabled on this device." }
}

export async function disablePush(): Promise<void> {
  if (!("serviceWorker" in navigator)) return
  const reg = await navigator.serviceWorker.ready
  const sub = await reg.pushManager.getSubscription()
  if (sub) {
    try {
      await unregisterPush(sub.endpoint)
    } catch {
      /* ignore */
    }
    await sub.unsubscribe()
  }
}
