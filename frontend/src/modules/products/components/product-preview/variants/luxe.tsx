import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Luxe overlay card — title + price float on a gradient scrim at the
 * bottom of the image. Designed for luxury / fashion catalogs where the
 * product photo does the heavy lifting.
 */
export default function LuxeCard({ productPath,
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
    <article className="group relative overflow-hidden rounded-large">
      <LocalizedClientLink
        href={productPath || `/products/${product.handle}`}
        aria-label={product.title}
        data-testid="product-link"
        className="block"
      >
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          size="full"
          isFeatured={isFeatured}
          aspectClass={aspectClass}
          className="rounded-large"
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

      {/* Gradient scrim + text overlay */}
      <div className="absolute inset-x-0 bottom-0 p-4 pt-16 bg-gradient-to-t from-black/75 via-black/40 to-transparent pointer-events-none">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          data-testid="product-title"
          className="pointer-events-auto block text-white text-sm font-medium line-clamp-2 leading-snug hover:text-accent transition-colors"
        >
          {product.title}
        </LocalizedClientLink>

        {cheapestPrice && (
          <div className="flex items-baseline gap-2 mt-1.5">
            <span className="text-sm font-semibold text-white">
              {cheapestPrice.calculated_price}
            </span>
            {isSale && (
              <span className="text-xs line-through text-white/60">
                {cheapestPrice.original_price}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
