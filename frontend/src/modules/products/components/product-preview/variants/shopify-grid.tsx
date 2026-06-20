import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Shopify Grid compact card variant.
 * High-density design featuring thin outlines, small title and discount badges,
 * and inline prices. Perfect for listing rails and large grids.
 */
export default function ShopifyGridCard({ productPath,
  product,
  isFeatured,
  aspectClass,
  cheapestPrice,
  isSale,
  isNew,
  thumbnailAlt,
}: ProductCardProps) {
  const brand = (product.metadata?.brand as string) || ""

  return (
    <article className="group relative flex flex-col w-full bg-white border border-neutral-100 rounded-md overflow-hidden transition-all duration-300 hover:border-neutral-300">
      {/* Media Wrapper */}
      <div className={`relative overflow-hidden bg-neutral-50 ${aspectClass || "aspect-[4/5]"}`}>
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
            className="w-full h-full object-cover transition-transform duration-300 ease-out"
          />
        </LocalizedClientLink>

        {/* Micro-badges */}
        <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-10 pointer-events-none">
          {isSale && cheapestPrice?.percentage_diff && (
            <span className="text-[6.5px] font-bold uppercase tracking-wider bg-rose-600 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              −{cheapestPrice.percentage_diff}%
            </span>
          )}
          {isNew && !isSale && (
            <span className="text-[6.5px] font-bold uppercase tracking-wider bg-neutral-900 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              New
            </span>
          )}
        </div>
      </div>

      {/* Info Block */}
      <div className="p-3 flex flex-col gap-1 bg-white">
        {brand && (
          <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider">
            {brand}
          </span>
        )}

        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          data-testid="product-title"
          className="text-xs font-semibold text-neutral-800 hover:text-neutral-950 transition-colors line-clamp-1 leading-snug"
        >
          {product.title}
        </LocalizedClientLink>

        {cheapestPrice && (
          <div className="flex items-center gap-1.5 mt-0.5">
            <span className={`text-xs font-extrabold ${isSale ? "text-rose-600" : "text-neutral-900"}`}>
              {cheapestPrice.calculated_price}
            </span>
            {isSale && (
              <span className="text-[10px] line-through text-neutral-400">
                {cheapestPrice.original_price}
              </span>
            )}
          </div>
        )}
      </div>
    </article>
  )
}
