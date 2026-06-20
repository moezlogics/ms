"use client"

import { useState } from "react"
import { HttpTypes } from "@medusajs/types"
import ShopFilters from "../shop-filters"

type BrandItem = {
  id: string
  name: string
  handle: string
  logo_url: string | null
  parent_id?: string | null
  sort_order?: number
}

type Props = {
  categories: HttpTypes.StoreProductCategory[]
  currentCategory?: string
  brands?: BrandItem[]
  activeCategoryIds?: string[]
  activeBrandIds?: string[]
  resultCount: number
  specFilters?: any[]
}

/**
 * Mobile filter drawer with overhauled premium styling, slide animation,
 * and high touch-friendly controls.
 */
const MobileFilterDrawer = ({
  categories,
  currentCategory,
  brands = [],
  activeCategoryIds,
  activeBrandIds,
  resultCount,
  specFilters = [],
}: Props) => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 h-10 px-5 rounded-full border border-line text-sm font-semibold text-ink bg-bg shadow-soft hover:bg-surface transition-all active:scale-95"
        aria-label="Open filters"
      >
        <i className="ph-bold ph-sliders-horizontal text-[14px]" aria-hidden />
        <span>Filters</span>
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-[100] bg-ink/35 backdrop-blur-[2px] transition-opacity duration-300"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <aside
            className="fixed top-0 right-0 h-[100dvh] w-[88vw] max-w-[360px] bg-bg z-[101] flex flex-col shadow-pop border-l border-line transition-transform duration-300 transform translate-x-0"
            style={{ animation: "mobileDrawerSlideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1)" }}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-line shrink-0">
              <div className="flex items-center gap-2">
                <i className="ph-bold ph-sliders-horizontal text-base text-primary" />
                <span className="text-base font-bold text-ink">Filters</span>
              </div>
              <button
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="w-8 h-8 rounded-full bg-surface hover:bg-primary hover:text-primary-fg flex items-center justify-center transition-all active:scale-90"
              >
                <i className="ph-bold ph-x text-xs" />
              </button>
            </div>

            {/* Scrollable Filters */}
            <div className="flex-1 overflow-y-auto pr-1">
              <ShopFilters
                categories={categories}
                currentCategory={currentCategory}
                brands={brands}
                activeCategoryIds={activeCategoryIds}
                activeBrandIds={activeBrandIds}
                specFilters={specFilters}
                inDrawer
              />
            </div>

            {/* Sticky Action Footer */}
            <div className="border-t border-line p-4 bg-bg shrink-0 flex items-center gap-3">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 h-11 rounded-xl bg-primary text-primary-fg text-sm font-bold shadow-soft hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5"
              >
                <span>Apply Filters</span>
                {resultCount > 0 && (
                  <span className="bg-primary-fg/20 text-primary-fg text-[11px] font-extrabold px-2 py-0.5 rounded-full">
                    {resultCount}
                  </span>
                )}
              </button>
            </div>
          </aside>
          
          <style>{`
            @keyframes mobileDrawerSlideIn {
              from { transform: translateX(100%); }
              to { transform: translateX(0); }
            }
          `}</style>
        </>
      )}
    </>
  )
}

export default MobileFilterDrawer
