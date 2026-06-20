"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type CategoryCarouselItem = {
  id: string
  name: string
  handle: string
  image?: string | null
}

type Props = {
  items: CategoryCarouselItem[]
  /** URL prefix for each item link. Defaults to `/` (flat category URLs). */
  linkPrefix?: string
  /** Optional section label for aria. */
  ariaLabel?: string
}

/**
 * Horizontal icon rail — reusable for categories AND brands.
 *
 * Each item shows its `image` as a clean transparent PNG (no borders,
 * no circles, no backgrounds). If no image is set, a simple initial
 * letter is shown.
 *
 * Scroll: native horizontal on mobile; arrow buttons on desktop.
 *
 * Category URLs are flat (`/kurta`) instead of `/categories/kurta` —
 * the root-level catch-all route resolves handles directly. Brands
 * keep their `/brands/` prefix via an explicit override.
 */
export default function CategoryCarousel({
  items,
  linkPrefix = "/",
  ariaLabel = "Shop by category",
}: Props) {
  const trackRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const update = useCallback(() => {
    const el = trackRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    update()
    const el = trackRef.current
    if (!el) return
    el.addEventListener("scroll", update, { passive: true })
    window.addEventListener("resize", update)
    return () => {
      el.removeEventListener("scroll", update)
      window.removeEventListener("resize", update)
    }
  }, [update])

  const scrollBy = (delta: number) => {
    trackRef.current?.scrollBy({ left: delta, behavior: "smooth" })
  }

  if (!items.length) return null

  return (
    <section
      aria-label={ariaLabel}
      className="container-anvogue pt-0 pb-1 relative"
    >
      {/* Arrows (desktop only) */}
      {canScrollLeft && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scrollBy(-320)}
          className="hidden md:flex absolute left-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white text-brand-black items-center justify-center box-shadow-sm hover:bg-brand-green transition"
        >
          <i className="ph-bold ph-arrow-left" aria-hidden />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scrollBy(320)}
          className="hidden md:flex absolute right-2 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-white text-brand-black items-center justify-center box-shadow-sm hover:bg-brand-green transition"
        >
          <i className="ph-bold ph-arrow-right" aria-hidden />
        </button>
      )}

      <div
        ref={trackRef}
        className="flex gap-4 md:gap-8 overflow-x-auto no-scrollbar scroll-smooth snap-x snap-mandatory px-2 py-2 -mx-2"
      >
        {items.map((c) => (
          <LocalizedClientLink
            key={c.id}
            href={`${linkPrefix}${c.handle}`}
            className="group snap-start flex flex-col items-center flex-shrink-0 w-[64px] md:w-[88px]"
          >
            {/* Image — clean PNG, no borders, no backgrounds */}
            <div className="relative w-[60px] h-[60px] md:w-[84px] md:h-[84px] flex items-center justify-center">
              {c.image ? (
                <div className="relative w-full h-full transition-transform duration-500 ease-out group-hover:scale-110">
                  <Image
                    src={c.image}
                    alt={c.name}
                    fill
                    sizes="(max-width: 768px) 60px, 84px"
                    className="object-contain"
                  />
                </div>
              ) : (
                <div className="w-[52px] h-[52px] md:w-[76px] md:h-[76px] rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-green/40 to-brand-green/80 text-[rgb(var(--color-primary))] font-medium text-lg md:text-xl shadow-sm">
                  {c.name.trim().charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <span className="mt-2.5 text-[10px] md:text-xs text-center text-brand-black/80 font-medium group-hover:text-[rgb(var(--color-primary))] transition-colors line-clamp-2 leading-tight">
              {c.name}
            </span>
          </LocalizedClientLink>
        ))}
      </div>
    </section>
  )
}
