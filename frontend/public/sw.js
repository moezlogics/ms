/**
 * Web Push Service Worker.
 *
 * Registered by `<PushPermissionPrompt />` once the user grants
 * permission. Receives `push` events from the browser's push service
 * and shows the notification using the payload our backend sent.
 *
 * Payload shape (from backend):
 *   {
 *     title: string,
 *     body:  string,
 *     icon?: string,    // small icon (96x96)
 *     image?: string,   // rich-media banner (Chrome/Edge)
 *     url?: string,     // where the click goes
 *     badge?: string,
 *     tag?: string,     // collapse key — same tag replaces existing
 *     data?: any
 *   }
 */

/* eslint-disable no-restricted-globals */

self.addEventListener("install", (event) => {
  // Activate immediately so the first subscribe doesn't need a refresh
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim())
})

self.addEventListener("push", (event) => {
  if (!event.data) return

  let payload = {}
  try {
    payload = event.data.json()
  } catch (e) {
    payload = { title: "Notification", body: event.data.text() }
  }

  const title = payload.title || "Notification"
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/favicon.ico",
    image: payload.image || undefined,
    badge: payload.badge || payload.icon || "/favicon.ico",
    tag: payload.tag || undefined,
    // Stash the campaign id (when present) and backend URL so the click
    // handler can post engagement back without another round-trip.
    data: {
      url: payload.url || "/",
      campaign_id: (payload.data && payload.data.campaign_id) || null,
      backend_url: payload.backend_url || null,
      publishable_key: payload.publishable_key || null,
      ...(payload.data || {}),
    },
    requireInteraction: false,
    vibrate: [100, 50, 100],
  }

  event.waitUntil(self.registration.showNotification(title, options))
})

/**
 * Best-effort click tracking. Calls the backend so the admin dashboard
 * can report CTR per campaign. Resolves silently on any failure — we
 * never want a tracking error to block the page navigation.
 */
async function trackClick(data) {
  try {
    const backend = data && data.backend_url
    const key = data && data.publishable_key
    if (!backend) return
    // Fish the endpoint out of the current PushSubscription so we don't
    // have to thread it through every payload.
    let endpoint = null
    try {
      const sub = await self.registration.pushManager.getSubscription()
      endpoint = sub && sub.endpoint
    } catch (e) {
      /* ignore */
    }
    if (!endpoint) return
    const headers = { "Content-Type": "application/json" }
    if (key) headers["x-publishable-api-key"] = key
    await fetch(backend.replace(/\/$/, "") + "/store/push-subscriptions/click", {
      method: "POST",
      headers,
      body: JSON.stringify({
        endpoint,
        campaign_id: data.campaign_id || null,
      }),
      keepalive: true,
    })
  } catch (e) {
    /* best-effort */
  }
}

self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const data = event.notification.data || {}
  const targetUrl = data.url || "/"

  event.waitUntil(
    Promise.all([
      trackClick(data),
      self.clients
        .matchAll({ type: "window", includeUncontrolled: true })
        .then((clientList) => {
          // If we already have a tab open on this origin, focus it and navigate
          for (const client of clientList) {
            if ("focus" in client) {
              client.focus()
              if ("navigate" in client) {
                try {
                  return client.navigate(targetUrl)
                } catch (e) {
                  /* fall through to openWindow */
                }
              }
            }
          }
          // Otherwise open a new tab
          if (self.clients.openWindow) {
            return self.clients.openWindow(targetUrl)
          }
        }),
    ])
  )
})

self.addEventListener("pushsubscriptionchange", (event) => {
  // Browser rotated the subscription. Re-subscribe with the saved
  // VAPID public key (the page wires this back up on next visit).
  // We don't auto-resubscribe here because the page knows the right
  // backend URL and customer ID.
})
