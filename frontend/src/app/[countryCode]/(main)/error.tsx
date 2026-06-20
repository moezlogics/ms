"use client"

import { useEffect, useRef } from "react"

/**
 * Route-level error boundary for all main storefront pages.
 *
 * Before this existed, ANY uncaught client/render error showed Next's
 * blank white "Application error: a client-side exception has occurred"
 * screen — a dead end for shoppers (often after a slow network request
 * finally failed). This boundary:
 *   1. Auto-retries ONCE after 1.5s (most of these errors are transient
 *      network hiccups on mobile data — a retry usually just works).
 *   2. Otherwise shows a friendly retry UI instead of the white screen.
 */
export default function MainError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const retriedRef = useRef(false)

  useEffect(() => {
    console.error("[storefront] route error:", error)
    // One silent auto-retry for transient network failures.
    if (!retriedRef.current) {
      retriedRef.current = true
      const t = setTimeout(() => reset(), 1500)
      return () => clearTimeout(t)
    }
  }, [error, reset])

  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="w-14 h-14 rounded-full bg-surface flex items-center justify-center">
        <i className="ph ph-wifi-slash text-2xl text-ink/50" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-ink">
        Something went wrong loading this page
      </h2>
      <p className="text-sm text-ink/60 max-w-sm">
        It&apos;s usually a temporary network issue. Please try again.
      </p>
      <div className="flex items-center gap-3 mt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="px-5 py-2.5 rounded-xl bg-ink text-bg text-sm font-semibold"
        >
          Try again
        </button>
        <button
          type="button"
          onClick={() => (window.location.href = "/")}
          className="px-5 py-2.5 rounded-xl border border-line text-sm font-semibold text-ink"
        >
          Go home
        </button>
      </div>
    </div>
  )
}
