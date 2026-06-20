import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Premium Shopify-style minimal card.
 * Clean image container, super-compact Shopify micro-badges, and elegant
 * stacked title and price typography.
 */
export default function ShopifyCard({ productPath,
  product,
  isFeatured,
  aspectClass,
  cheapestPrice,
  isSale,
  isNew,
  thumbnailAlt,
}: ProductCardProps) {
  return (
    <article className="group relative flex flex-col w-full bg-white border border-neutral-100 hover:border-neutral-200 rounded-lg overflow-hidden transition-all duration-300 hover:shadow-[0_8px_24px_rgba(0,0,0,0.04)]">
      {/* Media Wrapper */}
      <div className={`relative overflow-hidden bg-neutral-50 ${aspectClass || "aspect-[3/4]"}`}>
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
            className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
          />
        </LocalizedClientLink>

        {/* Micro Badges (Top-Left) */}
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
          {/* Shopify-like Express Badge */}
          <span className="text-[6.5px] font-bold uppercase tracking-wider bg-blue-600 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
            Express
          </span>
        </div>
      </div>

      {/* Product Info */}
      <div className="p-3.5 flex flex-col flex-grow justify-between gap-1.5 bg-white">
        <div className="space-y-1">
          <LocalizedClientLink
            href={productPath || `/products/${product.handle}`}
            data-testid="product-title"
            className="text-xs text-neutral-800 font-medium hover:text-neutral-900 transition-colors line-clamp-2 leading-relaxed tracking-tight"
          >
            {product.title}
          </LocalizedClientLink>
        </div>

        {cheapestPrice && (
          <div className="flex items-baseline gap-2 mt-auto">
            <span className={`text-sm font-bold tracking-tight ${isSale ? "text-rose-600" : "text-neutral-900"}`}>
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
    </article>
  )
}
