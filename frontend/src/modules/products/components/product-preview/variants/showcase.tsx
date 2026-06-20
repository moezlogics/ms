import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Showcase card — large photo + magazine overlay.
 *
 * The image fills the whole card (no separate info block below). On
 * hover a dark bottom-to-top gradient scrim slides up revealing the
 * product title + price in white typography. A slim "Add to Cart"
 * pill fades in at the bottom.
 *
 * Perfect for featured collections, category heroes, or any page where
 * the product photo itself should be the hero element. Think Aimé Leon
 * Dore's lookbook tiles.
 */
export default function ShowcaseCard({ productPath,
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
  const discount =
    isSale && cheapestPrice?.percentage_diff ? cheapestPrice.percentage_diff : null

  return (
    <article className="group relative flex flex-col">
      <LocalizedClientLink
        href={productPath || `/products/${product.handle}`}
        aria-label={product.title}
        data-testid="product-link"
        className="block relative overflow-hidden rounded-2xl bg-surface"
      >
        {/* Primary image */}
        <Thumbnail
          thumbnail={product.thumbnail}
          images={product.images}
          size="full"
          isFeatured={isFeatured}
          aspectClass={aspectClass}
          alt={thumbnailAlt}
          data-testid="product-wrapper"
          className="transition-transform duration-[1200ms] ease-out group-hover:scale-[1.08]"
        />

        {/* Secondary crossfade */}
        {secondaryImage && (
          <Image
            src={secondaryImage}
            alt={secondaryAlt || ""}
            fill
            className="absolute inset-0 object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
            sizes="(max-width: 576px) 50vw, (max-width: 992px) 33vw, 25vw"
            aria-hidden={!secondaryAlt}
          />
        )}

        {/* Bottom gradient scrim — grows on hover */}
        <span
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/85 via-black/40 to-transparent opacity-70 group-hover:opacity-100 group-hover:h-[65%] transition-all duration-500 pointer-events-none"
        />

        {/* Badges */}
        <div className="absolute top-1 left-1 z-[1] flex flex-col gap-0.5 pointer-events-none">
          {isNew && (
            <span className="inline-flex items-center gap-1 text-[6.5px] font-bold uppercase tracking-wider bg-neutral-900 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              New
            </span>
          )}
          {discount && (
            <span className="inline-block text-[6.5px] font-bold uppercase tracking-wider bg-red-600 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              −{discount}%
            </span>
          )}
        </div>

        {/* Title + price overlay */}
        <div className="absolute inset-x-0 bottom-0 p-4 md:p-5 z-[1] text-white pointer-events-none">
          <h3
            data-testid="product-title"
            className="text-[15px] md:text-base font-semibold leading-snug line-clamp-2 drop-shadow-[0_2px_8px_rgba(0,0,0,0.55)]"
          >
            {product.title}
          </h3>

          {cheapestPrice && (
            <div className="mt-1.5 flex items-baseline gap-2">
              <span className="text-sm md:text-base font-bold drop-shadow-[0_2px_8px_rgba(0,0,0,0.6)]">
                {cheapestPrice.calculated_price}
              </span>
              {isSale && (
                <span className="text-xs line-through text-white/65">
                  {cheapestPrice.original_price}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Slide-in shop pill */}
        <span
          aria-hidden
          className="absolute left-1/2 -translate-x-1/2 bottom-3 z-[2] translate-y-4 opacity-0 group-hover:translate-y-0 group-hover:opacity-100 transition-all duration-500 pointer-events-none"
        >
          <span className="inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-bg text-ink text-[11px] font-bold uppercase tracking-widest shadow-pop">
            Shop Now
            <i className="ph-bold ph-arrow-right text-[11px]" aria-hidden />
          </span>
        </span>
      </LocalizedClientLink>
    </article>
  )
}
