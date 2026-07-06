"use client"

/**
 * Client-side grid controller for ISR archive pages.
 *
 * The server renders EVERY product card in scope once (query-independent →
 * ISR-cacheable HTML). This component then applies sort / price / stock /
 * spec filters and pagination CLIENT-SIDE by showing, hiding and
 * re-ordering the server-rendered cards based on the URL query. Filter
 * controls (SortDropdown, ShopFilters, Pagination…) keep pushing query
 * params exactly as before — nothing re-renders on the server.
 *
 * The URL is read through a tiny <SearchParamsBridge> wrapped in Suspense:
 * during static generation the bridge bails out (fallback null) so the
 * default listing stays in the static HTML for crawlers; on the client it
 * mounts and drives the reactive filtering.
 */
import React, { Suspense, useEffect, useMemo, useState } from "react"
import { useSearchParams } from "next/navigation"
import { Pagination } from "@modules/store/components/pagination"

const PRODUCT_LIMIT = 12

export type GridItemMeta = {
  id: string
  /** Cheapest calculated variant price — null when priceless. */
  price: number | null
  inStock: boolean
  upcoming: boolean
  createdAt: string | null
  /** Raw metadata.specs (string values) for spec_* filters. */
  specs: Record<string, unknown>
}

function SearchParamsBridge({
  onParams,
}: {
  onParams: (qs: string) => void
}) {
  const searchParams = useSearchParams()
  const qs = searchParams.toString()
  useEffect(() => {
    onParams(qs)
  }, [qs, onParams])
  return null
}

function applyQuery(items: GridItemMeta[], qs: string) {
  const params = new URLSearchParams(qs)

  const sortBy = params.get("sortBy") || "created_at"
  const page = Math.max(1, parseInt(params.get("page") || "1", 10) || 1)
  const minP = params.get("minPrice") ? Number(params.get("minPrice")) : null
  const maxP = params.get("maxPrice") ? Number(params.get("maxPrice")) : null
  const inStockOnly = params.get("inStock") === "true"
  const showUpcoming = params.get("upcoming") !== "false"

  const specFilters: Record<string, string[]> = {}
  params.forEach((val, key) => {
    if (key.startsWith("spec_") && val) {
      specFilters[key.substring(5)] = val
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
    }
  })

  let indices = items.map((_, i) => i)

  indices = indices.filter((i) => {
    const it = items[i]
    if (!showUpcoming && it.upcoming) return false
    if (inStockOnly && !it.inStock) return false
    if (minP !== null || maxP !== null) {
      if (it.price === null) return false
      if (minP !== null && it.price < minP) return false
      if (maxP !== null && it.price > maxP) return false
    }
    for (const [specKey, filterValues] of Object.entries(specFilters)) {
      if (filterValues.length === 0) continue
      const productVal = (it.specs || {})[specKey]
      const isBooleanFilter =
        filterValues.includes("Yes") || filterValues.includes("No")
      if (isBooleanFilter) {
        const isTrue =
          productVal === true ||
          String(productVal).trim() === "true" ||
          String(productVal).trim() === "Yes"
        if (!filterValues.includes(isTrue ? "Yes" : "No")) return false
      } else {
        if (productVal === null || productVal === undefined) return false
        const productParts = String(productVal)
          .trim()
          .split(",")
          .map((s) => s.trim().toLowerCase())
        const selected = filterValues.map((v) => v.trim().toLowerCase())
        if (!productParts.some((p) => selected.includes(p))) return false
      }
    }
    return true
  })

  if (sortBy === "price_asc" || sortBy === "price_desc") {
    indices.sort((a, b) => {
      const pa = items[a].price ?? Number.POSITIVE_INFINITY
      const pb = items[b].price ?? Number.POSITIVE_INFINITY
      return sortBy === "price_asc" ? pa - pb : pb - pa
    })
  } else {
    // created_at (latest first) — server already delivers this order, but
    // re-sorting keeps it correct after price-sort round trips.
    indices.sort((a, b) => {
      const da = items[a].createdAt ? Date.parse(items[a].createdAt!) : 0
      const db = items[b].createdAt ? Date.parse(items[b].createdAt!) : 0
      return db - da
    })
  }

  return { indices, page }
}

export default function ProductGridClient({
  items,
  cards,
  totalCount,
}: {
  items: GridItemMeta[]
  /** Server-rendered cards, same order as `items`. */
  cards: React.ReactNode[]
  /** Backend total for the unfiltered scope (may exceed items.length). */
  totalCount: number
}) {
  // null → not hydrated yet → render the server default (page 1, latest).
  const [qs, setQs] = useState<string | null>(null)

  const view = useMemo(() => {
    const effectiveQs = qs ?? ""
    const { indices, page } = applyQuery(items, effectiveQs)
    const totalPages = Math.max(1, Math.ceil(indices.length / PRODUCT_LIMIT))
    const safePage = Math.min(page, totalPages)
    const start = (safePage - 1) * PRODUCT_LIMIT
    const visible = indices.slice(start, start + PRODUCT_LIMIT)
    return { indices, visible, totalPages, page: safePage }
  }, [items, qs])

  const isFiltered = !!qs && qs.length > 0
  const shownTotal = isFiltered ? view.indices.length : Math.max(totalCount, view.indices.length)

  if (items.length === 0 || view.visible.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-large border border-dashed border-line bg-surface/40">
        <Suspense fallback={null}>
          <SearchParamsBridge onParams={setQs} />
        </Suspense>
        <i className="ph ph-package text-5xl text-ink/30 mb-4" aria-hidden />
        <p className="text-base font-semibold text-ink mb-1">No products found</p>
        <p className="text-sm text-ink/60">
          Try adjusting your filters or check back later.
        </p>
      </div>
    )
  }

  return (
    <>
      <Suspense fallback={null}>
        <SearchParamsBridge onParams={setQs} />
      </Suspense>
      <p className="text-xs text-ink/55 mb-4">
        Showing <span className="text-ink font-medium">{view.visible.length}</span>{" "}
        of {shownTotal} {shownTotal === 1 ? "product" : "products"}
      </p>
      <ul
        className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-4 medium:grid-cols-6 large:grid-cols-8 gap-x-2 small:gap-x-3 gap-y-3 small:gap-y-6"
        data-testid="products-list"
      >
        {view.visible.map((i) => (
          <li key={items[i].id}>{cards[i]}</li>
        ))}
      </ul>
      {view.totalPages > 1 && (
        <Suspense fallback={null}>
          <Pagination
            data-testid="product-pagination"
            page={view.page}
            totalPages={view.totalPages}
          />
        </Suspense>
      )}
    </>
  )
}
