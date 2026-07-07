/**
 * Server-rendered LCP hero image for PDP.
 *
 * Uses a plain <img> (not next/image) so the server can emit the element
 * synchronously without any client-side hydration — critical for LCP because
 * the browser's preload scanner discovers it in the initial HTML.
 *
 * We build a srcset manually pointing at Next.js's image optimizer
 * (/_next/image) so the browser picks the right width for the device:
 *   - 640 → small phones (portrait)
 *   - 828 → medium phones / small tablets
 *   - 1080 → large phones, compact desktops
 * The `sizes` attribute tells the browser how wide this slot is in CSS px so
 * it can pick the cheapest image to download:
 *   - mobile PDP: 50vw (gallery is in a 2-col grid)
 *   - desktop PDP: ~40vw (left column of a 1.15:1 grid, max ~530px)
 */

function buildSrcSet(src: string, widths: number[], quality: number): string {
  return widths
    .map((w) => {
      const params = new URLSearchParams({
        url: src,
        w: String(w),
        q: String(quality),
      })
      return `/_next/image?${params.toString()} ${w}w`
    })
    .join(", ")
}

type ProductLcpImageProps = {
  src: string
  alt: string
  aspectRatioClass?: string
  className?: string
}

export default function ProductLcpImage({
  src,
  alt,
  aspectRatioClass = "aspect-square",
  className = "",
}: ProductLcpImageProps) {
  // Only build srcset for local/CDN URLs — skip data URIs and absolute
  // external URLs that may not pass through /_next/image.
  const isOptimizable =
    src &&
    !src.startsWith("data:") &&
    (src.startsWith("/") || src.startsWith("https://cdn.mobilestore.pk") || src.startsWith("http://localhost"))

  const srcSet = isOptimizable
    ? buildSrcSet(src, [640, 828, 1080], 75)
    : undefined

  return (
    <div
      className={`relative ${aspectRatioClass} w-full rounded-[var(--radius-card)] bg-bg overflow-hidden ${className}`}
      data-lcp-hero="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        srcSet={srcSet}
        // Mobile PDP: gallery is in a 50/50 grid → ~50vw
        // Desktop PDP: left column ≈ 1.15fr in a 1.15:1 two-col layout → ~40vw
        sizes="(min-width: 1024px) 40vw, 50vw"
        alt={alt}
        fetchPriority="high"
        loading="eager"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  )
}
