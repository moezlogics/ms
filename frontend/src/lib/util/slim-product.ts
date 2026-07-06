import { HttpTypes } from "@medusajs/types"

/**
 * Metadata keys that are large rich-content blobs needed only by the
 * server-rendered description sections — NEVER by interactive client
 * components. Stripping them before passing `product` to a client
 * component keeps the RSC flight payload small. Measured on the live PDP:
 * the 11.7KB rich description was serialized 4× (≈47KB of every response)
 * purely because full product objects were passed as client props.
 */
const HEAVY_METADATA_KEYS = [
  "rich_description",
  "rich_description_en",
  "rich_description_ur",
  "meta_title",
  "meta_description",
]

/**
 * Shallow-clones a product with the heavy metadata blobs and the long
 * plain-text description removed. Pass THIS to client components
 * (ProductActions, ProductTabs, PreorderBanner…) instead of the full
 * product. Everything interactive components actually read (variants,
 * options, prices, preorder/for_sale/comparable flags, specs) survives.
 */
export function slimProductForClient(
  product: HttpTypes.StoreProduct
): HttpTypes.StoreProduct {
  const metadata = { ...(product.metadata || {}) } as Record<string, unknown>
  for (const key of HEAVY_METADATA_KEYS) {
    delete metadata[key]
  }
  return {
    ...product,
    description: null,
    metadata,
  } as HttpTypes.StoreProduct
}
