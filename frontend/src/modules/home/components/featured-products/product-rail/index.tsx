import { listProducts } from "@lib/data/products"
import {
  getSiteSettings,
  resolveProductCardAspectClass,
} from "@lib/data/site-settings"
import { PRODUCT_CARD_FIELDS } from "@lib/util/product-card-fields"
import { HttpTypes } from "@medusajs/types"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import ProductPreview from "@modules/products/components/product-preview"

type RailCategory = { id: string; name: string; handle: string }

/**
 * Anvogue-styled product rail used on the homepage.
 *
 * One of three modes:
 *   • `category` → heading = category name, products filtered to that
 *                  category, "View All" → the category page. (Used by the
 *                  admin Homepage Builder, one rail per configured section.)
 *   • `collection` → heading = collection title, "View All" → collection.
 *   • neither   → "Latest Mobiles", newest products, "View All" → /store.
 *
 * `limit` controls how many products the rail shows (admin-set per section).
 */
export default async function ProductRail({
  collection,
  category,
  limit = 8,
  region,
}: {
  collection?: HttpTypes.StoreCollection
  category?: RailCategory
  limit?: number
  region: HttpTypes.StoreRegion
}) {
  const safeLimit = Math.max(1, Math.min(24, Number(limit) || 8))

  const [
    {
      response: { products: pricedProducts },
    },
    settings,
  ] = await Promise.all([
    listProducts({
      regionId: region.id,
      queryParams: {
        ...(category?.id ? { category_id: [category.id] } : {}),
        ...(collection?.id ? { collection_id: collection.id } : {}),
        order: "-created_at", // Sort by newest
        limit: safeLimit,
        // Light card fields — homepage rail doesn't need variant images/
        // metadata/tags (big payload cut on the most-visited page).
        fields: PRODUCT_CARD_FIELDS,
      } as any,
    }),
    getSiteSettings(),
  ])

  if (!pricedProducts?.length) return null

  const aspectClass = resolveProductCardAspectClass(settings)

  const heading = category?.name || collection?.title || "Latest Mobiles"
  const viewAllHref = category
    ? `/${category.handle}`
    : collection
      ? `/collections/${collection.handle}`
      : `/store`

  return (
    <section className="pt-0 pb-2">
      <div className="w-full">
        <div className="flex flex-col mb-2 sm:mb-3">
          {(category || collection) && (
            <div className="text-sub-display has-line-before text-brand-black/70 text-[11px] sm:text-xs mb-1">
              {category ? "Category" : "Featured"}
            </div>
          )}
          <h2 className="text-lg sm:text-xl font-bold text-ink leading-tight">
            {heading}
          </h2>
        </div>

        <ul className="grid grid-cols-2 xsmall:grid-cols-3 small:grid-cols-4 medium:grid-cols-6 large:grid-cols-8 gap-x-2 small:gap-x-3 gap-y-3 small:gap-y-6">
          {pricedProducts.map((product, index) => (
            <li key={product.id}>
              {/* First 5 cards are above the fold — eager-load their images
                  so the LCP image isn't lazy (PageSpeed: 1.4s load delay). */}
              <ProductPreview
                product={product}
                region={region}
                aspectClass={aspectClass}
                priority={index < 5}
              />
            </li>
          ))}
        </ul>

        {/* "View All" — bottom-right, after the last product. */}
        <div className="flex justify-end mt-4 sm:mt-5">
          <LocalizedClientLink
            href={viewAllHref}
            className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-ink hover:text-primary transition-colors"
          >
            View All
            <i className="ph-bold ph-arrow-right text-[12px]" aria-hidden />
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}
