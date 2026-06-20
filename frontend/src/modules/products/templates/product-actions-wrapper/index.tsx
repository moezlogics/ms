import { listProducts } from "@lib/data/products"
import { getSiteSettings } from "@lib/data/site-settings"
import { HttpTypes } from "@medusajs/types"
import ProductActions from "@modules/products/components/product-actions"

/**
 * Fetches real time pricing for a product and renders the product actions component.
 */
export default async function ProductActionsWrapper({
  id,
  region,
}: {
  id: string
  region: HttpTypes.StoreRegion
}) {
  const [product, settings] = await Promise.all([
    listProducts({
      queryParams: { id: [id] },
      regionId: region.id,
    }).then(({ response }) => response.products[0]),
    getSiteSettings(),
  ])

  if (!product) {
    return null
  }

  return (
    <ProductActions
      product={product}
      region={region}
      whatsappNumber={settings.whatsapp_number?.trim() || undefined}
      whatsappBuyNowEnabled={settings.whatsapp_buy_now_enabled !== "false"}
    />
  )
}
