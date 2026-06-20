import { listProductsWithSort } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getSiteSettings, resolveProductCardAspectClass } from "@lib/data/site-settings"
import { PRODUCT_CARD_FIELDS } from "@lib/util/product-card-fields"
import ProductPreview from "@modules/products/components/product-preview"
import { Pagination } from "@modules/store/components/pagination"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { isProductUpcoming } from "@lib/util/product"

const PRODUCT_LIMIT = 12

type PaginatedProductsParams = {
  limit: number
  collection_id?: string[]
  category_id?: string[]
  id?: string[]
  order?: string
  fields?: string
}

/**
 * Cheapest calculated price across all variants, as a raw number.
 * Used for client-side price-range filtering.
 */
const cheapestPriceOf = (product: any): number | null => {
  const variants = product?.variants || []
  let min: number | null = null
  for (const v of variants) {
    const raw = v?.calculated_price?.calculated_amount
    if (typeof raw === "number") {
      if (min === null || raw < min) min = raw
    }
  }
  return min
}

const isInStockFn = (product: any): boolean => {
  const variants = product?.variants || []
  // If ANY variant has inventory_quantity > 0, OR allows backorder, OR does
  // not manage inventory — the product is purchasable.
  return variants.some((v: any) => {
    if (v?.allow_backorder) return true
    if (v?.manage_inventory === false) return true
    return typeof v?.inventory_quantity === "number" && v.inventory_quantity > 0
  })
}

export default async function PaginatedProducts({
  sortBy,
  page,
  collectionId,
  categoryId,
  categoryIds,
  productsIds,
  countryCode,
  minPrice,
  maxPrice,
  inStock,
  searchParams,
}: {
  sortBy?: SortOptions
  page: number
  collectionId?: string
  categoryId?: string
  /** Category id + descendants (parent archive roll-up). */
  categoryIds?: string[]
  productsIds?: string[]
  countryCode: string
  minPrice?: string
  maxPrice?: string
  inStock?: boolean
  searchParams?: Record<string, any>
}) {
  const queryParams: PaginatedProductsParams = {
    limit: PRODUCT_LIMIT,
    // Light card fields — drops variants.images/variants.metadata/tags
    // from the 12-card grid payload (cards never render them).
    fields: PRODUCT_CARD_FIELDS,
  }

  if (collectionId) queryParams["collection_id"] = [collectionId]
  // Prefer the rolled-up descendant set; fall back to the single id.
  if (categoryIds && categoryIds.length) queryParams["category_id"] = categoryIds
  else if (categoryId) queryParams["category_id"] = [categoryId]
  // `productsIds === undefined` → not scoped to a brand: show everything.
  // `productsIds === []`        → scoped to a brand that has NO products:
  //                               show nothing. An empty array is truthy in
  //                               JS AND Medusa silently drops an empty `id`
  //                               filter and returns the WHOLE catalog — which
  //                               is why a product linked to one brand used to
  //                               appear under every other brand. Guard here.
  const isIdScoped = productsIds !== undefined
  if (isIdScoped && productsIds!.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-large border border-dashed border-line bg-surface/40">
        <i className="ph ph-package text-5xl text-ink/30 mb-4" aria-hidden />
        <p className="text-base font-semibold text-ink mb-1">No products found</p>
        <p className="text-sm text-ink/60">
          There are no products in this brand yet. Check back later.
        </p>
      </div>
    )
  }
  if (productsIds && productsIds.length) queryParams["id"] = productsIds
  if (sortBy === "created_at") queryParams["order"] = "created_at"

  const [region, settings] = await Promise.all([
    getRegion(countryCode),
    getSiteSettings(),
  ])

  if (!region) return null

  const aspectClass = resolveProductCardAspectClass(settings)

  const {
    response: { products, count },
  } = await listProductsWithSort({
    page,
    queryParams,
    sortBy,
    countryCode,
  })

  // Parse specifications filters
  const activeSpecFilters: Record<string, string[]> = {}
  if (searchParams) {
    for (const [key, val] of Object.entries(searchParams)) {
      if (key.startsWith("spec_") && val) {
        const specKey = key.substring(5) // Remove "spec_" prefix
        const values = Array.isArray(val) ? val : String(val).split(",")
        activeSpecFilters[specKey] = values.map((s) => s.trim()).filter(Boolean)
      }
    }
  }

  // Client-side refinement for price/in-stock/specs since listProductsWithSort
  // already fetches up to 100 and sorts locally. We apply the extra
  // filters here to keep the UX instant.
  const minP = minPrice ? Number(minPrice) : null
  const maxP = maxPrice ? Number(maxPrice) : null

  const showUpcoming = searchParams?.upcoming !== "false"

  const filtered = products.filter((p) => {
    if (!showUpcoming && isProductUpcoming(p)) return false
    if (inStock && !isInStockFn(p)) return false
    if (minP !== null || maxP !== null) {
      const price = cheapestPriceOf(p)
      if (price === null) return false
      if (minP !== null && price < minP) return false
      if (maxP !== null && price > maxP) return false
    }

    // Specifications filtering
    const specs = (p.metadata?.specs || {}) as Record<string, any>
    for (const [specKey, filterValues] of Object.entries(activeSpecFilters)) {
      if (filterValues.length === 0) continue
      const productVal = specs[specKey]

      // Check if this is a boolean filter by looking for "Yes" or "No" in filter options
      const isBooleanFilter = filterValues.includes("Yes") || filterValues.includes("No")

      if (isBooleanFilter) {
        const isTrue = productVal === true || String(productVal).trim() === "true" || String(productVal).trim() === "Yes"
        const productValStr = isTrue ? "Yes" : "No"
        if (!filterValues.includes(productValStr)) {
          return false
        }
      } else {
        if (productVal === null || productVal === undefined) return false
        const productValStr = String(productVal).trim()
        const productParts = productValStr.split(",").map((s) => s.trim().toLowerCase())
        const selectedNormalized = filterValues.map((v) => v.trim().toLowerCase())
        const hasOverlap = productParts.some((part) => selectedNormalized.includes(part))
        if (!hasOverlap) {
          return false
        }
      }
    }

    return true
  })

  const visibleCount = filtered.length > 0 ? filtered.length : 0
  const hasActiveSpecFilters = Object.keys(activeSpecFilters).length > 0
  const totalCount =
    minP !== null || maxP !== null || inStock || !showUpcoming || hasActiveSpecFilters ? visibleCount : count
  const totalPages = Math.ceil(totalCount / PRODUCT_LIMIT)

  if (!filtered.length) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-large border border-dashed border-line bg-surface/40">
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
      <p className="text-xs text-ink/55 mb-4">
        Showing <span className="text-ink font-medium">{filtered.length}</span>{" "}
        of {totalCount} {totalCount === 1 ? "product" : "products"}
      </p>
      <ul
        className="grid grid-cols-2 small:grid-cols-3 medium:grid-cols-4 large:grid-cols-5 gap-x-2 small:gap-x-4 gap-y-3 small:gap-y-8"
        data-testid="products-list"
      >
        {filtered.map((p, index) => (
          <li key={p.id}>
            {/* Eager-load the first row's images (above the fold) so the
                listing LCP image isn't lazy. */}
            <ProductPreview
              product={p}
              region={region}
              aspectClass={aspectClass}
              priority={index < 5}
            />
          </li>
        ))}
      </ul>
      {totalPages > 1 && (
        <Pagination
          data-testid="product-pagination"
          page={page}
          totalPages={totalPages}
        />
      )}
    </>
  )
}
