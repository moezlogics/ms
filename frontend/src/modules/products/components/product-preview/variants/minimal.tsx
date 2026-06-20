import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Minimal clean card — laam.pk / everlane vibe. Default variant.
 * Airy, no card borders, badges top-left, title +
 * price stacked below the image.
 */
export default function MinimalCard({ productPath,
  product,
  isFeatured,
  aspectClass,
  cheapestPrice,
  isSale,
  isNew,
  defaultVariantId,
  thumbnailAlt,
  priority,
}: ProductCardProps) {
  return (
    <article
      className={`group relative flex flex-col card-press${
        priority ? "" : " cv-card"
      }`}
    >
      <div className="relative overflow-hidden rounded-xl">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={product.title}
          data-testid="product-link"
          /* NOTE: deliberately NO prefetch={true} here. Full-page
             prefetching the top cards looked clever but each grid view
             kicked off 4 complete PDP renders+downloads in the
             background, which competed with the user's actual navigation
             for mobile bandwidth and server slots — the "skeleton stuck
             after navigating a few pages" symptom. Default (partial)
             prefetch + staleTimes give the instant feel without the
             contention. */
        >
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
            aspectClass={aspectClass}
            alt={thumbnailAlt}
            priority={priority}
            data-testid="product-wrapper"
          />
        </LocalizedClientLink>

        {(isNew || isSale) && (
          <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-[1] pointer-events-none">
            {isNew && !isSale && (
              <span className="text-[6.5px] font-bold uppercase tracking-wider bg-neutral-900 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
                New
              </span>
            )}
            {isSale && cheapestPrice?.percentage_diff && (
              <span className="text-[6.5px] font-bold uppercase tracking-wider bg-red-600 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
                −{cheapestPrice.percentage_diff}%
              </span>
            )}
          </div>
        )}

      </div>

      <div className="mt-3 flex flex-col gap-1">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          data-testid="product-title"
          className="text-sm text-ink hover:text-primary transition-colors line-clamp-2 leading-snug"
        >
          {product.title}
        </LocalizedClientLink>

        {cheapestPrice && (
          <div className="flex items-baseline gap-2">
            {isSale && (
              <span className="text-xs line-through text-ink/50">
                {cheapestPrice.original_price}
              </span>
            )}
            <span className={`text-sm font-semibold ${isSale ? "text-danger" : "text-ink"}`}>
              {cheapestPrice.calculated_price}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
