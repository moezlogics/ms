import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Split-frame card — boutique / concept-store vibe.
 *
 *   ┌────────────────────────────┐
 *   │                            │
 *   │        product image       │   70% top
 *   │                            │
 *   ├────────────────────────────┤
 *   │   title                    │
 *   │   price ▸                  │   30% info block with
 *   │                            │   accent side-band
 *   └────────────────────────────┘
 *
 * A vertical accent-colored band runs down the left edge of the info
 * block, giving the card a strong brand accent. Ribbon-style "-XX%" on
 * the image, and an arrow CTA that slides right on hover.
 */
export default function SplitFrameCard({ productPath,
  product,
  isFeatured,
  aspectClass,
  cheapestPrice,
  isSale,
  isNew,
  defaultVariantId,
  thumbnailAlt,
}: ProductCardProps) {
  const discount =
    isSale && cheapestPrice?.percentage_diff ? cheapestPrice.percentage_diff : null

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl bg-bg border border-line shadow-soft transition-all duration-500 hover:shadow-pop hover:-translate-y-1">
      {/* Image top */}
      <div className="relative overflow-hidden">
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
            alt={thumbnailAlt}
            data-testid="product-wrapper"
            className="transition-transform duration-[900ms] ease-out group-hover:scale-[1.08] !rounded-none"
          />
        </LocalizedClientLink>

        {(discount || isNew) && (
          <div className="absolute top-1 left-1 z-[1] flex flex-col gap-0.5 pointer-events-none">
            {isNew && !discount && (
              <span className="text-[6.5px] font-bold uppercase tracking-wider bg-neutral-900 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
                New
              </span>
            )}
            {discount && (
              <span className="text-[6.5px] font-bold uppercase tracking-wider bg-red-600 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
                −{discount}%
              </span>
            )}
          </div>
        )}

      </div>

      {/* Info block with accent side band */}
      <div className="relative px-4 py-4 flex items-start gap-3">
        <span
          aria-hidden
          className="absolute left-0 top-4 bottom-4 w-[3px] rounded-full bg-primary opacity-70"
        />

        <div className="flex-1 min-w-0 pl-2">
          <LocalizedClientLink
            href={productPath || `/products/${product.handle}`}
            data-testid="product-title"
            className="block text-sm font-semibold text-ink hover:text-primary transition-colors line-clamp-2 leading-snug mb-1.5"
          >
            {product.title}
          </LocalizedClientLink>

          {cheapestPrice && (
            <div className="flex items-baseline gap-2">
              <span
                className={`text-sm font-bold ${
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
          )}
        </div>

        {/* Arrow CTA */}
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={`View ${product.title}`}
          className="shrink-0 flex items-center justify-center w-10 h-10 rounded-full bg-surface text-ink/70 hover:bg-primary hover:text-primary-fg transition-all duration-300 group-hover:translate-x-0 translate-x-[-4px]"
        >
          <i className="ph-bold ph-arrow-right text-[14px]" aria-hidden />
        </LocalizedClientLink>
      </div>
    </article>
  )
}
