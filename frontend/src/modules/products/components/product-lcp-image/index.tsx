/**
 * Server-rendered LCP hero image for PDP.
 */
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
  return (
    <div
      className={`relative ${aspectRatioClass} w-full rounded-[var(--radius-card)] bg-bg overflow-hidden ${className}`}
      data-lcp-hero="true"
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        fetchPriority="high"
        loading="eager"
        decoding="async"
        className="absolute inset-0 w-full h-full object-cover"
      />
    </div>
  )
}
