import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Shopify Bold style card.
 * Features a full-width outline container, hover shadow, micro-badges,
 * and a full-width "Add to Cart" button revealed at the bottom of the card on hover.
 */
export default function ShopifyBoldCard({ productPath,
  product,
  isFeatured,
  aspectClass,
  cheapestPrice,
  isSale,
  isNew,
  thumbnailAlt,
}: ProductCardProps) {
  return (
    <article className="group relative flex flex-col w-full bg-white border border-neutral-200 hover:border-neutral-900 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-[0_12px_30px_rgba(0,0,0,0.08)]">
      {/* Media Wrapper */}
      <div className={`relative overflow-hidden bg-neutral-100 ${aspectClass || "aspect-[3/4]"}`}>
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={product.title}
          data-testid="product-link"
          className="w-full h-full block"
        >
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
            aspectClass={aspectClass}
            alt={thumbnailAlt}
            data-testid="product-wrapper"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        </LocalizedClientLink>

        {/* Shopify-like Micro Badges */}
        <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-10 pointer-events-none">
          {isNew && (
            <span className="text-[6.5px] font-bold uppercase tracking-wider bg-neutral-900 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              New
            </span>
          )}
          {isSale && cheapestPrice?.percentage_diff && (
            <span className="text-[6.5px] font-bold uppercase tracking-wider bg-rose-600 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              −{cheapestPrice.percentage_diff}%
            </span>
          )}
        </div>
      </div>

      {/* Info block */}
      <div className="p-4 flex flex-col flex-grow justify-between gap-2.5 bg-white relative">
        <div className="space-y-1">
          <LocalizedClientLink
            href={productPath || `/products/${product.handle}`}
            data-testid="product-title"
            className="text-xs font-bold uppercase tracking-wider text-neutral-900 hover:text-neutral-700 transition-colors line-clamp-2 leading-relaxed"
          >
            {product.title}
          </LocalizedClientLink>
        </div>

        <div className="flex items-center justify-between mt-auto">
          {cheapestPrice && (
            <div className="flex items-baseline gap-2">
              <span className={`text-sm font-extrabold ${isSale ? "text-rose-600" : "text-neutral-900"}`}>
                {cheapestPrice.calculated_price}
              </span>
              {isSale && (
                <span className="text-xs line-through text-neutral-400 font-normal">
                  {cheapestPrice.original_price}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Hover slide/fade Add to Cart */}
        <div className="absolute inset-x-0 bottom-0 p-4 bg-white translate-y-2 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-300 z-10 border-t border-neutral-100 flex items-center justify-center">
          <LocalizedClientLink
            href={productPath || `/products/${product.handle}`}
            className="w-full text-center text-xs font-bold uppercase tracking-widest bg-neutral-900 text-white py-2.5 hover:bg-neutral-800 transition-colors duration-200"
          >
            Add to Cart
          </LocalizedClientLink>
        </div>
      </div>
    </article>
  )
}
