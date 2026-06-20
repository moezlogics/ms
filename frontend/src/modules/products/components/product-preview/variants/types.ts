import { HttpTypes } from "@medusajs/types"
import { VariantPrice } from "types/global"

/**
 * Shared shape passed to every product-card variant. The dispatcher in
 * `product-preview/index.tsx` computes these once from the raw Medusa
 * product payload so each variant is a pure presentational component.
 */
export type ProductCardProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  productPath?: string
  isFeatured?: boolean
  aspectClass?: string
  cheapestPrice: VariantPrice | null | undefined
  isSale: boolean
  isNew: boolean
  defaultVariantId?: string
  /**
   * Secondary image URL (if the product has ≥ 2 images) — used by
   * variants that show a hover swap (`hover-reveal`, `editorial`).
   */
  secondaryImage?: string | null
  /**
   * Alt text for the primary thumbnail. Resolved server-side from the
   * CDN sidecar metadata (AI-generated) and falls back to the product
   * title. Variants should pass this to <Thumbnail alt={...}> and to
   * any decorative <Image> in the card.
   */
  thumbnailAlt?: string
  /** Alt text for the secondary (hover-swap) image. */
  secondaryAlt?: string
  /**
   * When true the card's main image loads eagerly with fetchpriority=high
   * (no lazy-loading). The homepage/listing grids set this on the first
   * few above-the-fold cards so the LCP image isn't delayed — PageSpeed
   * flagged the first product image as a lazy LCP with a 1.4s load delay.
   */
  priority?: boolean
}

/**
 * Metadata for each variant — consumed by the admin picker UI and the
 * storefront dispatcher. Keep `key` values stable: they are persisted
 * as the `product_card_variant` site-setting string.
 */
export type ProductCardVariantMeta = {
  key: string
  label: string
  description: string
  /** Short tag shown as a chip on the admin preview card. */
  tag: string
}
