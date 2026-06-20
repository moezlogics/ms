import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"
import { isProductUpcoming } from "@lib/util/product"

/**
 * Editorial magazine card — large airy image, small uppercase collection
 * eyebrow (derived from collection/title if present), serif-weight title,
 * inline price separated by a bullet. Optional secondary-image crossfade
 * on hover when the product has ≥ 2 images.
 */
export default function EditorialCard({ productPath,
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
  const eyebrow = (product.collection?.title || product.type?.value || "").trim()
  const isUpcoming = isProductUpcoming(product)

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden rounded-base bg-transparent">
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
            alt={thumbnailAlt}
            data-testid="product-wrapper"
            className="bg-transparent"
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

        {(isUpcoming || (isSale && cheapestPrice?.percentage_diff)) && (
          <div className="absolute top-1 left-1 flex flex-col gap-0.5 z-[1] pointer-events-none">
            {isUpcoming && (
              <span className="inline-flex items-center justify-center text-[9px] leading-none font-bold uppercase tracking-wider bg-amber-500 text-white px-[6px] py-[3px] rounded-[3px] shadow-sm">
                Upcoming
              </span>
            )}
            {isSale && cheapestPrice?.percentage_diff && !isUpcoming && (
              <span className="inline-flex items-center justify-center text-[6.5px] leading-none font-bold uppercase tracking-wider bg-red-600 text-white px-[4px] py-[2px] rounded-[1.5px] shadow-sm">
                −{cheapestPrice.percentage_diff}%
              </span>
            )}
          </div>
        )}
      </div>

      <div className="mt-1 small:mt-2 flex flex-col gap-0.5 small:gap-1 text-center">
        {eyebrow && (
          <span className="text-[9px] small:text-[10px] font-semibold uppercase tracking-[0.18em] text-ink/45">
            {eyebrow}
          </span>
        )}
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          data-testid="product-title"
          className="text-[11.5px] small:text-[15px] font-semibold small:font-medium text-ink hover:text-primary transition-colors line-clamp-2 leading-tight"
        >
          {product.title}
        </LocalizedClientLink>

        {cheapestPrice && (
          <div className="flex flex-col small:flex-row items-center justify-center gap-0.5 small:gap-2 mt-0.5">
            {isSale && (
              <span className="text-[9px] small:text-xs line-through text-ink/45 leading-none">
                {cheapestPrice.original_price}
              </span>
            )}
            <span className={`text-[10.5px] small:text-[13px] font-semibold small:font-normal tracking-wide leading-none ${isSale ? "text-danger" : "text-ink/80"}`}>
              {cheapestPrice.calculated_price}
            </span>
          </div>
        )}
      </div>
    </article>
  )
}
