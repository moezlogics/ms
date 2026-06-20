import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import { getSiteSettings } from "@lib/data/site-settings"
import { resolveCdnMetaBatch } from "@lib/data/cdn-meta"
import { getProductPath } from "@lib/util/product"

import {
  PRODUCT_CARD_VARIANTS,
  resolveProductCardVariant,
} from "./variants"
import type { ProductCardProps } from "./variants"

/**
 * ProductPreview dispatcher.
 *
 * Reads the admin-selected `product_card_variant` from site-settings and
 * renders the matching pre-built card design. All variants share the
 * same normalized props (computed once here) so callers across the
 * storefront — shop grid, featured rails, search, related
 * products — don't need to know which design is active.
 *
 * Fallback: `minimal` if the setting is missing or unknown.
 */
export default async function ProductPreview({
  product,
  isFeatured,
  aspectClass,
  region,
  priority,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  aspectClass?: string
  region: HttpTypes.StoreRegion
  /** Eager-load this card's image (first above-the-fold cards only). */
  priority?: boolean
}) {
  const [{ cheapestPrice }, settings] = await Promise.all([
    Promise.resolve(getProductPrice({ product })),
    getSiteSettings(),
  ])

  const isSale = cheapestPrice?.price_type === "sale"

  const metadataNew =
    typeof product.metadata?.is_new === "boolean"
      ? (product.metadata.is_new as boolean)
      : String(product.metadata?.is_new ?? "").toLowerCase() === "true"
  const createdAt = product.created_at ? new Date(product.created_at) : null
  const isNew =
    metadataNew ||
    (createdAt !== null &&
      Date.now() - createdAt.getTime() < 30 * 24 * 60 * 60 * 1000)

  const defaultVariantId = product.variants?.[0]?.id
  const primaryImageUrl = product.thumbnail || product.images?.[0]?.url || ""
  const secondaryImage =
    product.images && product.images.length > 1
      ? product.images[1]?.url
      : null

  // Resolve AI-generated alt text from the CDN sidecar so each card's
  // <img alt={...}> carries a real description. Falls back silently
  // to the product title when the CDN doesn't have meta for the URL.
  const altUrls = [primaryImageUrl, secondaryImage].filter(Boolean) as string[]
  const altMeta = altUrls.length
    ? await resolveCdnMetaBatch(altUrls).catch(() => ({}))
    : {}
  const fallbackAlt = product.title || "Product"
  const thumbnailAlt =
    (primaryImageUrl && altMeta[primaryImageUrl]?.alt) || fallbackAlt
  const secondaryAlt =
    (secondaryImage && altMeta[secondaryImage]?.alt) || fallbackAlt

  const productPath = getProductPath(product)

  const variantKey = resolveProductCardVariant(settings.product_card_variant)
  const { Component } = PRODUCT_CARD_VARIANTS[variantKey]

  const props: ProductCardProps = {
    product,
    region,
    isFeatured,
    aspectClass,
    cheapestPrice,
    isSale,
    isNew,
    defaultVariantId,
    secondaryImage,
    thumbnailAlt,
    secondaryAlt,
    productPath,
    priority,
  }

  return (
    <div className={`product-card-wrapper h-full w-full ${variantKey === "editorial" ? "transparent-card" : ""}`}>
      <Component {...props} />
    </div>
  )
}

