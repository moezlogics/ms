import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getSiteSettings, resolveProductCardAspectClass } from "@lib/data/site-settings"
import { PRODUCT_CARD_FIELDS } from "@lib/util/product-card-fields"
import { HttpTypes } from "@medusajs/types"
import Product from "../product-preview"
import FBTClient from "./fbt-client"

type Props = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

/**
 * Frequently Bought Together — shows admin-selected companion products.
 *
 * Reads `product.metadata.fbt_ids` (array of product IDs set via the
 * admin widget). If no IDs are configured the section is hidden entirely.
 *
 * Each product renders using the site's active ProductPreview card variant
 * so the look & feel matches product grids across the storefront.
 */
export default async function FrequentlyBoughtTogether({
  product,
  countryCode,
}: Props) {
  /* ── Read admin-configured FBT product IDs ── */
  const fbtIds: string[] = Array.isArray(
    (product.metadata as any)?.fbt_ids
  )
    ? ((product.metadata as any).fbt_ids as string[])
    : []

  /* Nothing selected → hide the section entirely */
  if (fbtIds.length === 0) return null

  const [region, settings] = await Promise.all([
    getRegion(countryCode),
    getSiteSettings(),
  ])

  if (!region) return null

  const aspectClass = resolveProductCardAspectClass(settings)

  /* Fetch the specific products by their IDs */
  const queryParams: HttpTypes.StoreProductListParams = {
    region_id: region.id,
    is_giftcard: false,
    id: fbtIds,
    limit: fbtIds.length,
    // Light card fields — FBT renders the same product cards.
    ...({ fields: PRODUCT_CARD_FIELDS } as any),
  }

  const fetched = await listProducts({ queryParams, countryCode }).then(
    ({ response }) => response.products
  )

  /* Maintain the admin-configured order */
  const productMap = new Map(fetched.map((p) => [p.id, p]))
  const products = fbtIds
    .map((id) => productMap.get(id))
    .filter(Boolean) as HttpTypes.StoreProduct[]

  if (products.length === 0) return null

  return (
    <div className="container-anvogue my-12">
      <div className="mb-6 pb-3 border-b border-line">
        <h2 className="heading5 flex items-center gap-2">
          <i
            className="ph-fill ph-squares-four text-primary text-lg"
            aria-hidden
          />
          Frequently Bought Together
        </h2>
        <p className="text-sm text-ink/55 mt-1">
          Customers who bought this item also bought these
        </p>
      </div>
      <FBTClient
        products={products}
        countryCode={countryCode}
      >
        {products.map((p) => (
          <Product
            key={p.id}
            region={region}
            product={p}
            aspectClass={aspectClass}
          />
        ))}
      </FBTClient>
    </div>
  )
}
