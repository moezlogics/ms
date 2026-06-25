"use client"

import { useEffect, useRef, useState } from "react"

/**
 * CarWale-style ad slot — reserve space first, then fill.
 *
 * The storefront's old behaviour: admin pastes raw ad HTML into the single
 * `head_code` blob → the ad network injects creatives whenever it feels like
 * it, with NO reserved height → content jumps (Cumulative Layout Shift) and
 * ads "pop in late". This component fixes both, the same way fast sites
 * (CarWale, etc.) do it:
 *
 *   1. RESERVE the exact slot height up-front (min-height via CSS var), so
 *      the box occupies its full size from first paint — nothing shifts when
 *      the creative finally arrives.
 *   2. Show a calm SHIMMER placeholder inside the reserved box while it loads
 *      (never a spinner — a spinner re-centres and looks janky).
 *   3. LAZY-LOAD: only inject the ad markup when the slot is within ~500px of
 *      the viewport (IntersectionObserver), so below-the-fold ads never
 *      compete with first paint / the LCP image.
 *   4. SAFE INJECT: ad markup usually contains <script> tags. Setting
 *      innerHTML does NOT execute injected scripts (HTML5 spec), so we
 *      re-create each <script> node — that's what actually runs AdSense /
 *      GAM / house-ad loaders.
 *
 * `html` comes from an admin site-setting (e.g. `ad_home_top_html`). When it
 * is empty the component renders nothing — so an un-configured slot is a
 * pure no-op (zero layout impact), and ads only appear once the operator
 * pastes a unit.
 */
export type AdSlotProps = {
  /** Raw ad-unit HTML (from admin site-settings). Empty → renders nothing. */
  html?: string | null
  /** Reserved height on mobile, in px (default 100 = a 320x100 leaderboard). */
  minHeight?: number
  /** Reserved height on desktop, in px (defaults to `minHeight`). */
  minHeightDesktop?: number
  /** Small caption shown in the placeholder. */
  label?: string
  /** Extra classes on the outer wrapper (e.g. spacing). */
  className?: string
}

export default function AdSlot({
  html,
  minHeight = 100,
  minHeightDesktop,
  label = "Advertisement",
  className = "",
}: AdSlotProps) {
  const innerRef = useRef<HTMLDivElement>(null)
  const injected = useRef(false)
  const [loaded, setLoaded] = useState(false)

  const hasAd = !!(html && html.trim())

  useEffect(() => {
    if (!hasAd || injected.current) return
    const el = innerRef.current
    if (!el) return

    const inject = () => {
      if (injected.current) return
      injected.current = true
      try {
        const tpl = document.createElement("template")
        tpl.innerHTML = html as string
        const frag = tpl.content
        // Re-create <script> nodes — innerHTML-inserted scripts never run.
        frag.querySelectorAll("script").forEach((old) => {
          const s = document.createElement("script")
          for (const attr of Array.from(old.attributes)) {
            s.setAttribute(attr.name, attr.value)
          }
          s.textContent = old.textContent
          old.replaceWith(s)
        })
        el.appendChild(frag)
        // Give the creative a beat to paint before dropping the shimmer.
        setTimeout(() => setLoaded(true), 300)
      } catch {
        /* malformed ad html — leave the reserved box empty, no crash */
      }
    }

    let io: IntersectionObserver | null = null
    if (typeof IntersectionObserver !== "undefined") {
      io = new IntersectionObserver(
        (entries) => {
          for (const e of entries) {
            if (e.isIntersecting) {
              inject()
              io?.disconnect()
              break
            }
          }
        },
        // Fetch ~500px before the slot scrolls into view (≈ CarWale/GPT
        // lazy-load margins) so the ad is ready as the user reaches it.
        { rootMargin: "500px 0px" }
      )
      io.observe(el)
    } else {
      inject()
    }
    return () => io?.disconnect()
  }, [hasAd, html])

  if (!hasAd) return null

  return (
    <div
      className={`ad-slot ${className}`}
      style={
        {
          "--ad-mh": `${minHeight}px`,
          "--ad-mh-d": `${minHeightDesktop ?? minHeight}px`,
        } as React.CSSProperties
      }
    >
      {!loaded && (
        <div className="ad-slot__placeholder" aria-hidden="true">
          <span className="ad-slot__label">{label}</span>
        </div>
      )}
      <div ref={innerRef} className="ad-slot__inner" />
    </div>
  )
}
