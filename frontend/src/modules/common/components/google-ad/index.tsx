"use client"

import { useEffect, useRef } from "react"
import { usePathname } from "next/navigation"

type GoogleAdProps = {
  /** AdSense ad-unit slot id. Defaults to the site's responsive unit. */
  slot?: string
  /** Reserved height (px) so the slot holds space before the ad fills. */
  minHeight?: number
  /** Extra classes on the wrapper (spacing, etc.). */
  className?: string
}

const AD_CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT || ""
const DEFAULT_SLOT = process.env.NEXT_PUBLIC_ADSENSE_SLOT || ""

/**
 * Google AdSense slot — reliable on Next.js App Router (SSR + SPA nav).
 *
 * DORMANT BY DEFAULT — renders nothing and does no push until BOTH
 * `NEXT_PUBLIC_ADSENSE_CLIENT` and a slot (env `NEXT_PUBLIC_ADSENSE_SLOT`
 * or the `slot` prop) are configured, AND the AdSense loader <script> is
 * added to the layout. Until then it is a safe no-op.
 *
 * WHY THIS REWRITE — the old version did:
 *   const adsbygoogle = window.adsbygoogle || []
 *   adsbygoogle.push({})
 * When the AdSense loader hadn't defined `window.adsbygoogle` yet (slow
 * network, or before the afterInteractive script ran), that pushed into a
 * THROWAWAY local array AdSense never reads → the ad silently never loaded.
 * That is the "ads load hi nahi hote → no impressions → no clicks → no
 * revenue" bug.
 *
 * Fixes:
 *  1. Assign back to window: `(window.adsbygoogle = window.adsbygoogle || []).push({})`
 *     so the request reaches AdSense even before the loader finishes (it
 *     drains the queued pushes once it loads).
 *  2. Push EXACTLY ONCE per slot (ref guard) → no "All ins elements already
 *     have ads" duplicate-init errors.
 *  3. Wait until the <ins> actually has width — AdSense permanently skips a
 *     0-width slot (availableWidth=0 → blank forever) — and retry until the
 *     loader is ready.
 *  4. Remount per route (`key={pathname}`) so a fresh ad fills on every
 *     client-side navigation, not just the first page.
 */
export default function GoogleAd({
  slot = DEFAULT_SLOT,
  minHeight = 100,
  className = "",
}: GoogleAdProps) {
  const pathname = usePathname()
  const insRef = useRef<HTMLModElement | null>(null)
  const pushed = useRef(false)

  useEffect(() => {
    // No client/slot configured → dormant no-op (no loader, no push).
    if (!AD_CLIENT || !slot) return
    pushed.current = false
    let tries = 0
    let timer: ReturnType<typeof setTimeout> | undefined

    const tryFill = () => {
      const ins = insRef.current
      if (!ins || pushed.current) return
      // Already filled (e.g. fast remount) → nothing to do.
      if (ins.getAttribute("data-adsbygoogle-status") === "done") {
        pushed.current = true
        return
      }
      // AdSense refuses to fill a 0-width slot → wait for layout, then retry.
      if (ins.getBoundingClientRect().width === 0) {
        if (tries++ < 25) timer = setTimeout(tryFill, 150)
        return
      }
      try {
        const w = window as any
        ;(w.adsbygoogle = w.adsbygoogle || []).push({})
        pushed.current = true
      } catch {
        // Loader not ready yet / transient → retry briefly.
        if (tries++ < 25) timer = setTimeout(tryFill, 200)
      }
    }

    // Let the new route paint first, then fill.
    timer = setTimeout(tryFill, 0)
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [pathname, slot])

  // No client/slot configured → render nothing.
  if (!AD_CLIENT || !slot) return null

  return (
    <div
      key={pathname}
      className={`w-full my-6 flex justify-center items-center ${className}`}
      style={{ minHeight }}
    >
      <ins
        ref={insRef}
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minHeight }}
        data-ad-client={AD_CLIENT}
        data-ad-slot={slot}
        data-ad-format="auto"
        data-full-width-responsive="true"
      />
    </div>
  )
}
