/* Service Worker — push receiver + minimal offline shell.
 *
 * Push payload shape (sent by the backend web-push client):
 *   { title, body, icon?, url?, tag?, data:{ order_id } }
 */

const SHELL_CACHE = "orders-admin-shell-v2"

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      // Pre-cache the app shell so we can answer navigations offline —
      // this (plus the fetch handler below) is what makes Chrome treat
      // the site as an INSTALLABLE PWA, not just a home-screen shortcut.
      try {
        const cache = await caches.open(SHELL_CACHE)
        await cache.addAll(["/", "/index.html"])
      } catch (_e) {
        /* ignore precache errors */
      }
      await self.skipWaiting()
    })()
  )
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys()
      await Promise.all(keys.filter((k) => k !== SHELL_CACHE).map((k) => caches.delete(k)))
      await self.clients.claim()
    })()
  )
})

// --- Fetch: network-first (no stale assets), offline → cached shell ---
// Required for installability. We always hit the network first so hashed
// assets are never stale; only when offline do we fall back to cache.
self.addEventListener("fetch", (event) => {
  const req = event.request
  if (req.method !== "GET") return
  event.respondWith(
    (async () => {
      try {
        return await fetch(req)
      } catch (_e) {
        // Offline. For page navigations, serve the cached shell.
        if (req.mode === "navigate") {
          const shell = await caches.match("/index.html")
          if (shell) return shell
        }
        const cached = await caches.match(req)
        if (cached) return cached
        return new Response("", { status: 504, statusText: "offline" })
      }
    })()
  )
})

// --- Push ---
self.addEventListener("push", (event) => {
  let payload = {}
  try {
    payload = event.data ? event.data.json() : {}
  } catch (_e) {
    payload = { title: "New notification", body: event.data ? event.data.text() : "" }
  }

  const title = payload.title || "New order"
  const options = {
    body: payload.body || "",
    icon: payload.icon || "/icon.svg",
    badge: "/icon.svg",
    tag: payload.tag || undefined,
    renotify: true,
    vibrate: [120, 60, 120],
    data: { url: payload.url || "/orders", ...(payload.data || {}) },
  }

  event.waitUntil(
    (async () => {
      // Tell any open app window to refetch immediately (instant live update).
      // Wrapped in try/catch so a failure here can NEVER prevent the
      // notification itself from showing — critical for the "app fully
      // closed" case where reliability matters most.
      try {
        const clientsArr = await self.clients.matchAll({
          type: "window",
          includeUncontrolled: true,
        })
        for (const c of clientsArr) {
          c.postMessage({ type: "new-order", data: payload.data || {} })
        }
      } catch (_e) {
        /* no open window / messaging failed — ignore, still notify */
      }
      await self.registration.showNotification(title, options)
    })()
  )
})

// --- Notification click → open/focus the order ---
self.addEventListener("notificationclick", (event) => {
  event.notification.close()
  const targetUrl = (event.notification.data && event.notification.data.url) || "/orders"

  event.waitUntil(
    (async () => {
      const all = await self.clients.matchAll({ type: "window", includeUncontrolled: true })
      for (const client of all) {
        // If a window is already open, focus it and navigate.
        if ("focus" in client) {
          await client.focus()
          if ("navigate" in client) {
            try {
              await client.navigate(targetUrl)
            } catch (_e) {
              /* cross-origin navigate can throw; ignore */
            }
          }
          return
        }
      }
      if (self.clients.openWindow) {
        await self.clients.openWindow(targetUrl)
      }
    })()
  )
})


