"use client"

import { useEffect, useState } from "react"

/**
 * Celebration toast — appears once when the customer crosses 100%
 * profile completion and the backend has just credited their first
 * 10 loyalty points.
 *
 * The dashboard server component calls
 * `claimCompletionReward()` on every render. The first time the
 * server says `rewarded: true` we surface this toast; an in-memory
 * + localStorage flag prevents it from re-firing after the user
 * dismisses it (handles refreshes within the same browser).
 */
export default function PointsEarnedToast({
  show,
  points,
  message = "Profile complete!",
  storageKey = "loyalty:welcome-toast-dismissed",
}: {
  show: boolean
  points: number
  message?: string
  storageKey?: string
}) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!show || !points) return
    try {
      if (localStorage.getItem(storageKey) === "1") return
    } catch {}
    setOpen(true)
    // Auto-dismiss after a generous beat so the user has time to read
    const t = setTimeout(() => dismiss(), 6000)
    return () => clearTimeout(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, points])

  const dismiss = () => {
    setOpen(false)
    try {
      localStorage.setItem(storageKey, "1")
    } catch {}
  }

  if (!open) return null

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-x-4 bottom-4 z-[60] flex justify-center pointer-events-none small:bottom-6 small:right-6 small:left-auto small:justify-end"
    >
      <div className="pointer-events-auto w-full max-w-sm rounded-2xl bg-ink text-bg shadow-[0_30px_60px_-20px_rgba(0,0,0,0.45)] overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500 motion-reduce:animate-none motion-reduce:transition-none">
        {/* Confetti band */}
        <div
          aria-hidden
          className="h-1.5 w-full"
          style={{
            background:
              "linear-gradient(90deg, #facc15 0%, #fb923c 25%, #ec4899 50%, #8b5cf6 75%, #22d3ee 100%)",
          }}
        />
        <div className="p-4 flex items-start gap-3">
          <span className="shrink-0 inline-flex items-center justify-center w-11 h-11 rounded-full bg-bg/10">
            <i className="ph-fill ph-sparkle text-2xl text-yellow-300" aria-hidden />
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-bg/50">
              {message}
            </p>
            <p className="mt-0.5 text-base font-semibold leading-snug">
              You earned <span className="text-yellow-300">+{points} points</span>
            </p>
            <p className="mt-1 text-xs text-bg/60">
              Use them at checkout to knock down your next order.
            </p>
          </div>
          <button
            type="button"
            onClick={dismiss}
            aria-label="Dismiss"
            className="shrink-0 -mr-1 -mt-1 w-7 h-7 rounded-full inline-flex items-center justify-center text-bg/60 hover:text-bg hover:bg-bg/10 transition-colors"
          >
            <i className="ph ph-x text-sm" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
