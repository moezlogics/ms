import Image from "next/image"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../../thumbnail"
import type { ProductCardProps } from "./types"

/**
 * Tech Spec — electronics / gadgets card.
 *
 * Dark slate backdrop with neon accent ring. The image sits on a faint
 * grid pattern (CSS gradient) to feel hardware-engineered. On hover a
 * scanline sweeps across the image (top→bottom) and a glowing cyan
 * border pulses in. The CTA flips into a chunky "ADD TO CART" bar with
 * an arrow that slides on hover. Title is uppercase mono-style for a
 * spec-sheet feel.
 */
export default function TechSpecCard({ productPath,
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
        className="block"
      >
        {/* Image frame */}
        <div
          className="relative overflow-hidden rounded-xl bg-slate-950 transition-shadow duration-500 group-hover:shadow-[0_0_0_1px_rgb(34,211,238,0.6),0_22px_45px_-18px_rgb(34,211,238,0.45)]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)",
            backgroundSize: "16px 16px",
          }}
        >
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
            aspectClass={aspectClass}
            alt={thumbnailAlt}
            data-testid="product-wrapper"
            className="transition-transform duration-[1100ms] ease-out group-hover:scale-[1.05]"
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

          {/* Scanline sweep — runs on hover */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 -top-8 h-12 bg-gradient-to-b from-transparent via-cyan-300/30 to-transparent opacity-0 group-hover:opacity-100 group-hover:translate-y-[110%] transition-all duration-[1400ms] ease-in-out"
            style={{ filter: "blur(4px)" }}
          />

          {/* Corner brackets — engineering feel */}
          <span aria-hidden className="absolute top-2 left-2 w-3 h-3 border-t border-l border-cyan-400/70 pointer-events-none" />
          <span aria-hidden className="absolute top-2 right-2 w-3 h-3 border-t border-r border-cyan-400/70 pointer-events-none" />
          <span aria-hidden className="absolute bottom-2 left-2 w-3 h-3 border-b border-l border-cyan-400/70 pointer-events-none" />
          <span aria-hidden className="absolute bottom-2 right-2 w-3 h-3 border-b border-r border-cyan-400/70 pointer-events-none" />

          <div className="absolute top-1 left-1 z-[1] flex flex-col gap-0.5 pointer-events-none">
            {isNew && (
              <span className="inline-flex items-center gap-1 text-[6.5px] font-bold uppercase tracking-wider bg-cyan-400 text-slate-950 px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm font-mono">
                New
              </span>
            )}
            {discount && (
              <span className="inline-block text-[6.5px] font-bold uppercase tracking-wider bg-rose-500 text-white px-[3px] py-[0.5px] rounded-[1.5px] shadow-sm font-mono">
                −{discount}%
              </span>
            )}
          </div>
        </div>
      </LocalizedClientLink>

      {/* Info */}
      <div className="mt-3 flex flex-col gap-1.5">
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          data-testid="product-title"
          className="text-[13px] font-semibold uppercase tracking-wider text-ink hover:text-cyan-600 transition-colors line-clamp-2 leading-snug font-mono"
        >
          {product.title}
        </LocalizedClientLink>

        {cheapestPrice && (
          <div className="flex items-baseline gap-2">
            <span className={`text-base font-bold font-mono ${isSale ? "text-rose-600" : "text-ink"}`}>
              {cheapestPrice.calculated_price}
            </span>
            {isSale && (
              <span className="text-xs line-through text-ink/45 font-mono">
                {cheapestPrice.original_price}
              </span>
            )}
          </div>
        )}

        {/* CTA bar — appears on hover */}
        <LocalizedClientLink
          href={productPath || `/products/${product.handle}`}
          aria-label={`Add ${product.title} to cart`}
          className="mt-2 group/cta relative inline-flex items-center justify-center gap-2 h-10 px-4 rounded-md bg-slate-950 text-white text-[11px] font-bold uppercase tracking-[0.18em] overflow-hidden font-mono hover:bg-cyan-500 transition-colors"
        >
          <span className="relative z-[1] inline-flex items-center gap-2">
            Add to Cart
            <i className="ph-bold ph-arrow-right text-[12px] transition-transform duration-300 group-hover/cta:translate-x-1" aria-hidden />
          </span>
          <span
            aria-hidden
            className="absolute inset-y-0 -left-full w-full bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent group-hover/cta:left-full transition-all duration-700 ease-out"
          />
        </LocalizedClientLink>
      </div>
    </article>
  )
}
