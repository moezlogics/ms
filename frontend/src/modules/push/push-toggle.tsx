"use client"

import { useEffect, useState } from "react"
import {
  isPushSupported,
  getCurrentPermission,
  subscribeToPush,
  unsubscribeFromPush,
} from "@lib/util/push-client"
import { fetchVapidPublicKey } from "@lib/data/push-subscriptions"

/**
 * Push subscription toggle — the ONLY entry point that triggers the
 * native browser permission prompt.
 *
 * Renders a small bell button that lets the user explicitly opt in to
 * web push (or opt out if already subscribed). Drop into the footer,
 * account page, or anywhere a notification affordance makes sense.
 *
 * Note: the silent auto-prompt on first user gesture was removed —
 * surprising visitors with a permission dialog the moment they click
 * anywhere is bad UX, so subscribing is now strictly opt-in here.
 *
 * <PushToggle customerId={customer?.id} />
 */
export default function PushToggle({
  customerId,
  className,
}: {
  customerId?: string | null
  className?: string
}) {
  const [state, setState] = useState<"loading" | "off" | "on" | "denied" | "unsupported">(
    "loading"
  )
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!isPushSupported()) {
      setState("unsupported")
      return
    }
    const perm = getCurrentPermission()
    if (perm === "denied") setState("denied")
    else if (perm === "granted") setState("on")
    else setState("off")
  }, [])

  if (state === "loading" || state === "unsupported") return null

  const onClick = async () => {
    if (busy) return
    setBusy(true)
    try {
      if (state === "on") {
        await unsubscribeFromPush()
        setState("off")
      } else if (state === "off") {
        const key = await fetchVapidPublicKey()
        if (!key) return
        const r = await subscribeToPush({
          vapidPublicKey: key,
          customerId: customerId || null,
        })
        if (r.status === "subscribed") setState("on")
        else if (r.status === "denied") setState("denied")
      }
    } finally {
      setBusy(false)
    }
  }

  if (state === "denied") {
    return (
      <button
        type="button"
        disabled
        className={
          className ||
          "inline-flex items-center gap-2 text-xs text-ink/45 cursor-not-allowed"
        }
        title="Notifications are blocked. Enable them in your browser settings."
      >
        <i className="ph ph-bell-slash" aria-hidden /> Notifications blocked
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      className={
        className ||
        "inline-flex items-center gap-2 text-xs text-ink/70 hover:text-primary transition-colors"
      }
      aria-pressed={state === "on"}
    >
      <i className={state === "on" ? "ph-fill ph-bell" : "ph ph-bell"} aria-hidden />
      {state === "on" ? "Notifications on" : "Enable notifications"}
    </button>
  )
}
