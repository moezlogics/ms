import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Compact card — tighter spacing, smaller title, inline price + badge
 * pill. Intended for dense 4-6 column grids, search results, "also
 * bought" rails where many products need to be visible at once.
 */
export default function CompactCard({ productPath,
  product,
  isFeatured,
  aspectClass,
  cheapestPrice,
  isSale,
  isNew,
  defaultVariantId,
  thumbnailAlt,
}: ProductCardProps) {
  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-base">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={product.title}
          data-testid="product-link"
        >
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
            aspectClass={aspectClass}
            className="rounded-base"
            alt={thumbnailAlt}
            data-testid="product-wrapper"
          />
        </LocalizedClientLink>

        {(isSale || isNew) && (
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

      <div className="mt-2 flex flex-col gap-0.5">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          data-testid="product-title"
          className="text-[13px] text-ink hover:text-primary transition-colors line-clamp-1 leading-snug"
        >
          {product.title}
        </LocalizedClientLink>

        {cheapestPrice && (
          <div className="flex items-baseline gap-1.5">
            <span className={`text-[13px] font-semibold ${isSale ? "text-danger" : "text-ink"}`}>
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
