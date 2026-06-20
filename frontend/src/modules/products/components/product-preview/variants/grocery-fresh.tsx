import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Grocery Fresh — supermarket-style product tile.
 *
 * Optimized for high-density grocery grids (Metro / Naheed / KK Mart
 * style). Surfaces the four pieces of info shoppers scan for first:
 * brand, pack size, price, and a one-tap quick-add affordance.
 *
 *   - Brand pill (top-left) reads from `metadata.brand`.
 *   - Pack-size pill (top-right) reads from `metadata.pack_size` (e.g.
 *     "1 kg", "500 ml"). Falls back to subtitle when not set.
 *   - Bottom-right "+" quick-add button stays visible at all times so
 *     thumb-reach doesn't depend on hover.
 *   - Soft green frame matches the grocery palette without overwhelming
 *     the photo.
 */
export default function GroceryFreshCard({ productPath,
  product,
  isFeatured,
  aspectClass,
  cheapestPrice,
  isSale,
  isNew,
  secondaryImage,
  thumbnailAlt,
  secondaryAlt,
}: ProductCardProps) {
  const meta = (product.metadata || {}) as Record<string, any>
  const brand = typeof meta.brand === "string" ? meta.brand.trim() : null
  const packSize =
    (typeof meta.pack_size === "string" && meta.pack_size.trim()) ||
    (typeof product.subtitle === "string" && product.subtitle.trim()) ||
    null

  const discount =
    isSale && cheapestPrice?.percentage_diff
      ? cheapestPrice.percentage_diff
      : null

  return (
    <article className="group relative flex flex-col">
      {/* Frame */}
      <div className="relative overflow-hidden rounded-2xl bg-white border border-line transition-all duration-300 group-hover:border-primary/40 group-hover:shadow-[0_18px_40px_-22px_rgb(var(--color-primary)/0.45)] group-hover:-translate-y-0.5">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={product.title}
          data-testid="product-link"
          className="block"
        >
          <div className="relative overflow-hidden bg-surface">
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="full"
              isFeatured={isFeatured}
              aspectClass={aspectClass}
              alt={thumbnailAlt}
              data-testid="product-wrapper"
              className="transition-transform duration-[700ms] ease-out group-hover:scale-[1.03]"
            />
            {secondaryImage && (
              <Image
                src={secondaryImage}
                alt={secondaryAlt || ""}
                fill
                className="absolute inset-0 object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
                sizes="(max-width: 576px) 50vw, (max-width: 992px) 33vw, 25vw"
                aria-hidden={!secondaryAlt}
              />
            )}
          </div>
        </LocalizedClientLink>

        {/* Brand + new pill — top-left */}
        <div className="absolute top-1 left-1 z-[1] pointer-events-none flex flex-col gap-0.5">
          {brand && (
            <span className="inline-block max-w-[120px] truncate text-[6.5px] font-bold uppercase tracking-wider bg-white/95 text-primary px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm backdrop-blur">
              {brand}
            </span>
          )}
          {isNew && (
            <span className="inline-block text-[6.5px] font-bold uppercase tracking-wider bg-neutral-900 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              New
            </span>
          )}
        </div>

        {/* Pack size + discount — top-right */}
        <div className="absolute top-1 right-1 z-[1] pointer-events-none flex flex-col gap-0.5 items-end">
          {packSize && (
            <span className="inline-block text-[6.5px] font-bold bg-white/95 text-ink px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm backdrop-blur">
              {packSize}
            </span>
          )}
          {discount && (
            <span className="inline-flex items-center justify-center text-[6.5px] font-bold uppercase bg-red-600 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              −{discount}%
            </span>
          )}
        </div>

        {/* Quick-add — bottom-right, always visible */}
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={`Add ${product.title} to cart`}
          className="absolute bottom-2.5 right-2.5 z-[2] inline-flex items-center justify-center w-9 h-9 rounded-full bg-primary text-primary-fg shadow-md hover:brightness-110 active:scale-95 transition-all"
        >
          <i className="ph-bold ph-plus text-[15px]" aria-hidden />
        </LocalizedClientLink>
      </div>

      {/* Info */}
      <div className="mt-2.5 flex flex-col gap-1">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          data-testid="product-title"
          className="text-[13px] font-medium text-ink hover:text-primary transition-colors line-clamp-2 leading-snug"
        >
          {product.title}
        </LocalizedClientLink>

        {cheapestPrice && (
          <div className="flex items-baseline gap-2">
            <span
              className={`text-[15px] font-bold ${
                isSale ? "text-danger" : "text-ink"
              }`}
            >
              {cheapestPrice.calculated_price}
            </span>
            {isSale && (
              <span className="text-[11px] line-through text-ink/45">
                {cheapestPrice.original_price}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
