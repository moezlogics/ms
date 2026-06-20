"use client"

import { useEffect, useRef, useState } from "react"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useRouter } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { getProductPrice } from "@lib/util/get-product-price"
import { getProductPath } from "@lib/util/product"
import {
  useCompare,
  COMPARE_MAX,
  CompareItem,
} from "@modules/products/components/compare/context"
import CompareSearchPopover from "@modules/products/components/compare/compare-search-popover"
import { useSiteSettings } from "@lib/context/site-settings-context"

type CompareInteractiveProps = {
  products: HttpTypes.StoreProduct[]
  countryCode: string
  categoryId: string | null
  categoryName: string | null
}

function toCompareItem(p: HttpTypes.StoreProduct): CompareItem {
  const cat = p.categories?.[0]
  return {
    handle: p.handle!,
    title: p.title,
    thumbnail: p.thumbnail || null,
    categoryId: cat?.id ?? null,
    categoryName: cat?.name ?? null,
  }
}

/**
 * Slot header strip on the /compare page.
 *
 * The list of compared products lives in the URL (`?h=…`) so the page
 * is server-rendered and shareable. This client strip keeps the global
 * compare context (localStorage / floating tray) in sync with that
 * URL, and provides the add / remove controls — every mutation updates
 * BOTH the context and the URL so the tray and the page never drift.
 */
export default function CompareInteractive({
  products,
  countryCode,
  categoryId,
  categoryName,
}: CompareInteractiveProps) {
  const { aspectClass: globalAspectClass } = useSiteSettings()
  const router = useRouter()
  const { replaceAll, add, remove } = useCompare()

  const [pickerOpen, setPickerOpen] = useState(false)
  const pickerRef = useRef<HTMLDivElement>(null)

  const handles = products.map((p) => p.handle).filter(Boolean) as string[]
  const handlesKey = handles.join(",")

  // Keep the global compare context aligned with what this page shows,
  // so the floating tray mirrors the comparison exactly.
  useEffect(() => {
    replaceAll(products.map(toCompareItem))
  }, [handlesKey, replaceAll]) // eslint-disable-line react-hooks/exhaustive-deps

  // Close picker on outside-click / Escape.
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

  const pushHandles = (next: string[]) => {
    if (next.length) {
      router.push(`/${countryCode}/compare?h=${next.join(",")}`)
    } else {
      router.push(`/${countryCode}/compare`)
    }
  }

  const handleAdd = (item: CompareItem) => {
    if (handles.includes(item.handle)) return
    add(item) // instant context/tray update
    setPickerOpen(false)
    pushHandles([...handles, item.handle].slice(0, COMPARE_MAX))
  }

  const handleRemove = (handle: string) => {
    remove(handle)
    pushHandles(handles.filter((h) => h !== handle))
  }

  const canAddMore = products.length < COMPARE_MAX

  return (
    <div className="mb-8">
      {/* Product slot cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        {products.map((product) => {
          const { cheapestPrice } = getProductPrice({ product })
          const original = cheapestPrice?.original_price_number || 0
          const calculated = cheapestPrice?.calculated_price_number || 0
          const discount =
            original && calculated && original > calculated
              ? Math.round(((original - calculated) / original) * 100)
              : 0

          return (
            <div
              key={product.id}
              className="relative flex flex-col p-3 md:p-4 bg-surface border border-line rounded-2xl shadow-sm hover:shadow-md transition-all group"
            >
              <button
                type="button"
                onClick={() => handleRemove(product.handle!)}
                className="absolute top-2.5 right-2.5 z-10 w-7 h-7 flex items-center justify-center rounded-full bg-bg border border-line text-ink/65 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-200 transition-colors shadow-sm"
                title="Remove from comparison"
                aria-label={`Remove ${product.title} from comparison`}
              >
                <i className="ph ph-x text-sm" aria-hidden />
              </button>

              <LocalizedClientLink
                href={getProductPath(product)}
                className="block flex-1"
              >
                <div className={`rounded-xl overflow-hidden bg-bg border border-line flex items-center justify-center p-3 md:p-4 relative ${globalAspectClass}`}>
                  {product.thumbnail ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={product.thumbnail}
                      alt={product.title || "Product"}
                      className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
                    />
                  ) : (
                    <div className="text-ink/30">
                      <i className="ph ph-image text-3xl" aria-hidden />
                    </div>
                  )}
                  {discount > 0 && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 text-[10px] font-bold bg-rose-600 text-white rounded-md shadow-sm">
                      {discount}% OFF
                    </span>
                  )}
                </div>

                <h3 className="mt-3 text-[13px] md:text-sm font-semibold text-ink line-clamp-2 group-hover:text-primary transition-colors">
                  {product.title}
                </h3>
              </LocalizedClientLink>

              <div className="mt-2 flex items-baseline gap-2 flex-wrap">
                <span className="text-sm font-bold text-primary">
                  {cheapestPrice?.calculated_price ?? "—"}
                </span>
                {discount > 0 && cheapestPrice?.original_price && (
                  <span className="text-xs text-ink/40 line-through">
                    {cheapestPrice.original_price}
                  </span>
                )}
              </div>

              <LocalizedClientLink
                href={getProductPath(product)}
                className="mt-3 inline-flex items-center justify-center w-full h-9 rounded-full bg-primary text-white text-xs font-semibold hover:brightness-110 transition-all shadow-sm"
              >
                View Details
              </LocalizedClientLink>
            </div>
          )
        })}

        {/* Add slot */}
        {canAddMore && (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            className={`flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed rounded-2xl min-h-[200px] md:min-h-[240px] transition-all ${
              pickerOpen
                ? "border-primary bg-primary/5"
                : "border-line bg-surface/40 hover:border-primary/40 hover:bg-surface"
            }`}
          >
            <span className="w-11 h-11 rounded-full bg-bg border border-line flex items-center justify-center text-ink/45">
              <i className="ph-bold ph-plus text-lg" aria-hidden />
            </span>
            <span className="text-xs font-semibold text-ink/65">
              Add product to compare
            </span>
            {categoryName && (
              <span className="text-[10px] text-ink/45">in {categoryName}</span>
            )}
          </button>
        )}
      </div>

      {/* Picker panel — opens below the slots, responsive width */}
      {pickerOpen && canAddMore && (
        <div ref={pickerRef} className="mt-3 md:max-w-md">
          <CompareSearchPopover
            categoryId={categoryId}
            categoryName={categoryName}
            excludeHandles={handles}
            onPick={handleAdd}
            onClose={() => setPickerOpen(false)}
          />
        </div>
      )}
    </div>
  )
}
