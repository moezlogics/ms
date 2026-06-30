"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useEffect, useMemo, useRef, useState } from "react"
import { getCartSummary } from "@lib/data/cart-summary"

/**
 * App-style bottom tab bar — visible only on `< small` viewports.
 *
 * Design — "Center Notch" (May 2026 redesign)
 * --------------------------------------------
 * Inspired by Concept 2 of the mobile-bar showcase: four flat side
 * tabs and one ELEVATED, NOTCHED, primary-coloured circle in the
 * middle that hosts our most-promoted action — the AI Shopping Assistant.
 *
 *   [Home]  [Search]   ⬤ AI   [Cart]  [Account]
 *
 *  • Bar height: 56 px content + iOS safe-area inset. Concept 2's
 *    feel without the extra padding the previous bar had.
 *  • Center button: 56 px primary-fg circle that floats 24 px above
 *    the bar inside a bg-coloured ring (the "notch"). Tapping it
 *    fires `open-ai-chat` so the existing `<ChatWidget>` slides up.
 *  • Active side-tab gets a Flutter-style "spring" pop:
 *      - filled Phosphor icon variant (`ph-fill`)
 *      - top 3 px accent strip eases in (`scale-x` + `opacity`)
 *      - icon scales 1.0 → 1.12 with a `cubic-bezier(0.34,1.56,0.64,1)`
 *        overshoot so the change feels physical, not linear.
 *  • Floating dock pad behind the active label morphs left/right
 *    via an absolutely-positioned indicator that animates with
 *    `translate3d` — buttery 60 fps, no layout thrash.
 *  • Cart badge sits on the cart icon (max `9+`).
 *  • Hidden on `small:` and up — desktop top nav takes over.
 */

type Slot = {
  /** Either an internal route (link) OR a no-route action like `ai`. */
  href: string | null
  label: string
  /** Phosphor icon name without the weight prefix. */
  icon: string
  /** Match function so route → active state is robust across locales. */
  matches: (pathname: string) => boolean
  /** Optional numeric corner badge (cart count). */
  badge?: number
  /** When set, the slot is rendered as the central elevated FAB. */
  fab?: boolean
  /** Custom-event name dispatched on click instead of navigation. */
  emit?: string
}

type Props = {
  cartCount: number
  isSignedIn: boolean
}

// Strip the `[countryCode]` segment so route matching works in
// every locale: `/pk/cart` → `/cart`.
const stripLocale = (p: string): string => {
  if (!p) return "/"
  const parts = p.split("/").filter(Boolean)
  // Locale codes are exactly 2 characters in our catalogue.
  if (parts.length && parts[0].length === 2) parts.shift()
  return "/" + parts.join("/")
}

export default function MobileBottomNavClient({
  cartCount,
  isSignedIn,
}: Props) {
  const rawPath = usePathname() || "/"
  const path = stripLocale(rawPath)

  // Live cart count — catalog pages are ISR-cached, so their server HTML
  // (and this prop) is the ANONYMOUS version (badge 0) for everyone.
  // Re-sync the real count after mount, on tab focus, and whenever the
  // app announces a cart change via the "cart-updated" window event.
  const [liveCount, setLiveCount] = useState(cartCount)
  useEffect(() => {
    let alive = true
    const sync = () => {
      getCartSummary()
        .then((s) => {
          if (alive) setLiveCount(s.count)
        })
        .catch(() => {})
    }
    sync()
    window.addEventListener("cart-updated", sync)
    window.addEventListener("focus", sync)
    return () => {
      alive = false
      window.removeEventListener("cart-updated", sync)
      window.removeEventListener("focus", sync)
    }
  }, [])

  /**
   * Slot order matters: index 2 is rendered as the elevated center
   * FAB. Home now occupies the notch — it's the highest-traffic
   * destination, so promoting it to the always-thumb-reachable centre
   * matches Instagram / Reddit / Threads conventions. The AI launcher
   * keeps its prominence as a regular side tab with the same robot
   * glyph; tapping it still dispatches `open-ai-chat`.
   */
  const slots: Slot[] = useMemo(
    () => [
      {
        // Search — /search is just a redirect-to-home page; the
        // real search UI is the SmartSearchBar overlay listening for
        // the `open-mobile-search` event. Emit instead of navigating.
        href: null,
        label: "Search",
        icon: "magnifying-glass",
        matches: (p) => p.startsWith("/search"),
        emit: "open-mobile-search",
      },
      {
        // Support assistant — opens the chat sheet without route change.
        href: null,
        label: "Support",
        icon: "headset",
        matches: () => false,
        emit: "open-ai-chat",
      },
      {
        // Center-notch FAB — Home.
        href: "/",
        label: "Home",
        icon: "house",
        matches: (p) => p === "/" || p === "",
        fab: true,
      },
      {
        href: "/cart",
        label: "Cart",
        icon: "shopping-bag",
        matches: (p) => p.startsWith("/cart"),
        badge: liveCount,
      },
      {
        href: "/account",
        label: "Account",
        icon: "user-circle",
        matches: (p) => p.startsWith("/account"),
      },
    ],
    [liveCount]
  )

  // Hide the bar entirely on the checkout page — the user is in a
  // single-purpose flow and any chrome competes for attention.
  if (path.startsWith("/checkout")) return null

  // Track the haptic press for the FAB so we can stage the launch
  // animation: a 120 ms scale-down on tap, then the chat opens.
  const [fabPressed, setFabPressed] = useState(false)

  // Ripple ping on tab change — gives the active icon a one-shot
  // "wave" that re-emits whenever the matched slot index changes,
  // mimicking Flutter's `InkWell` ripple. Pure CSS via `key` reset.
  const activeIdx = slots.findIndex((s) => s.matches(path))
  const [rippleKey, setRippleKey] = useState(0)
  const lastIdxRef = useRef(activeIdx)
  useEffect(() => {
    if (lastIdxRef.current !== activeIdx) {
      setRippleKey((k) => k + 1)
      lastIdxRef.current = activeIdx
    }
  }, [activeIdx])

  return (
    <>
      {/* Spacer so the fixed bar never covers page content. The
          notched FAB lives ABOVE the bar so the spacer only needs to
          match the bar's own height. Compact 46px bar — tighter than
          UIKit's 49pt and Material's 56dp for a more app-like feel. */}
      <div
        aria-hidden
        className="block small:hidden h-[var(--mobile-tabbar-h,44px)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      />

      <nav
        role="navigation"
        aria-label="Primary"
        className="small:hidden fixed bottom-0 inset-x-0 z-40"
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
          ["--mobile-tabbar-h" as any]: "44px",
        }}
      >
        {/* Curved Background Wrapper */}
        <div 
          className="absolute inset-0 -z-10 flex flex-col pointer-events-none"
          style={{
            filter: "drop-shadow(0 -8px 20px rgba(0,0,0,0.08))",
          }}
        >
          {/* Top portion (44px) with the curve in the middle */}
          <div className="flex h-[44px] w-full items-stretch">
            <div 
              className="flex-1 bg-bg/95 supports-[backdrop-filter]:bg-bg/80 backdrop-blur-xl border-t" 
              style={{ 
                borderTopColor: "var(--hex-mobile-footer-border, rgb(var(--color-mobile-footer-border, var(--color-border, 233 233 233))))",
                borderTopLeftRadius: "var(--radius-mobile-footer)",
              }} 
            />
            <div className="w-[100px] h-[44px] shrink-0 relative bg-transparent">
              <svg
                width="100"
                height="44"
                viewBox="0 0 100 44"
                className="absolute inset-0 w-full h-full"
                fill="none"
              >
                {/* Backdrop background cutout shape */}
                <path
                  d="M 0 0 L 15 0 C 30 0, 32 24, 50 24 C 68 24, 70 0, 85 0 L 100 0 L 100 44 L 0 44 Z"
                  fill="var(--hex-bg, #FFFFFF)"
                  className="opacity-95"
                />
                {/* Smooth continuous border stroke */}
                <path
                  d="M 0 0.5 L 15 0.5 C 30 0.5, 32 24.5, 50 24.5 C 68 24.5, 70 0.5, 85 0.5 L 100 0.5"
                  stroke="var(--hex-mobile-footer-border, rgb(var(--color-mobile-footer-border, var(--color-border, 233 233 233))))"
                  strokeWidth="1"
                  fill="none"
                />
              </svg>
            </div>
            <div 
              className="flex-1 bg-bg/95 supports-[backdrop-filter]:bg-bg/80 backdrop-blur-xl border-t" 
              style={{ 
                borderTopColor: "var(--hex-mobile-footer-border, rgb(var(--color-mobile-footer-border, var(--color-border, 233 233 233))))",
                borderTopRightRadius: "var(--radius-mobile-footer)",
              }} 
            />
          </div>
          {/* Bottom portion (safe area) */}
          <div className="flex-1 bg-bg/95 supports-[backdrop-filter]:bg-bg/80 backdrop-blur-xl" />
        </div>

        {/* Active-tab top accent dot — sits above the icon, animates
            from one slot to the next via translate3d for 60 fps. */}
        {activeIdx >= 0 && !slots[activeIdx]?.fab && (
          <span
            aria-hidden
            className="pointer-events-none absolute top-0 left-0 h-[3px] w-1/5 rounded-b-full bg-primary motion-safe:transition-transform motion-safe:duration-[450ms]"
            style={{
              transform: `translate3d(${activeIdx * 100}%, 0, 0) scaleX(0.45)`,
              transformOrigin: "center",
              transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
            }}
          />
        )}

        <ul className="grid grid-cols-5 h-[44px] items-stretch">
          {slots.map((s, idx) => {
            const active = s.matches(path)

            // ── Center elevated FAB ─────────────────────────────────
            if (s.fab) {
              // Visual FAB shell. Re-used whether the slot is a route
              // (renders inside <Link>) or an event emitter (inside
              // <button>) so animation & notch stay in lock-step.
              const fabClass = [
                "absolute left-1/2 -translate-x-1/2 -top-4",
                "w-11 h-11 rounded-full",
                "bg-primary text-primary-fg",
                "flex items-center justify-center",
                "shadow-[0_6px_14px_-6px_rgba(0,0,0,0.30)]",
                "ring-[3px] ring-bg",
                "motion-safe:transition-transform motion-safe:duration-200",
                "active:scale-95 hover:scale-[1.04]",
                fabPressed ? "scale-90" : "scale-100",
                "focus-visible:outline-none focus-visible:ring-primary/40",
              ].join(" ")
              const fabStyle = {
                transitionTimingFunction: "cubic-bezier(0.34,1.56,0.64,1)",
              } as const
              const fabBody = (
                <i
                  className={`ph-fill ph-${s.icon} text-[22px]`}
                  aria-hidden
                />
              )

              return (
                <li key={s.label} className="flex relative">
                  {/* Notch removed in favor of curved SVG background */}
                  {s.href ? (
                    <Link
                      href={s.href}
                      prefetch={false}
                      aria-label={s.label}
                      aria-current={active ? "page" : undefined}
                      onClick={() => {
                        setFabPressed(true)
                        setTimeout(() => setFabPressed(false), 200)
                      }}
                      className={fabClass}
                      style={fabStyle}
                    >
                      {fabBody}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      aria-label={s.label}
                      onClick={(e) => {
                        e.preventDefault()
                        setFabPressed(true)
                        setTimeout(() => setFabPressed(false), 200)
                        try {
                          window.dispatchEvent(
                            new CustomEvent(s.emit || "open-ai-chat")
                          )
                        } catch {}
                      }}
                      className={fabClass}
                      style={fabStyle}
                    >
                      {fabBody}
                    </button>
                  )}
                  {/* Empty label slot to preserve grid spacing — the
                      FAB itself floats so it has no in-flow content. */}
                  <span className="sr-only">{s.label}</span>
                </li>
              )
            }

            // ── Side tabs ───────────────────────────────────────────
            const inner = (
              <span
                className={[
                  "relative flex flex-col items-center justify-center gap-0.5 w-full h-full",
                  "text-[11px] font-bold tracking-wide",
                  "motion-safe:transition-colors motion-safe:duration-200",
                  active ? "text-primary" : "text-black",
                ].join(" ")}
              >
                {/* Icon container — pops on active state with a
                    Flutter-style overshoot, plus a ripple key reset
                    so each activation triggers a one-shot wave. */}
                <span
                  className={[
                    "relative inline-flex items-center justify-center",
                    "w-9 h-9 rounded-xl",
                    "motion-safe:transition-all motion-safe:duration-300",
                    active
                      ? "bg-primary/10 scale-105"
                      : "bg-transparent scale-100",
                  ].join(" ")}
                  style={{
                    transitionTimingFunction:
                      "cubic-bezier(0.34,1.56,0.64,1)",
                  }}
                >
                  {/* One-shot ripple */}
                  {active && (
                    <span
                      key={`${rippleKey}-${idx}`}
                      aria-hidden
                      className="absolute inset-0 rounded-2xl bg-primary/20 motion-safe:animate-[ping_700ms_ease-out_1]"
                    />
                  )}

                  <i
                    className={[
                      active ? "ph-fill" : "ph-bold",
                      `ph-${s.icon}`,
                      "text-[22px] leading-none relative z-10",
                      "motion-safe:transition-transform motion-safe:duration-300",
                      active ? "scale-110" : "scale-100",
                    ].join(" ")}
                    style={{
                      transitionTimingFunction:
                        "cubic-bezier(0.34,1.56,0.64,1)",
                    }}
                    aria-hidden
                  />

                  {/* Numeric badge (cart) */}
                  {typeof s.badge === "number" && s.badge > 0 && (
                    <span
                      className={[
                        "absolute -top-0.5 -right-0.5 z-20",
                        "min-w-[16px] h-[16px] px-1",
                        "rounded-full bg-rose-500 text-white",
                        "text-[9px] font-bold leading-[16px] text-center",
                        "ring-2 ring-bg tabular-nums",
                      ].join(" ")}
                      aria-label={`${s.badge} item${
                        s.badge === 1 ? "" : "s"
                      } in cart`}
                    >
                      {s.badge > 9 ? "9+" : s.badge}
                    </span>
                  )}
                </span>

                <span className="leading-none">{s.label}</span>
              </span>
            )

            return (
              <li key={s.href || s.label} className="flex">
                {s.href ? (
                  <Link
                    href={s.href}
                    prefetch={false}
                    aria-current={active ? "page" : undefined}
                    className={[
                      "group relative flex-1",
                      "active:scale-95 motion-safe:transition-transform motion-safe:duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-inset",
                    ].join(" ")}
                  >
                    {inner}
                  </Link>
                ) : (
                  <button
                    type="button"
                    aria-label={s.label}
                    onClick={() => {
                      // Side-tab buttons (no href) trigger a custom
                      // event that another component listens to —
                      // currently used by the AI chat sheet.
                      if (!s.emit) return
                      try {
                        window.dispatchEvent(new CustomEvent(s.emit))
                      } catch {}
                    }}
                    className="group relative flex-1 active:scale-95 motion-safe:transition-transform motion-safe:duration-150"
                  >
                    {inner}
                  </button>
                )}
              </li>
            )
          })}
        </ul>
      </nav>
    </>
  )
}
