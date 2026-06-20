"use client"

import { useEffect, useRef, useState } from "react"
import { usePathname, useSearchParams } from "next/navigation"

/**
 * Modern nprogress-style top loading bar — the React/Flutter-app feel.
 *
 * App Router has no public router-events API, so we detect a navigation
 * START by capturing same-origin <a> clicks + back/forward (popstate),
 * and detect the FINISH when usePathname / useSearchParams change (the new
 * route has committed). CSS in globals.css does the smooth easing:
 *   .is-loading → eases to ~90% over 8s ("still working")
 *   .is-done    → snaps to 100% then fades out.
 *
 * Only shows when a navigation actually takes a beat — instant
 * (prefetched / staleTimes-cached) navigations finish before the 90ms
 * opacity ramp, so the bar stays invisible. Pure presentation; never
 * blocks interaction (pointer-events:none).
 */
export default function TopProgressBar() {
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [state, setState] = useState<"idle" | "loading" | "done">("idle")
  const doneTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const firstRender = useRef(true)

  // START — capture clicks on internal links + browser back/forward.
  useEffect(() => {
    const start = () => {
      if (doneTimer.current) clearTimeout(doneTimer.current)
      setState("loading")
    }

    const onClick = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return
      }
      const anchor = (e.target as HTMLElement)?.closest?.("a")
      if (!anchor) return
      const href = anchor.getAttribute("href")
      if (
        !href ||
        anchor.target === "_blank" ||
        anchor.hasAttribute("download") ||
        anchor.origin !== window.location.origin
      ) {
        return
      }
      // Only for an actual destination change.
      if (anchor.pathname !== window.location.pathname || anchor.search !== window.location.search) {
        start()
      }
    }

    document.addEventListener("click", onClick, true)
    window.addEventListener("popstate", start)
    return () => {
      document.removeEventListener("click", onClick, true)
      window.removeEventListener("popstate", start)
    }
  }, [])

  // FINISH — the route committed (pathname/search changed). Skip the very
  // first mount so the bar doesn't flash on initial page load.
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false
      return
    }
    setState("done")
    if (doneTimer.current) clearTimeout(doneTimer.current)
    doneTimer.current = setTimeout(() => setState("idle"), 550)
    return () => {
      if (doneTimer.current) clearTimeout(doneTimer.current)
    }
  }, [pathname, searchParams])

  if (state === "idle") return null

  return (
    <div
      aria-hidden="true"
      className={`top-progress ${state === "loading" ? "is-loading" : "is-done"}`}
    />
  )
}
