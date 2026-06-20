"use client"

import LocalizedClientLink from "@modules/common/components/localized-client-link"

export type CollectionGalleryItem = {
  id: string
  title: string
  handle: string
  image: string
  /** Reserved for future use (e.g. accessible labels). Server still maps it. */
  tagline?: string | null
}

type Props = {
  items: CollectionGalleryItem[]
}

/**
 * Image-only collection gallery — Pinterest-style natural-size masonry.
 *
 * The admin uploads featured images at any aspect ratio; the gallery
 * preserves each image's intrinsic aspect ratio (`width: 100%; height:
 * auto`) and lets CSS multi-column layout pack them into a balanced
 * mosaic.
 *
 * Why CSS columns + a plain `<img>` (and not Next/Image)?
 *   • Next/Image with `fill` requires a fixed-aspect parent, which
 *     forces every tile into the same shape — exactly what the user
 *     asked us to AVOID. Using a plain `<img>` with `loading="lazy"`
 *     and `decoding="async"` keeps natural sizes while still being
 *     network-friendly.
 *   • `break-inside-avoid` keeps each card whole inside its column.
 *
 * No section header, no overlay text — just clickable images. The
 * card title is exposed via `aria-label` and a hover/focus tooltip
 * for accessibility, but never visually rendered (per design ask).
 *
 * Layout:
 *   • Mobile  (<640px):    1 column
 *   • Tablet  (640-1024):  2 columns
 *   • Desktop (>=1024):    3 columns
 */
export default function CollectionGallery({ items }: Props) {
  if (!items.length) return null

  return (
    <section
      className="container-anvogue py-8 md:py-12"
      aria-label="Shop collections"
    >
      <div
        className="columns-1 sm:columns-2 lg:columns-3 gap-4 md:gap-5 [column-fill:_balance]"
      >
        {items.map((item) => (
          <LocalizedClientLink
            key={item.id}
            href={`/collections/${item.handle}`}
            aria-label={item.title}
            title={item.title}
            className="group relative mb-4 md:mb-5 block overflow-hidden rounded-2xl bg-ink/5 break-inside-avoid focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgb(var(--color-primary))] focus-visible:ring-offset-2"
          >
            {/* Plain <img> preserves intrinsic aspect ratio — admin
                uploads any size and the storefront shows it as-is. */}
            <img
              src={item.image}
              alt={item.title}
              loading="lazy"
              decoding="async"
              className="block w-full h-auto transition-transform duration-700 ease-out group-hover:scale-[1.04]"
            />
            {/* Subtle hover wash — keeps the gallery feeling alive
                without printing any text on top. */}
            <span
              aria-hidden
              className="pointer-events-none absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-500"
            />
          </LocalizedClientLink>
        ))}
      </div>
    </section>
  )
}
