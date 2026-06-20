"use client"

import { useEffect, useRef, useState } from "react"
import { useParams, usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { useCompare, COMPARE_MAX } from "./context"
import CompareSearchPopover from "./compare-search-popover"
import { useSiteSettings } from "@lib/context/site-settings-context"

/**
 * Floating compare bar.
 *
 * A slim, single-row dock anchored to the bottom of the screen. It
 * shows the staged product thumbnails (scrollable), an inline "+"
 * picker, and a primary "Compare" CTA. Deliberately compact — no
 * per-item captions — so it reads like an app dock rather than a
 * cluttered card.
 *
 * On mobile it sits just above the bottom tab bar (and respects the
 * iOS home-indicator safe area). On ≥ md it centres as a pill.
 */
export default function CompareTray() {
  const { aspectClass: globalAspectClass } = useSiteSettings()
  const { items, remove, clear, add, isFull, categoryId, categoryName } =
    useCompare()
  const params = useParams() as { countryCode?: string }
  const pathname = usePathname() || ""
  const router = useRouter()
  const countryCode = params?.countryCode || "us"

  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!pickerOpen) return
    function onDown(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
      }
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setPickerOpen(false)
    }
    document.addEventListener("mousedown", onDown)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDown)
      document.removeEventListener("keydown", onKey)
    }
  }, [pickerOpen])

  useEffect(() => {
    if (isFull) setPickerOpen(false)
  }, [isFull])

  if (!items.length) return null

  // Hide on the compare page itself (the page has its own slot UI) and
  // during checkout (single-purpose flow).
  const stripped = "/" + pathname.split("/").filter(Boolean).slice(1).join("/")
  if (stripped.startsWith("/compare") || stripped.startsWith("/checkout")) {
    return null
  }

  const compareHref = `/${countryCode}/compare?${items
    .map((i) => `h=${encodeURIComponent(i.handle)}`)
    .join("&")}`

  const canCompare = items.length >= 2

  return (
    <div
      role="region"
      aria-label="Product comparison"
      className="fixed z-40 inset-x-2 md:inset-x-0 md:flex md:justify-center pointer-events-none bottom-[calc(64px+env(safe-area-inset-bottom))] md:bottom-5"
    >
      <div className="pointer-events-auto relative w-full md:w-[min(620px,calc(100vw-2rem))]">
        {/* Picker — anchored above the bar */}
        {pickerOpen && (
          <div
            ref={pickerRef}
            className="absolute left-0 right-0 md:left-auto md:right-0 bottom-full mb-2 md:w-[360px]"
          >
            <CompareSearchPopover
              categoryId={categoryId}
              categoryName={categoryName}
              excludeHandles={items.map((i) => i.handle)}
              onPick={(item) => {
                if (add(item)) setPickerOpen(false)
              }}
              onClose={() => setPickerOpen(false)}
            />
          </div>
        )}

        <div className="flex items-center gap-2 rounded-2xl border border-line bg-bg/95 supports-[backdrop-filter]:bg-bg/85 backdrop-blur-md shadow-[0_10px_30px_-12px_rgba(0,0,0,0.30)] px-2 py-2 md:px-3">
          {/* Label badge */}
          <div className="hidden sm:flex items-center gap-2 shrink-0 pr-2.5 mr-0.5 border-r border-line">
            <span className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center">
              <i className="ph-bold ph-scales text-[16px]" aria-hidden />
            </span>
            <div className="leading-tight">
              <p className="text-[12px] font-bold text-ink">Compare</p>
              <p className="text-[10px] text-ink/50 tabular-nums">
                {items.length} of {COMPARE_MAX}
              </p>
            </div>
          </div>

          {/* Thumbnails — horizontal scroll, no captions */}
          <div className="flex-1 min-w-0 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {items.map((it) => (
              <div
                key={it.handle}
                className={`relative shrink-0 w-11 rounded-xl overflow-hidden bg-surface border border-line group ${globalAspectClass || "aspect-[3/4]"} h-auto`}
                title={it.title}
              >
                {it.thumbnail ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={it.thumbnail}
                    alt={it.title}
                    className="w-full h-full object-contain p-0.5 bg-white"
                  />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-ink/30">
                    <i className="ph ph-image text-base" aria-hidden />
                  </div>
                )}
                {/* Desktop: hover overlay to remove (hidden on touch so a
                    tap on the thumb never removes it by accident). */}
                <button
                  type="button"
                  onClick={() => remove(it.handle)}
                  aria-label={`Remove ${it.title}`}
                  className="hidden md:flex absolute inset-0 items-center justify-center bg-ink/55 text-white opacity-0 hover:opacity-100 focus:opacity-100 transition-opacity"
                >
                  <i className="ph-bold ph-x text-sm" aria-hidden />
                </button>
                {/* Mobile: always-visible tiny remove dot. */}
                <button
                  type="button"
                  onClick={() => remove(it.handle)}
                  aria-label={`Remove ${it.title}`}
                  className="md:hidden absolute -top-1 -right-1 w-4 h-4 rounded-full bg-ink text-bg flex items-center justify-center shadow ring-2 ring-bg"
                >
                  <i className="ph-bold ph-x text-[8px]" aria-hidden />
                </button>
              </div>
            ))}

            {/* Add slot */}
            {!isFull && (
              <button
                type="button"
                onClick={() => {
                  if (items.length >= 1) {
                    router.push(`/${countryCode}/compare?h=${items.map(i => encodeURIComponent(i.handle)).join(",")}&search=open`)
                  } else {
                    setPickerOpen((v) => !v)
                  }
                }}
                aria-expanded={pickerOpen}
                aria-label="Add a product to compare"
                className={`shrink-0 w-11 rounded-xl border-2 border-dashed flex items-center justify-center transition-colors ${globalAspectClass || "aspect-[3/4]"} ${
                  pickerOpen
                    ? "border-primary text-primary bg-primary/5"
                    : "border-line text-ink/40 hover:border-primary/50 hover:text-primary"
                }`}
              >
                <i className="ph-bold ph-plus text-base" aria-hidden />
              </button>
            )}
          </div>

          {/* Compare CTA */}
          <Link
            href={compareHref}
            aria-disabled={!canCompare}
            tabIndex={canCompare ? undefined : -1}
            className={`shrink-0 inline-flex items-center justify-center gap-1.5 h-10 px-3.5 md:px-5 rounded-xl bg-primary text-primary-fg text-sm font-semibold shadow-sm transition-all hover:brightness-110 active:scale-[0.98] ${
              canCompare ? "" : "pointer-events-none opacity-40"
            }`}
          >
            <i className="ph-bold ph-scales text-[15px] md:hidden" aria-hidden />
            <span className="hidden md:inline">Compare</span>
            <span className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-primary-fg/20 text-[11px] font-bold tabular-nums">
              {items.length}
            </span>
          </Link>

          {/* Clear */}
          <button
            type="button"
            onClick={clear}
            aria-label="Clear comparison"
            className="shrink-0 w-9 h-10 inline-flex items-center justify-center rounded-xl text-ink/45 hover:text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <i className="ph ph-trash text-base" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
