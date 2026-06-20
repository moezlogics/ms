"use client"

import { useEffect, useRef } from "react"
import {
  isPushSupported,
  getCurrentPermission,
  subscribeToPush,
  syncCurrentSubscription,
} from "@lib/util/push-client"
import { fetchVapidPublicKey } from "@lib/data/push-subscriptions"

/**
 * Web Push permission initializer (LaraPush / OneSignal-style auto-prompt).
 *
 * Renders nothing visible. On mount it:
 *   1. Checks browser support and current permission state.
 *   2. If permission === "granted" — silently re-syncs the existing
 *      subscription with the backend so the customer link and geo stay
 *      fresh after login / IP change. Idempotent.
 *   3. If permission === "default" — waits for the FIRST user gesture
 *      (click / scroll / keydown) and then triggers the *native* browser
 *      prompt via `Notification.requestPermission()`. Modern browsers
 *      require a recent user gesture for the prompt to surface, so we
 *      can't trigger it directly on page load.
 *
 * Geo (city / state / country) is NOT collected client-side. The backend
 * resolves it from the request IP when the subscription is POSTed —
 * client-side IP-geo APIs (ipapi.co etc.) get blocked by ad-blockers
 * and rate-limit aggressively, which is why the previous `resolveGeo()`
 * call routinely returned `null`. See `push-client.ts` and
 * `api/store/push-subscriptions/route.ts` for the new flow.
 */
export default function PushPrompt({
  customerId,
}: {
  customerId?: string | null
}) {
  const handledRef = useRef(false)

  useEffect(() => {
    if (handledRef.current) return
    handledRef.current = true

    if (!isPushSupported()) return
    const perm = getCurrentPermission()
    if (perm === "denied" || perm === "unsupported") return

    let cancelled = false

    async function bootstrap() {
      const vapidKey = await fetchVapidPublicKey()
      if (!vapidKey || cancelled) return

      if (perm === "granted") {
        // Already subscribed in some past session — keep the row fresh
        await syncCurrentSubscription(customerId)
        return
      }

      // perm === "default" — request on first interaction
      const trigger = async () => {
        window.removeEventListener("click", trigger)
        window.removeEventListener("scroll", trigger)
        window.removeEventListener("keydown", trigger)
        if (cancelled) return
        await subscribeToPush({
          vapidPublicKey: vapidKey,
          customerId: customerId || null,
        })
      }
      window.addEventListener("click", trigger, { once: true, passive: true })
      window.addEventListener("scroll", trigger, { once: true, passive: true })
      window.addEventListener("keydown", trigger, { once: true, passive: true })
    }

    bootstrap()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [customerId])

  return null
}
