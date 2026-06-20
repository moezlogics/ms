import { listProducts } from "@lib/data/products"
import { getRegion } from "@lib/data/regions"
import { getSiteSettings, resolveProductCardAspectClass } from "@lib/data/site-settings"
import { PRODUCT_CARD_FIELDS } from "@lib/util/product-card-fields"
import { HttpTypes } from "@medusajs/types"
import Product from "../product-preview"

type RelatedProductsProps = {
  product: HttpTypes.StoreProduct
  countryCode: string
}

export default async function RelatedProducts({
  product,
  countryCode,
}: RelatedProductsProps) {
  const [region, settings] = await Promise.all([
    getRegion(countryCode),
    getSiteSettings(),
  ])

  if (!region) return null

  const aspectClass = resolveProductCardAspectClass(settings)

  const queryParams: HttpTypes.StoreProductListParams = {}
  if (region?.id) queryParams.region_id = region.id
  if (product.collection_id) queryParams.collection_id = [product.collection_id]
  if (product.tags) {
    queryParams.tag_id = product.tags.map((t) => t.id).filter(Boolean) as string[]
  }
  queryParams.is_giftcard = false
  // Light card fields — related rail renders the same cards as the grids.
  ;(queryParams as any).fields = PRODUCT_CARD_FIELDS

  const products = await listProducts({ queryParams, countryCode }).then(
    ({ response }) =>
      response.products.filter((p) => p.id !== product.id).slice(0, 8)
  )

  if (!products.length) return null

  return (
    <div className="container-anvogue">
      <div className="mb-8 pb-4 border-b border-line">
        <h2 className="heading5">You May Also Like</h2>
      </div>
      <ul className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 gap-x-4 gap-y-8">
        {products.map((p) => (
          <li key={p.id}>
            <Product region={region} product={p} aspectClass={aspectClass} />
          </li>
        ))}
      </ul>
    </div>
  )
}
