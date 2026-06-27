"use client"

import { useState, useEffect, useMemo, useRef, useCallback } from "react"
import SpecSheet from "@modules/products/components/spec-sheet"
import { buildSpecGroups } from "@lib/util/spec-groups"
import {
  SpecTemplate,
  buildSpecGroupsFromTemplate,
} from "@lib/util/spec-template"

type Props = {
  /** Legacy single rich-description (back-compat). */
  richDescription?: string | null
  /** English rich description from `metadata.rich_description_en`. */
  richDescriptionEn?: string | null
  /** Urdu rich description from `metadata.rich_description_ur` (RTL). */
  richDescriptionUr?: string | null
  /** Plain-text fallback when no rich content is available. */
  plainDescription?: string | null
  /**
   * Raw `product.metadata.specs` JSON. When non-empty a
   * "Specifications" section appears.
   */
  specs?: any
  /**
   * Raw `product.metadata.in_the_box` (array or comma/newline separated
   * string). Rendered inside the Specifications section below the spec
   * table.
   */
  inTheBox?: any
  /** ProductReviews slot — passed as children to keep server/client clean. */
  reviewsSlot: React.ReactNode
  /** Number to render in the Reviews nav badge. */
  reviewCount?: number
  /**
   * Optional spec template resolved from the product's primary
   * category (or its ancestors).
   */
  template?: SpecTemplate | null
  similarBudgetSlot?: React.ReactNode
  similarSpecsSlot?: React.ReactNode
  sameBrandSlot?: React.ReactNode
}

type SectionKey = "specs" | "english" | "urdu" | "reviews"

/**
 * Sequential product detail sections with sticky navigation.
 *
 * All sections (Specifications, Description, اردو, Reviews) render
 * sequentially on one page. A sticky navigation bar at the top
 * highlights the current section and clicking a nav item smooth-scrolls
 * to that section.
 *
 * Uses IntersectionObserver to track which section is in view and
 * highlight the corresponding nav item.
 */
export default function ProductDescriptionTabs({
  richDescription,
  richDescriptionEn,
  richDescriptionUr,
  plainDescription,
  specs,
  inTheBox,
  reviewsSlot,
  reviewCount,
  template,
  similarBudgetSlot,
  similarSpecsSlot,
  sameBrandSlot,
}: Props) {
  const englishHtml = (richDescriptionEn ?? richDescription)?.trim() || null
  const urduHtml = richDescriptionUr?.trim() || null
  const hasEnglish = !!(englishHtml || plainDescription)
  const hasUrdu = !!urduHtml

  const specGroups = useMemo(
    () =>
      template
        ? buildSpecGroupsFromTemplate(specs, template)
        : buildSpecGroups(specs),
    [specs, template]
  )
  const hasInTheBox = useMemo(() => {
    if (!inTheBox) return false
    if (Array.isArray(inTheBox)) return inTheBox.length > 0
    if (typeof inTheBox === "string") return inTheBox.trim().length > 0
    return false
  }, [inTheBox])
  const hasSpecs = specGroups.length > 0 || hasInTheBox

  // Build list of visible sections
  const sections = useMemo(() => {
    const s: { key: SectionKey; label: string; lang?: string }[] = []
    if (hasSpecs) s.push({ key: "specs", label: "Specifications" })
    if (hasEnglish) s.push({ key: "english", label: "Description" })
    if (hasUrdu) s.push({ key: "urdu", label: "اردو", lang: "ur" })
    s.push({ key: "reviews", label: "Reviews" })
    return s
  }, [hasSpecs, hasEnglish, hasUrdu])

  const [activeSection, setActiveSection] = useState<SectionKey>(
    sections[0]?.key || "reviews"
  )
  const [isSticky, setIsSticky] = useState(false)

  const navRef = useRef<HTMLDivElement>(null)
  const sentinelRef = useRef<HTMLDivElement>(null)
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})
  const isScrollingRef = useRef(false)

  // Assign a ref to a section
  const setSectionRef = useCallback(
    (key: string) => (el: HTMLDivElement | null) => {
      sectionRefs.current[key] = el
    },
    []
  )

  // Sticky detection via sentinel IntersectionObserver
  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsSticky(!entry.isIntersecting)
      },
      { threshold: 0 }
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [])

  // Track active section via IntersectionObserver
  useEffect(() => {
    const observers: IntersectionObserver[] = []
    const visibleSections = new Map<string, number>()

    for (const section of sections) {
      const el = sectionRefs.current[section.key]
      if (!el) continue

      const observer = new IntersectionObserver(
        ([entry]) => {
          if (isScrollingRef.current) return

          if (entry.isIntersecting) {
            visibleSections.set(section.key, entry.intersectionRatio)
          } else {
            visibleSections.delete(section.key)
          }

          // Pick the section with highest intersection ratio, or fall
          // back to document order if ratios are equal
          if (visibleSections.size > 0) {
            let best: string | null = null
            let bestRatio = -1
            for (const s of sections) {
              const ratio = visibleSections.get(s.key)
              if (ratio !== undefined && ratio >= bestRatio) {
                // For equal ratios, prefer the first one in document order
                if (ratio > bestRatio || best === null) {
                  best = s.key
                  bestRatio = ratio
                }
              }
            }
            if (best) setActiveSection(best as SectionKey)
          }
        },
        {
          rootMargin: "-80px 0px -60% 0px",
          threshold: [0, 0.1, 0.25, 0.5],
        }
      )
      observer.observe(el)
      observers.push(observer)
    }

    return () => observers.forEach((o) => o.disconnect())
  }, [sections])

  // Handle hash-based navigation (#reviews, #spec-row-*)
  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#reviews") {
        scrollToSection("reviews")
      } else if (window.location.hash.startsWith("#spec-row-")) {
        const targetId = window.location.hash.substring(1)
        setTimeout(() => {
          const el = document.getElementById(targetId)
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" })
            el.classList.add("bg-primary/5")
            setTimeout(() => el.classList.remove("bg-primary/5"), 1500)
          }
        }, 120)
      }
    }

    if (
      window.location.hash === "#reviews" ||
      window.location.hash.startsWith("#spec-row-")
    ) {
      handleHashChange()
    }
    window.addEventListener("hashchange", handleHashChange)

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href="#reviews"]')
      if (link) {
        e.preventDefault()
        scrollToSection("reviews")
        return
      }

      const specLink = target.closest('a[href^="#spec-row-"]')
      if (specLink) {
        e.preventDefault()
        const href = specLink.getAttribute("href")
        const targetId = href ? href.substring(1) : ""
        setTimeout(() => {
          const el = document.getElementById(targetId)
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" })
            el.classList.add("bg-primary/5")
            setTimeout(() => el.classList.remove("bg-primary/5"), 1500)
          }
        }, 120)
      }
    }

    document.addEventListener("click", handleClick)
    return () => {
      window.removeEventListener("hashchange", handleHashChange)
      document.removeEventListener("click", handleClick)
    }
  }, [])

  const scrollToSection = (key: string) => {
    const el = sectionRefs.current[key]
    if (!el) return

    isScrollingRef.current = true
    setActiveSection(key as SectionKey)

    // Account for sticky nav height (~52px) plus some breathing room
    const navHeight = navRef.current?.offsetHeight || 52
    const y = el.getBoundingClientRect().top + window.scrollY - navHeight - 8

    window.scrollTo({ top: y, behavior: "smooth" })

    // Re-enable observer tracking after scroll settles
    setTimeout(() => {
      isScrollingRef.current = false
    }, 800)
  }

  const navBtnCls = (isActive: boolean) =>
    `relative px-4 py-2.5 text-[13.5px] whitespace-nowrap transition-colors ${
      isActive
        ? "text-black font-extrabold"
        : "text-black/70 hover:text-black font-bold"
    }`

  return (
    <div className="w-full">
      {/* Sentinel — when this scrolls out of view, the nav becomes sticky */}
      <div ref={sentinelRef} className="h-0 w-full" aria-hidden />

      {/* Sticky navigation bar */}
      <div
        ref={navRef}
        className={`bg-white/95 backdrop-blur-sm z-30 transition-shadow duration-200 ${
          isSticky
            ? "sticky top-0 shadow-[0_2px_8px_rgba(0,0,0,0.08)] border-b border-line"
            : "border-b border-line"
        }`}
        role="navigation"
        aria-label="Product sections"
      >
        <div
          className="flex items-center gap-0 overflow-x-auto"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {sections.map((s) => (
            <button
              key={s.key}
              onClick={() => scrollToSection(s.key)}
              className={navBtnCls(activeSection === s.key)}
              {...(s.lang ? { lang: s.lang } : {})}
            >
              {s.label}
              {s.key === "reviews" &&
                typeof reviewCount === "number" &&
                reviewCount > 0 && (
                  <span className="ml-1.5 inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
                    {reviewCount}
                  </span>
                )}
              {activeSection === s.key && (
                <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-full" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* All sections rendered sequentially */}
      <div className="flex flex-col">
        {/* Specifications */}
        {hasSpecs && (
          <div
            ref={setSectionRef("specs")}
            id="section-specs"
            className="pt-6 pb-8 scroll-mt-20"
          >
            <h2 className="text-[15px] md:text-base font-extrabold text-black mb-4 flex items-center gap-2">
              <i className="ph-bold ph-list-dashes text-primary text-[18px]" aria-hidden />
              Specifications
            </h2>
            <SpecSheet
              specs={specs}
              inTheBox={inTheBox}
              template={template}
              similarBudgetSlot={similarBudgetSlot}
              similarSpecsSlot={similarSpecsSlot}
              sameBrandSlot={sameBrandSlot}
            />
          </div>
        )}

        {/* Description — English */}
        {hasEnglish && (
          <div
            ref={setSectionRef("english")}
            id="section-description"
            className="pt-6 pb-8 border-t border-line/50 scroll-mt-20"
          >
            <h2 className="text-[15px] md:text-base font-extrabold text-black mb-4 flex items-center gap-2">
              <i className="ph-bold ph-article text-primary text-[18px]" aria-hidden />
              Description
            </h2>
            <div
              lang="en"
              className="prose prose-sm max-w-none text-ink/80 leading-relaxed"
            >
              {englishHtml ? (
                <div dangerouslySetInnerHTML={{ __html: englishHtml }} />
              ) : (
                <p className="whitespace-pre-line">{plainDescription}</p>
              )}
            </div>
          </div>
        )}

        {/* Description — Urdu */}
        {hasUrdu && (
          <div
            ref={setSectionRef("urdu")}
            id="section-urdu"
            className="pt-6 pb-8 border-t border-line/50 scroll-mt-20"
          >
            <h2
              className="text-[15px] md:text-base font-extrabold text-black mb-4 flex items-center gap-2"
              lang="ur"
              dir="rtl"
            >
              <i className="ph-bold ph-article text-primary text-[18px]" aria-hidden />
              اردو تفصیل
            </h2>
            <div
              lang="ur"
              dir="rtl"
              className="prose prose-sm max-w-none text-ink/80 leading-loose font-[400] text-right"
            >
              <div dangerouslySetInnerHTML={{ __html: urduHtml! }} />
            </div>
          </div>
        )}

        {/* Reviews */}
        <div
          ref={setSectionRef("reviews")}
          id="section-reviews"
          className="pt-6 pb-8 border-t border-line/50 scroll-mt-20"
        >
          <h2 className="text-[15px] md:text-base font-extrabold text-black mb-4 flex items-center gap-2">
            <i className="ph-bold ph-star text-primary text-[18px]" aria-hidden />
            Reviews
            {typeof reviewCount === "number" && reviewCount > 0 && (
              <span className="inline-flex items-center justify-center h-[22px] min-w-[22px] px-1.5 rounded-full bg-primary/10 text-primary text-[11px] font-bold">
                {reviewCount}
              </span>
            )}
          </h2>
          {reviewsSlot}
        </div>
      </div>
    </div>
  )
}
