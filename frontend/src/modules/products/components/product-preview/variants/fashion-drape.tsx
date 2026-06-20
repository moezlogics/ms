import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Fashion Drape — apparel / lifestyle card.
 *
 * Tall portrait frame with elegant serif title underneath. On hover:
 *   • Secondary gallery image crossfades in slowly (Zara / COS feel)
 *   • A "Quick Shop" sliver bar reveals from the bottom of the image
 *   • Color swatch dots fan in from the right of the title row
 *   • The entire card lifts slightly with an ink-shadow
 *
 * The CTA on the info row is a single underlined "Shop Now" link with
 * an arrow that travels right on hover — boutique magazine feel.
 */
export default function FashionDrapeCard({ productPath,
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

  // Pull up to 3 small color swatches from product image colors as a
  // visual hint. We use the first 3 product images as proxy swatches —
  // works without any product-option wiring.
  const swatchImages = (product.images || []).slice(0, 3).map((i) => i.url)

  return (
    <article className="group relative flex flex-col">
      <div className="relative overflow-hidden bg-stone-50 transition-all duration-500 group-hover:-translate-y-1 group-hover:shadow-[0_30px_60px_-30px_rgba(0,0,0,0.35)]">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={product.title}
          data-testid="product-link"
          className="block"
        >
          <div className="relative overflow-hidden">
            <Thumbnail
              thumbnail={product.thumbnail}
              images={product.images}
              size="full"
              isFeatured={isFeatured}
              aspectClass={aspectClass || "aspect-[3/4]"}
              alt={thumbnailAlt}
              data-testid="product-wrapper"
              className="transition-transform duration-[1400ms] ease-out group-hover:scale-[1.03]"
            />
            {secondaryImage && (
              <Image
                src={secondaryImage}
                alt={secondaryAlt || ""}
                fill
                className="absolute inset-0 object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-[800ms] pointer-events-none"
                sizes="(max-width: 576px) 50vw, (max-width: 992px) 33vw, 25vw"
                aria-hidden={!secondaryAlt}
              />
            )}
          </div>
        </LocalizedClientLink>

        <div className="absolute top-1 left-1 z-[1] flex flex-col gap-0.5 pointer-events-none">
          {isNew && (
            <span className="text-[6.5px] font-bold uppercase tracking-wider bg-neutral-900 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              New
            </span>
          )}
          {discount && (
            <span className="text-[6.5px] font-bold uppercase tracking-wider bg-rose-700 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm">
              −{discount}%
            </span>
          )}
        </div>

        {/* Quick Shop bar — slides up from bottom of image */}
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={`Quick shop ${product.title}`}
          className="absolute inset-x-0 bottom-0 z-[2] translate-y-full group-hover:translate-y-0 transition-transform duration-500 ease-out"
        >
          <span className="block w-full text-center bg-white/95 backdrop-blur-sm text-stone-900 text-[11px] font-semibold uppercase tracking-[0.22em] py-3 hover:bg-stone-900 hover:text-white transition-colors">
            + Quick Shop
          </span>
        </LocalizedClientLink>
      </div>

      {/* Info — magazine layout */}
      <div className="mt-3.5 flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <LocalizedClientLink
            href={productPath || `/products/${product.handle}`}
            data-testid="product-title"
            className="text-[15px] font-normal text-stone-900 hover:text-stone-600 transition-colors line-clamp-1 leading-snug"
            style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
          >
            {product.title}
          </LocalizedClientLink>

          {cheapestPrice && (
            <div className="mt-1 flex items-baseline gap-2">
              <span
                className={`text-[13px] tracking-wide ${isSale ? "text-rose-700" : "text-stone-700"}`}
                style={{ fontFamily: "Georgia, 'Times New Roman', serif" }}
              >
                {cheapestPrice.calculated_price}
              </span>
              {isSale && (
                <span className="text-[11px] line-through text-stone-400">
                  {cheapestPrice.original_price}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Swatches — fan in on hover */}
        {swatchImages.length > 1 && (
          <div className="flex items-center -space-x-1.5 opacity-0 translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-500">
            {swatchImages.map((src, i) => (
              <span
                key={i}
                className="block w-5 h-5 rounded-full ring-2 ring-white overflow-hidden bg-stone-100"
                style={{ zIndex: swatchImages.length - i }}
                aria-hidden
              >
                <span
                  className="block w-full h-full bg-cover bg-center"
                  style={{ backgroundImage: `url(${src})` }}
                />
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Shop Now link */}
      <LocalizedClientLink
        href={productPath || `/products/${product.handle}`}
        aria-label={`Shop ${product.title}`}
        className="mt-1.5 group/link inline-flex items-center gap-1 text-[10px] font-medium uppercase tracking-[0.22em] text-stone-500 hover:text-stone-900 transition-colors w-fit"
      >
        Shop
        <i className="ph ph-arrow-right text-[10px] transition-transform duration-300 group-hover/link:translate-x-1" aria-hidden />
      </LocalizedClientLink>
    </article>
  )
}
