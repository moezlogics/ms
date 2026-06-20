"use client"

import { useEffect, useMemo, useState } from "react"

type SocialLink = {
  key: string
  url: string
  icon: string // phosphor class suffix e.g. "facebook-logo"
  label: string
}

/**
 * Continuous announcement-bar ticker (Shopify / Charles & Keith style).
 *
 * - Accepts an arbitrary list of `texts` (admin enters one per line).
 * - Renders them inline, separated by a •, then duplicates the whole
 *   strip a second time so the CSS keyframe can translate by exactly
 *   -50% for a seamless infinite loop with no visible jump.
 * - Speed is driven by total character length: a longer marquee gets a
 *   proportionally longer duration so the visual scroll rate stays
 *   roughly constant whether the admin entered one short slogan or
 *   five long ones.
 * - Pauses on hover / focus and respects `prefers-reduced-motion`.
 * - Dismiss button stores a session flag so the bar stays hidden until
 *   the tab is closed.
 */
export default function AnnouncementBar({
  texts,
  socialLinks,
  bg,
  fg,
  /** Admin-tunable: pixels per second. Larger = faster. Defaults to 60. */
  speedPxPerSec = 60,
}: {
  texts: string[]
  socialLinks: SocialLink[]
  bg?: string | null
  fg?: string | null
  speedPxPerSec?: number
}) {
  const [dismissed, setDismissed] = useState(false)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setHydrated(true)
    try {
      if (sessionStorage.getItem("announcement-dismissed") === "1") {
        setDismissed(true)
      }
    } catch {
      /* ignore storage errors (private mode, etc.) */
    }
  }, [])

  const onDismiss = () => {
    setDismissed(true)
    try {
      sessionStorage.setItem("announcement-dismissed", "1")
    } catch {
      /* noop */
    }
  }

  // Normalise: strip blanks. If admin entered nothing, render nothing.
  const items = useMemo(
    () => texts.map((t) => t.trim()).filter(Boolean),
    [texts]
  )

  // Approximate pixel length of one full pass of all items so we can
  // compute an animation duration that keeps a constant visual speed
  // regardless of how many announcements were entered. Width per
  // character (~7.5px at our 12px/upper­case font) is an estimate; the
  // exact value doesn't matter as long as it scales linearly.
  const APPROX_PX_PER_CHAR = 7.5
  const ITEM_GUTTER_PX = 80 // matches the px-10 (40px) on each side
  const totalChars = items.reduce((n, t) => n + t.length, 0)
  const approxStripPx =
    totalChars * APPROX_PX_PER_CHAR + items.length * ITEM_GUTTER_PX
  const durationSec = Math.max(15, Math.round(approxStripPx / speedPxPerSec))

  // Server-render the bar so first paint isn't blank; hide after
  // hydration if dismissed (or if the admin saved an empty list).
  if (hydrated && dismissed) return null
  if (items.length === 0) return null

  return (
    <div
      className="w-full relative"
      style={{
        background: bg || "rgb(var(--color-primary))",
        color: fg || "rgb(var(--color-primary-fg))",
      }}
      data-testid="announcement-bar"
    >
      <div className="container-anvogue h-[36px] md:h-[40px] flex items-center gap-3">
        {/* Left: social icons (desktop only) */}
        <div className="hidden md:flex items-center gap-3 flex-shrink-0 min-w-[120px]">
          {socialLinks.map((s) => (
            <a
              key={s.key}
              href={s.url}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={s.label}
              className="opacity-70 hover:opacity-100 transition-opacity"
            >
              <i className={`ph-fill ph-${s.icon} text-[14px]`} aria-hidden />
            </a>
          ))}
        </div>

        {/* Center: continuous marquee ticker */}
        <div
          className="announcement-ticker flex-1 overflow-hidden mx-1 md:mx-4"
          style={
            {
              ["--announcement-ticker-duration" as any]: `${durationSec}s`,
            } as React.CSSProperties
          }
          aria-label="Announcements"
        >
          <div className="announcement-ticker__track" role="marquee">
            {/* Two identical halves so a translateX(-50%) loops seamlessly. */}
            <Strip items={items} />
            <Strip items={items} aria-hidden />
          </div>
        </div>

        {/* Right: dismiss button */}
        <div className="flex items-center flex-shrink-0 justify-end">
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss announcement"
            className="w-6 h-6 flex items-center justify-center rounded-full opacity-60 hover:opacity-100 hover:bg-white/10 transition-all"
          >
            <i className="ph-bold ph-x text-[10px]" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}

/** One full pass of all announcement items, separated by bullets. */
function Strip({
  items,
  ...rest
}: {
  items: string[]
  "aria-hidden"?: boolean
}) {
  return (
    <span className="inline-flex items-center" {...rest}>
      {items.map((t, i) => (
        <span key={i} className="inline-flex items-center">
          <span className="px-10 text-[11px] md:text-[12px] font-semibold tracking-[0.08em] uppercase">
            {t}
          </span>
          <span
            className="inline-block w-1 h-1 rounded-full opacity-50"
            style={{ background: "currentColor" }}
            aria-hidden
          />
        </span>
      ))}
    </span>
  )
}
