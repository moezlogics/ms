"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

// Extended type to include our new custom banner fields
export type Banner = {
  id: string
  title?: string | null
  subtitle?: string | null
  image_url: string
  image_url_mobile?: string | null
  link_url?: string | null
  cta_label?: string | null
  text_position?: string | null
  theme?: string | null
}

type Props = {
  banners: Banner[]
  intervalMs?: number
}

/**
 * Full-bleed hero image slider.
 *
 * - Crossfade transitions (opacity) — smooth, no jank
 * - Autoplay every 5s; pauses on hover; 15s grace after user interaction
 * - Desktop: 16:6 aspect | Mobile: 4:3 aspect (or image_url_mobile)
 * - Whole slide is clickable if link_url is set
 * - Text overlay with gradient — title, subtitle, CTA button
 * - Dot + arrow navigation
 * - Respects prefers-reduced-motion
 */
export default function HeroSlider({ banners, intervalMs = 5000 }: Props) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const interactedUntil = useRef<number>(0)
  const count = banners.length

  const goto = useCallback(
    (n: number) => setIndex(((n % count) + count) % count),
    [count]
  )
  const next = useCallback(() => goto(index + 1), [goto, index])
  const prev = useCallback(() => goto(index - 1), [goto, index])

  useEffect(() => {
    if (!intervalMs || count <= 1) return
    if (typeof window !== "undefined") {
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return
    }
    const id = window.setInterval(() => {
      if (paused || Date.now() < interactedUntil.current) return
      setIndex((i) => (i + 1) % count)
    }, intervalMs)
    return () => window.clearInterval(id)
  }, [intervalMs, paused, count])

  const markInteraction = () => {
    interactedUntil.current = Date.now() + 15_000
  }

  const dragStartX = useRef<number | null>(null)

  const handlePointerDown = (e: React.PointerEvent) => {
    // Only track left clicks
    if (e.pointerType === "mouse" && e.button !== 0) return
    dragStartX.current = e.clientX
  }

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragStartX.current === null) return
    const diff = e.clientX - dragStartX.current
    const threshold = 50 // px

    if (Math.abs(diff) > threshold) {
      markInteraction()
      if (diff > 0) {
        prev()
      } else {
        next()
      }
    }
    dragStartX.current = null
  }

  if (!count) return null

  return (
    <section
      className="w-full bg-bg px-3 py-2 md:px-8 md:py-4 flex justify-center"
      aria-roledescription="carousel"
      aria-label="Featured promotions"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* Floating App-like Card Container with reduced height */}
      <div 
        className="relative w-full max-w-[1600px] aspect-[16/9] sm:aspect-[21/9] rounded-[24px] md:rounded-[32px] overflow-hidden shadow-[0_12px_40px_-12px_rgba(0,0,0,0.15)] group touch-pan-y select-none cursor-grab active:cursor-grabbing"
        onPointerDown={handlePointerDown}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      >
        {banners.map((b, i) => {
          const active = i === index

          const imageBlock = (
            <>
              {/* Desktop image */}
              <Image
                src={b.image_url}
                alt={b.title || "Promotional banner"}
                fill
                priority={i === 0}
                quality={85}
                sizes="100vw"
                className={`object-cover transition-transform duration-[8000ms] ease-linear pointer-events-none select-none ${
                  active ? "scale-105" : "scale-100"
                } ${b.image_url_mobile ? "hidden sm:block" : ""}`}
                draggable={false}
              />
              {/* Mobile image */}
              {b.image_url_mobile && (
                <Image
                  src={b.image_url_mobile}
                  alt={b.title || "Promotional banner"}
                  fill
                  priority={i === 0}
                  quality={85}
                  sizes="100vw"
                  className="object-cover sm:hidden pointer-events-none select-none"
                  draggable={false}
                />
              )}

              {/* Premium Glassmorphism Text Card overlay */}
              {(b.title || b.subtitle || b.cta_label) && (
                <div
                  className={`absolute z-10 sm:max-w-md ${
                    b.text_position === "top-left"
                      ? "inset-x-4 top-4 sm:inset-auto sm:left-10 sm:top-10"
                      : b.text_position === "bottom-right"
                      ? "inset-x-4 bottom-4 sm:inset-auto sm:right-10 sm:bottom-10"
                      : b.text_position === "center"
                      ? "inset-x-4 top-1/2 -translate-y-1/2 sm:inset-auto sm:left-1/2 sm:-translate-x-1/2"
                      : "inset-x-4 bottom-4 sm:inset-auto sm:left-10 sm:bottom-10" // bottom-left default
                  }`}
                >
                  <div
                    className={`backdrop-blur-xl border p-5 md:p-8 rounded-[20px] shadow-2xl transform translate-y-4 group-hover:translate-y-0 transition-all duration-500 ease-out ${
                      b.theme === "light"
                        ? "bg-white/30 border-black/10"
                        : "bg-black/30 border-white/20"
                    }`}
                  >
                    {b.title && (
                      <h2
                        className={`text-2xl md:text-4xl font-bold tracking-tight mb-2 md:mb-3 leading-tight drop-shadow-md ${
                          b.theme === "light" ? "text-brand-black" : "text-white"
                        }`}
                      >
                        {b.title}
                      </h2>
                    )}
                    {b.subtitle && (
                      <p
                        className={`text-sm md:text-base drop-shadow-sm mb-5 md:mb-6 leading-relaxed line-clamp-2 ${
                          b.theme === "light" ? "text-brand-black/90" : "text-white/90"
                        }`}
                      >
                        {b.subtitle}
                      </p>
                    )}
                    {b.cta_label && b.link_url && (
                      <span
                        className={`inline-flex items-center gap-2 font-semibold text-xs md:text-sm px-5 py-2.5 md:px-6 md:py-3 rounded-full hover:bg-[rgb(var(--color-primary))] hover:text-white transition-colors duration-300 pointer-events-none w-max ${
                          b.theme === "light"
                            ? "bg-brand-black text-white hover:bg-[rgb(var(--color-primary))]"
                            : "bg-white text-brand-black hover:bg-[rgb(var(--color-primary))]"
                        }`}
                      >
                        {b.cta_label}
                        <i className="ph-bold ph-arrow-right text-sm" aria-hidden />
                      </span>
                    )}
                  </div>
                </div>
              )}
            </>
          )

          return (
            <div
              key={b.id}
              className={`absolute inset-0 transition-opacity duration-700 ease-out ${
                active ? "opacity-100 z-10" : "opacity-0 pointer-events-none z-0"
              }`}
              aria-hidden={!active}
              role="group"
              aria-roledescription="slide"
              aria-label={`${i + 1} of ${count}`}
            >
              {b.link_url ? (
                <LocalizedClientLink
                  href={b.link_url}
                  className="absolute inset-0 block"
                  aria-label={b.title || `Banner ${i + 1}`}
                  tabIndex={active ? 0 : -1}
                >
                  {imageBlock}
                </LocalizedClientLink>
              ) : (
                imageBlock
              )}
            </div>
          )
        })}

        {/* Arrows - hidden on mobile for app-like swipe feel, sleek on desktop */}
        {count > 1 && (
          <>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); markInteraction(); prev() }}
              aria-label="Previous slide"
              className="absolute left-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-brand-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform -translate-x-4 group-hover:translate-x-0 hidden md:flex shadow-lg border border-white/10"
            >
              <i className="ph-bold ph-arrow-left text-lg" aria-hidden />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); markInteraction(); next() }}
              aria-label="Next slide"
              className="absolute right-4 top-1/2 -translate-y-1/2 z-20 w-11 h-11 rounded-full bg-white/20 backdrop-blur-md hover:bg-white text-white hover:text-brand-black flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300 transform translate-x-4 group-hover:translate-x-0 hidden md:flex shadow-lg border border-white/10"
            >
              <i className="ph-bold ph-arrow-right text-lg" aria-hidden />
            </button>
          </>
        )}

        {/* Dots - premium pill shaped */}
        {count > 1 && (
          <div className="absolute bottom-4 md:bottom-6 left-1/2 -translate-x-1/2 z-20 flex gap-2 bg-black/20 backdrop-blur-sm px-3 py-2 rounded-full border border-white/10">
            {banners.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => { e.preventDefault(); markInteraction(); goto(i) }}
                aria-label={`Go to slide ${i + 1}`}
                aria-current={i === index ? "true" : undefined}
                className={`h-2 rounded-full transition-all duration-500 ease-out ${
                  i === index ? "w-8 bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]" : "w-2 bg-white/50 hover:bg-white/90"
                }`}
              />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
