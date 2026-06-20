import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Boxed card — every product sits in a rounded, bordered surface with the
 * info block padded inside. Slight lift on hover. Great for dense grids
 * where the structure needs to read as a set of clearly delimited tiles.
 */
export default function BoxedCard({ productPath,
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
    <article className="group relative flex flex-col rounded-large border border-line bg-bg overflow-hidden transition-all hover:shadow-pop hover:-translate-y-0.5 duration-300">
      <div className="relative overflow-hidden">
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
            className="rounded-none"
            alt={thumbnailAlt}
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

      <div className="p-4 flex flex-col gap-1 flex-1">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          data-testid="product-title"
          className="text-sm font-medium text-ink hover:text-primary transition-colors line-clamp-2 leading-snug min-h-[2.5rem]"
        >
          {product.title}
        </LocalizedClientLink>

        {cheapestPrice && (
          <div className="flex items-baseline gap-2 mt-1">
            <span className={`text-base font-semibold ${isSale ? "text-danger" : "text-ink"}`}>
              {cheapestPrice.calculated_price}
            </span>
            {isSale && (
              <span className="text-xs line-through text-ink/50">
                {cheapestPrice.original_price}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
