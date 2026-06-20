import { clx } from "@medusajs/ui"
import Image from "next/image"
import React from "react"

import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: any[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  /**
   * Tailwind aspect-ratio class (e.g. "aspect-[3/4]"). When present it
   * overrides the size/isFeatured-derived ratios — used by the site-wide
   * admin setting that lets operators pick a ratio in one place.
   */
  aspectClass?: string
  className?: string
  /**
   * Alt text for the thumbnail. Defaults to "Thumbnail" but every product
   * surface should pass the product title so screen readers and SEO
   * crawlers see something meaningful.
   */
  alt?: string
  /**
   * Load eagerly with fetchpriority=high (skip lazy-loading). Set on the
   * first above-the-fold cards so the LCP product image starts downloading
   * immediately instead of waiting for layout.
   */
  priority?: boolean
  "data-testid"?: string
}

/**
 * Anvogue-style thumbnail surface — rounded-2xl soft-surface card used on
 * product previews, cart items, order lines, etc. The aspect ratio is
 * driven by `aspectClass` (from site-settings) when provided, and falls
 * back to the old size/isFeatured heuristic otherwise so non-catalog
 * surfaces keep their previous look.
 */
const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  aspectClass,
  className,
  alt,
  priority,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url

  return (
    <div
      className={clx(
        "relative w-full overflow-hidden bg-surface rounded-xl transition-shadow duration-300 group-hover:shadow-md",
        className,
        // Use the aspectClass prop (callers pass it from site-settings),
        // else the legacy size/isFeatured heuristic. NOTE: do NOT read
        // useSiteSettings() here — Thumbnail is a SERVER component rendered
        // inside product grids/PDP; calling a client hook crashed every
        // server-rendered card ("useSiteSettings from the server") and took
        // the whole site down.
        aspectClass || {
          "aspect-[11/14]": isFeatured,
          "aspect-[9/16]": !isFeatured && size !== "square",
          "aspect-[1/1]": size === "square",
        },
        {
          "w-[180px]": size === "small",
          "w-[290px]": size === "medium",
          "w-[440px]": size === "large",
          "w-full": size === "full",
        }
      )}
      data-testid={dataTestid}
    >
      <ImageOrPlaceholder image={initialImage} size={size} alt={alt} priority={priority} />
    </div>
  )
}

const ImageOrPlaceholder = ({
  image,
  size,
  alt,
  priority,
}: Pick<ThumbnailProps, "size" | "alt" | "priority"> & { image?: string }) => {
  return image ? (
    <Image
      src={image}
      alt={alt || "Product thumbnail"}
      className="absolute inset-0 object-cover object-center transition-transform duration-700 group-hover:scale-105"
      draggable={false}
      quality={75}
      sizes="(max-width: 576px) 50vw, (max-width: 992px) 33vw, 25vw"
      fill
      {...(priority ? { priority: true } : {})}
    />
  ) : (
    <div className="w-full h-full absolute inset-0 flex items-center justify-center bg-surface">
      <PlaceholderImage size={size === "small" ? 16 : 24} />
    </div>
  )
}

export default Thumbnail
