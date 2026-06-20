import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Premium Shopify-style card. On hover:
 *   • Secondary product image crossfades in (when available)
 *   • A "View product" pill slides up from the bottom of the image
 *   • Quick-view icon appears on the top-right
 *
 * Inspired by Dose of Colors / Gymshark / Allbirds product grids.
 */
export default function HoverRevealCard({ productPath,
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
  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-xl bg-surface">
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
        </LocalizedClientLink>

        {(isNew || isSale) && (
          <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-[1] pointer-events-none">
            {isNew && (
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

        {/* Slide-up CTA pill */}
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={`View ${product.title}`}
          className="absolute left-3 right-3 bottom-3 z-[2] translate-y-3 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300"
        >
          <span className="w-full flex items-center justify-center gap-2 h-10 rounded-full bg-bg text-ink text-sm font-medium shadow-pop hover:bg-primary hover:text-primary-fg transition-colors">
            <i className="ph-bold ph-eye text-[14px]" aria-hidden />
            View product
          </span>
        </LocalizedClientLink>
      </div>

      <div className="mt-3 flex flex-col gap-1">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          data-testid="product-title"
          className="text-sm font-medium text-ink hover:text-primary transition-colors line-clamp-2 leading-snug"
        >
          {product.title}
        </LocalizedClientLink>

        {cheapestPrice && (
          <div className="flex items-baseline gap-2">
            <span className={`text-sm font-semibold ${isSale ? "text-danger" : "text-ink"}`}>
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
