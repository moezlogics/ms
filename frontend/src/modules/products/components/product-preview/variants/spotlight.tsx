import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Spotlight card — premium storefront look.
 *
 * Design ideas:
 *   • Image sits in a rounded frame with a soft accent-colored halo on hover.
 *   • Secondary image crossfades when available.
 *   • Floating quick-view icon slides in from the right.
 *   • Discount badge is a circular "-XX%" chip in the top-left corner.
 *   • Below the image: title, optional rating placeholder, and a split
 *     row with the price pill on the left and a subtle "ADD" CTA on the right.
 *
 * Works especially well for featured rails and homepage hero grids —
 * reads as premium + modern. Uses the admin-managed `primary`/`accent`
 * theme colors so it stays on-brand.
 */
export default function SpotlightCard({ productPath,
  product,
  isFeatured,
  aspectClass,
  cheapestPrice,
  isSale,
  isNew,
  defaultVariantId,
  secondaryImage,
  thumbnailAlt,
  secondaryAlt,
}: ProductCardProps) {
  const discount =
    isSale && cheapestPrice?.percentage_diff ? cheapestPrice.percentage_diff : null

  return (
    <article className="group relative flex flex-col">
      {/* Image frame */}
      <div className="relative overflow-hidden rounded-2xl bg-surface transition-shadow duration-500 group-hover:shadow-[0_18px_40px_-18px_rgb(var(--color-primary)/0.35)]">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={product.title}
          data-testid="product-link"
          className="block"
        >
          <div className="relative overflow-hidden">
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="full"
              isFeatured={isFeatured}
              aspectClass={aspectClass}
              alt={thumbnailAlt}
              data-testid="product-wrapper"
              className="transition-transform duration-[900ms] ease-out group-hover:scale-[1.06]"
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

        {/* Accent glow ring — appears on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-primary/0 group-hover:ring-primary/40 transition-colors duration-500"
        />

        {(isNew || discount) && (
          <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-[1] pointer-events-none">
            {isNew && (
              <span className="text-[6.5px] font-bold uppercase tracking-wider bg-neutral-900 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm w-fit">
                New
              </span>
            )}
            {discount && (
              <span className="text-[6.5px] font-bold uppercase tracking-wider bg-red-600 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm w-fit">
                −{discount}%
              </span>
            )}
          </div>
        )}

        {/* Floating action rail */}
        {defaultVariantId && (
          <div className="absolute top-3 right-3 z-[2] flex flex-col gap-2 translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100 transition-all duration-300">
            <LocalizedClientLink
              href={productPath || `/products/${product.handle}`}
              aria-label={`Quick view ${product.title}`}
              className="flex items-center justify-center w-9 h-9 rounded-full bg-bg text-ink shadow-soft hover:bg-primary hover:text-primary-fg transition-colors"
            >
              <i className="ph ph-magnifying-glass-plus text-[14px]" aria-hidden />
            </LocalizedClientLink>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="mt-3.5 flex flex-col gap-1.5">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          data-testid="product-title"
          className="text-sm font-medium text-ink hover:text-primary transition-colors line-clamp-2 leading-snug"
        >
          {product.title}
        </LocalizedClientLink>

        <div className="flex items-center justify-between gap-2 mt-0.5">
          {cheapestPrice ? (
            <div className="flex items-baseline gap-2">
              <span
                className={`inline-flex items-center text-sm font-bold ${
                  isSale ? "text-danger" : "text-ink"
                }`}
              >
                {cheapestPrice.calculated_price}
              </span>
              {isSale && (
                <span className="text-xs line-through text-ink/45">
                  {cheapestPrice.original_price}
                </span>
              )}
            </div>
          ) : (
            <span />
          )}

          <LocalizedClientLink
            href={productPath || `/products/${product.handle}`}
            aria-label={`View ${product.title}`}
            className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-ink/60 hover:text-primary transition-colors"
          >
            Shop
            <i className="ph-bold ph-arrow-right text-[11px]" aria-hidden />
          </LocalizedClientLink>
        </div>
      </div>
    </article>
  )
}
