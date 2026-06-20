import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * ShopUs card variant replicating the ShopUs template design.
 * Features a boxed layout, purple accent highlights on hover, rating stars,
 * and a sliding action toolbar that rises from the bottom of the image frame.
 */
export default function ShopUsCard({ productPath,
  product,
  isFeatured,
  aspectClass,
  cheapestPrice,
  isSale,
  isNew,
  thumbnailAlt,
}: ProductCardProps) {
  return (
    <article className="group relative flex flex-col w-full bg-white border border-white hover:border-[#AE1C9A] rounded-xl overflow-hidden shadow-[rgba(149,157,165,0.2)_0px_8px_24px] transition-all duration-300">
      {/* Image container */}
      <div className={`relative overflow-hidden bg-[#f8f8f8] ${aspectClass || "aspect-[3/4]"}`}>
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
            className="w-full h-full object-contain transition-transform duration-500 ease-out"
          />
        </LocalizedClientLink>

        {/* Micro Badges (Top-Left) */}
        <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-10 pointer-events-none">
          {isNew && (
            <span className="text-[6.5px] font-bold uppercase tracking-wider bg-[#AE1C9A] text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              New
            </span>
          )}
          {isSale && cheapestPrice?.percentage_diff && (
            <span className="text-[6.5px] font-bold uppercase tracking-wider bg-rose-600 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              −{cheapestPrice.percentage_diff}%
            </span>
          )}
        </div>

        {/* Sliding hover action bar */}
        <div className="absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-4 opacity-0 invisible group-hover:bottom-6 group-hover:translate-y-0 group-hover:opacity-100 group-hover:visible flex items-center gap-2.5 transition-all duration-300 z-10">
          <button className="w-10 h-10 bg-white hover:bg-[#AE1C9A] text-neutral-800 hover:text-white rounded-full flex items-center justify-center shadow-md transition-colors duration-200">
            👁
          </button>
          <button className="w-10 h-10 bg-white hover:bg-[#AE1C9A] text-neutral-800 hover:text-white rounded-full flex items-center justify-center shadow-md transition-colors duration-200">
            ❤️
          </button>
          <button className="w-10 h-10 bg-white hover:bg-[#AE1C9A] text-neutral-800 hover:text-white rounded-full flex items-center justify-center shadow-md transition-colors duration-200">
            🛒
          </button>
        </div>
      </div>

      {/* Info Block */}
      <div className="p-4 flex flex-col gap-1.5 flex-grow">
        {/* Rating stars */}
        <div className="flex items-center gap-0.5 text-amber-400 text-xs">
          <span>★</span>
          <span>★</span>
          <span>★</span>
          <span>★</span>
          <span>★</span>
        </div>

        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          data-testid="product-title"
          className="text-sm font-semibold text-neutral-800 hover:text-[#AE1C9A] transition-colors duration-200 line-clamp-2 leading-snug font-sans"
        >
          {product.title}
        </LocalizedClientLink>

        {cheapestPrice && (
          <div className="flex items-baseline gap-2 mt-auto">
            <span className={`text-sm font-bold ${isSale ? "text-[#AE1C9A]" : "text-neutral-900"}`}>
              {cheapestPrice.calculated_price}
            </span>
            {isSale && (
              <span className="text-xs line-through text-neutral-400">
                {cheapestPrice.original_price}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
