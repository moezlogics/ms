import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Pixio card variant replicating the NuxtJs-Pixio template design.
 * Contains rounded media frames, an image that translates upward on hover,
 * and a floating meta block with Quick Shop action overlay.
 */
export default function PixioCard({ productPath,
  product,
  isFeatured,
  aspectClass,
  cheapestPrice,
  isSale,
  isNew,
  thumbnailAlt,
}: ProductCardProps) {
  return (
    <article className="group relative flex flex-col w-full h-full bg-transparent">
      {/* Media Wrapper */}
      <div className={`relative overflow-hidden rounded-[20px] bg-neutral-50 transition-all duration-500 ${aspectClass || "aspect-[3/4]"}`}>
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={product.title}
          data-testid="product-link"
          className="w-full h-full block"
        >
          <div className="w-full h-full transform transition-transform duration-500 ease-out group-hover:-translate-y-4">
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="full"
              isFeatured={isFeatured}
              aspectClass={aspectClass}
              alt={thumbnailAlt}
              data-testid="product-wrapper"
              className="w-full h-full object-cover rounded-[20px]"
            />
          </div>
        </LocalizedClientLink>

        {/* Small Shopify-like Badge */}
        <div className="absolute top-1.5 left-1.5 z-10 pointer-events-none flex flex-col gap-0.5">
          {isSale && cheapestPrice?.percentage_diff && (
            <span className="text-[6.5px] font-bold uppercase tracking-wider bg-white text-neutral-900 px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm border border-neutral-100">
              −{cheapestPrice.percentage_diff}%
            </span>
          )}
          {!isSale && isNew && (
            <span className="text-[6.5px] font-bold uppercase tracking-wider bg-white text-neutral-900 px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm border border-neutral-100">
              New
            </span>
          )}
        </div>

        {/* Action icons overlay (fade & slide on hover) */}
        <div className="absolute inset-x-4 bottom-4 flex items-center justify-between opacity-0 translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all duration-350 z-10">
          <LocalizedClientLink
            href={productPath || `/products/${product.handle}`}
            className="flex-grow mr-2 text-center text-xs font-bold text-white bg-neutral-900 hover:bg-neutral-800 py-2.5 px-4 rounded-full shadow-md transition-colors duration-200"
          >
            Quick View
          </LocalizedClientLink>
          <div className="flex gap-1.5">
            <button className="w-9 h-9 bg-white text-neutral-900 hover:bg-neutral-100 rounded-full flex items-center justify-center shadow-md transition-colors duration-200">
              ❤️
            </button>
            <button className="w-9 h-9 bg-white text-neutral-900 hover:bg-neutral-100 rounded-full flex items-center justify-center shadow-md transition-colors duration-200">
              🛒
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="py-4 px-1 flex items-start justify-between gap-3">
        <h5 className="text-sm font-semibold text-neutral-800 hover:text-neutral-900 transition-colors line-clamp-2 leading-snug w-[70%]">
          <LocalizedClientLink href={productPath || `/products/${product.handle}`}>
            {product.title}
          </LocalizedClientLink>
        </h5>
        {cheapestPrice && (
          <div className="text-right">
            <span className="text-sm font-bold text-neutral-900 block">
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
