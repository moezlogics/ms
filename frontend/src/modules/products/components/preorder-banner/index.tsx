"use client"

import { useEffect, useMemo, useState } from "react"
import { getPreorderState } from "@lib/util/preorder"

type Props = {
  /** Raw product.metadata blob; the helper extracts the pre-order keys. */
  metadata: any
}

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n)
}

function diffParts(target: number, now: number) {
  let ms = Math.max(0, target - now)
  const days = Math.floor(ms / 86_400_000)
  ms -= days * 86_400_000
  const hours = Math.floor(ms / 3_600_000)
  ms -= hours * 3_600_000
  const minutes = Math.floor(ms / 60_000)
  ms -= minutes * 60_000
  const seconds = Math.floor(ms / 1000)
  return { days, hours, minutes, seconds, expired: target - now <= 0 }
}

/**
 * Pre-order banner with live countdown.
 *
 * Renders nothing when the product is not in pre-order state (toggle
 * off OR launch date already passed). When active it shows a gradient
 * banner with:
 *
 *   ┌────────────────────────────────────────────┐
 *   │ ⚡ PRE-ORDER OPEN                            │
 *   │ Launching in  03 : 14 : 22 : 58              │
 *   │                D    H    M    S              │
 *   │ Admin-supplied message (optional)            │
 *   └────────────────────────────────────────────┘
 *
 * Designed to sit at the top of the PDP right column, above the price
 * and CTA buttons. The CTA labels themselves are swapped by
 * `ProductActions` so the entire panel reads "Pre-order Now" instead
 * of "Add to Cart" while this banner is visible.
 */
export default function PreorderBanner({ metadata }: Props) {
  // Snapshot the pre-order state on mount; only `launchDate` matters
  // for the countdown so we don't need to re-derive `isPreorder` on
  // every tick.
  const state = useMemo(() => getPreorderState(metadata), [metadata])

  // `now` ticks once per second. We initialise to the SAME value on
  // server and first client render (the target date) so React's
  // hydration check doesn't flag a mismatch — then the effect kicks
  // off the real wall-clock tick.
  const initialNow = state.launchDate ? state.launchDate.getTime() : 0
  const [now, setNow] = useState<number>(initialNow)

  useEffect(() => {
    if (!state.isPreorder) return
    setNow(Date.now())
    const id = window.setInterval(() => setNow(Date.now()), 1000)
    return () => window.clearInterval(id)
  }, [state.isPreorder])

  if (!state.isPreorder) return null

  const parts = state.launchDate
    ? diffParts(state.launchDate.getTime(), now)
    : null

  const formattedDate = state.launchDate
    ? state.launchDate.toLocaleDateString("en-US", {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : null

  const message =
    state.message ||
    "Reserve this product before launch — pre-order slots are limited. Your order will be dispatched on launch day."

  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/10 via-bg to-bg p-4 md:p-5">
      {/* Subtle decorative glow */}
      <div
        className="pointer-events-none absolute -top-12 -right-12 w-40 h-40 rounded-full bg-primary/15 blur-3xl"
        aria-hidden
      />

      {/* Header — label + launch date */}
      <div className="relative flex items-center justify-between gap-3 mb-3">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-primary">
          <i className="ph-fill ph-lightning text-[14px]" aria-hidden />
          Pre-order Open
        </span>
        {formattedDate && (
          <span className="text-[11px] text-ink/60 font-medium">
            Launching {formattedDate}
          </span>
        )}
      </div>

      {/* Countdown */}
      {parts && !parts.expired && (
        <div className="relative grid grid-cols-4 gap-2 mb-3">
          {[
            { label: "Days", value: parts.days },
            { label: "Hours", value: parts.hours },
            { label: "Mins", value: parts.minutes },
            { label: "Secs", value: parts.seconds },
          ].map((u) => (
            <div
              key={u.label}
              className="flex flex-col items-center justify-center rounded-lg bg-bg border border-line py-2"
            >
              <span className="text-lg md:text-xl font-bold text-ink leading-none tabular-nums">
                {pad(u.value)}
              </span>
              <span className="text-[10px] mt-1 text-ink/50 uppercase tracking-wide">
                {u.label}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Admin / default message */}
      <p className="relative text-[12.5px] leading-relaxed text-ink/75">
        {message}
      </p>
    </div>
  )
}
