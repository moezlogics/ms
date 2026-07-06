import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getSiteSettings, resolveProductCardAspectClass } from "@lib/data/site-settings"
import { PRODUCT_CARD_FIELDS } from "@lib/util/product-card-fields"
import ProductPreview from "@modules/products/components/product-preview"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { isProductUpcoming } from "@lib/util/product"
import ProductGridClient, { GridItemMeta } from "./product-grid-client"

/**
 * Max products fetched + server-rendered per archive page. Mirrors the old
 * listProductsWithSort cap (it also fetched 100 and paginated locally), so
 * deep catalogs behave exactly as before — but now the HTML is
 * query-independent and therefore ISR/CDN cacheable. Filtering, sorting
 * and pagination happen client-side in ProductGridClient.
 */
const SCOPE_LIMIT = 100

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
  collectionId,
  categoryId,
  categoryIds,
  productsIds,
  countryCode,
}: {
  /** @deprecated query params are handled client-side now */
  sortBy?: SortOptions
  /** @deprecated query params are handled client-side now */
  page?: number
  collectionId?: string
  categoryId?: string
  /** Category id + descendants (parent archive roll-up). */
  categoryIds?: string[]
  productsIds?: string[]
  countryCode: string
  /** @deprecated query params are handled client-side now */
  minPrice?: string
  /** @deprecated query params are handled client-side now */
  maxPrice?: string
  /** @deprecated query params are handled client-side now */
  inStock?: boolean
  /** @deprecated query params are handled client-side now */
  searchParams?: Record<string, any>
}) {
  const queryParams: PaginatedProductsParams = {
    limit: SCOPE_LIMIT,
    // Light card fields — drops variants.images/variants.metadata/tags
    // from the grid payload (cards never render them).
    fields: PRODUCT_CARD_FIELDS,
    order: "created_at",
  }

  if (collectionId) queryParams["collection_id"] = [collectionId]
  // Prefer the rolled-up descendant set; fall back to the single id.
  if (categoryIds && categoryIds.length) queryParams["category_id"] = categoryIds
  else if (categoryId) queryParams["category_id"] = [categoryId]
  // `productsIds === undefined` → not scoped to a brand: show everything.
  // `productsIds === []`        → scoped to a brand that has NO products:
  //                               show nothing (Medusa drops an empty `id`
  //                               filter and would return the whole catalog).
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

  const [region, settings] = await Promise.all([
    getRegion(countryCode),
    getSiteSettings(),
  ])

  if (!region) return null

  const aspectClass = resolveProductCardAspectClass(settings)

  const {
    response: { products, count },
  } = await listProducts({
    pageParam: 1,
    queryParams: queryParams as any,
    countryCode,
  })

  const items: GridItemMeta[] = products.map((p: any) => ({
    id: p.id,
    price: cheapestPriceOf(p),
    inStock: isInStockFn(p),
    upcoming: isProductUpcoming(p),
    createdAt: p.created_at ?? null,
    specs: (p.metadata?.specs || {}) as Record<string, unknown>,
  }))

  const cards = products.map((p: any, index: number) => (
    // Eager-load the first row's images (above the fold) so the listing
    // LCP image isn't lazy.
    <ProductPreview
      key={p.id}
      product={p}
      region={region}
      aspectClass={aspectClass}
      priority={index < 5}
    />
  ))

  return <ProductGridClient items={items} cards={cards} totalCount={count} />
}
