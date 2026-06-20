"use client"

import { useState, useEffect, useMemo } from "react"
import SpecSheet from "@modules/products/components/spec-sheet"
import { buildSpecGroups } from "@lib/util/spec-groups"
import {
  SpecTemplate,
  buildSpecGroupsFromTemplate,
} from "@lib/util/spec-template"

type TabKey = "english" | "urdu" | "specs" | "reviews"

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
   * "Specifications" tab appears between description and Reviews.
   */
  specs?: any
  /**
   * Raw `product.metadata.in_the_box` (array or comma/newline separated
   * string). Rendered inside the Specifications tab below the spec
   * table; the tab still surfaces even if specs are empty but the
   * in-the-box list is populated.
   */
  inTheBox?: any
  /** ProductReviews slot — passed as children to keep server/client clean. */
  reviewsSlot: React.ReactNode
  /** Number to render in the Reviews tab badge. */
  reviewCount?: number
  /**
   * Optional spec template resolved from the product's primary
   * category (or its ancestors). When provided, the Specifications
   * tab renders sections in the admin-defined order with
   * admin-defined labels and units. Falls back to the heuristic
   * grouping for legacy products.
   */
  template?: SpecTemplate | null
  similarBudgetSlot?: React.ReactNode
  similarSpecsSlot?: React.ReactNode
  sameBrandSlot?: React.ReactNode
}

/**
 * Tabbed panel below the product hero. When the admin has supplied an
 * Urdu translation alongside the English copy, both tabs render so
 * customers can read either:
 *
 *   [English]  [اردو]  [Reviews (12)]
 *    ─────────────────────────────
 *    Tab content...
 *
 * Tabs auto-hide when their data isn't present — e.g. a product
 * with only English copy shows just [English] and [Reviews].
 *
 * The Urdu container is wrapped with `lang="ur" dir="rtl"` so screen
 * readers and search engines correctly handle the script direction (this
 * is also a hard requirement for ranking on Urdu-language queries).
 *
 * Listens for clicks on `#reviews` anchor links (e.g. the rating link in
 * the product info) — when triggered, switches to the Reviews tab and
 * scrolls smoothly.
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
  // English content priority: explicit `_en` > legacy `richDescription` >
  // plainDescription. We store all three because the legacy field may be
  // English copy from before the dual-language migration.
  const englishHtml = (richDescriptionEn ?? richDescription)?.trim() || null
  const urduHtml = richDescriptionUr?.trim() || null
  const hasEnglish = !!(englishHtml || plainDescription)
  const hasUrdu = !!urduHtml

  // Specifications tab shows when either the structured spec object
  // has at least one renderable group OR the in-the-box list is
  // populated. Compute once so the tab bar and panel agree.
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

  const initialTab: TabKey = useMemo(() => {
    if (hasSpecs) return "specs"
    if (hasEnglish) return "english"
    if (hasUrdu) return "urdu"
    return "reviews"
  }, [hasEnglish, hasUrdu, hasSpecs])

  const [active, setActive] = useState<TabKey>(initialTab)

  useEffect(() => {
    const handleHashChange = () => {
      if (window.location.hash === "#reviews") {
        setActive("reviews")
        setTimeout(() => {
          const el = document.getElementById("reviews")
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)
      } else if (window.location.hash.startsWith("#spec-row-")) {
        const targetId = window.location.hash.substring(1)
        setActive("specs")
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

    if (window.location.hash === "#reviews" || window.location.hash.startsWith("#spec-row-")) {
      handleHashChange()
    }
    window.addEventListener("hashchange", handleHashChange)

    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const link = target.closest('a[href="#reviews"]')
      if (link) {
        e.preventDefault()
        setActive("reviews")
        setTimeout(() => {
          const el = document.getElementById("reviews")
          if (el) el.scrollIntoView({ behavior: "smooth", block: "start" })
        }, 100)
        return
      }

      const specLink = target.closest('a[href^="#spec-row-"]')
      if (specLink) {
        e.preventDefault()
        const href = specLink.getAttribute("href")
        const targetId = href ? href.substring(1) : ""
        setActive("specs")
        setTimeout(() => {
          const el = document.getElementById(targetId)
          if (el) {
            el.scrollIntoView({ behavior: "smooth", block: "nearest" })
            el.classList.add("bg-primary/5")
            setTimeout(() => el.classList.remove("bg-primary/5"), 1500)
          } else {
            const specsEl = document.getElementById("reviews")
            if (specsEl) specsEl.scrollIntoView({ behavior: "smooth", block: "start" })
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

  const tabBtnCls = (isActive: boolean) =>
    `relative px-4 py-2.5 text-[14.5px] transition-colors ${
      isActive ? "text-black font-extrabold" : "text-black/70 hover:text-black font-bold"
    }`

  return (
    <div className="w-full">
      {/* Tab bar */}
      <div className="flex items-center gap-0 border-b border-line" role="tablist">
        {hasSpecs && (
          <button
            role="tab"
            aria-selected={active === "specs"}
            onClick={() => setActive("specs")}
            className={tabBtnCls(active === "specs")}
          >
            Specifications
            {active === "specs" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-full" />
            )}
          </button>
        )}

        {hasEnglish && (
          <button
            role="tab"
            aria-selected={active === "english"}
            onClick={() => setActive("english")}
            className={tabBtnCls(active === "english")}
          >
            Description
            {active === "english" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-full" />
            )}
          </button>
        )}

        {hasUrdu && (
          <button
            role="tab"
            aria-selected={active === "urdu"}
            onClick={() => setActive("urdu")}
            className={tabBtnCls(active === "urdu")}
            lang="ur"
          >
            اردو
            {active === "urdu" && (
              <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-full" />
            )}
          </button>
        )}

        <button
          role="tab"
          aria-selected={active === "reviews"}
          onClick={() => setActive("reviews")}
          className={`${tabBtnCls(active === "reviews")} inline-flex items-center gap-1.5`}
        >
          Reviews
          {typeof reviewCount === "number" && reviewCount > 0 && (
            <span className="inline-flex items-center justify-center h-[18px] min-w-[18px] px-1 rounded-full bg-primary/10 text-primary text-[10px] font-bold">
              {reviewCount}
            </span>
          )}
          {active === "reviews" && (
            <span className="absolute bottom-0 left-0 right-0 h-[2px] bg-black rounded-full" />
          )}
        </button>
      </div>

      {/* Tab panels */}
      <div className="pt-4 pb-2" role="tabpanel">
        {active === "english" && hasEnglish && (
          <div
            lang="en"
            className="prose prose-sm max-w-none text-ink/80 leading-relaxed"
          >
            <h2 className="sr-only">Product Description</h2>
            {englishHtml ? (
              <div dangerouslySetInnerHTML={{ __html: englishHtml }} />
            ) : (
              <p className="whitespace-pre-line">{plainDescription}</p>
            )}
          </div>
        )}

        {active === "urdu" && hasUrdu && (
          <div
            lang="ur"
            dir="rtl"
            className="prose prose-sm max-w-none text-ink/80 leading-loose font-[400] text-right"
          >
            <h2 className="sr-only" lang="ur">مصنوعات کی تفصیل</h2>
            <div dangerouslySetInnerHTML={{ __html: urduHtml! }} />
          </div>
        )}

        {active === "specs" && hasSpecs && (
          <div className="pt-2 pb-4">
            <h2 className="sr-only">Product Specifications</h2>
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

        {active === "reviews" && (
          <div>
            <h2 className="sr-only">Customer Reviews</h2>
            {reviewsSlot}
          </div>
        )}
      </div>
    </div>
  )
}
