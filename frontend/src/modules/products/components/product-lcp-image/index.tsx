/**
 * Server-rendered LCP hero image for PDP.
 *
 * ImageGallery is a client component that reads `useSearchParams()` for
 * variant image filtering. Without a Suspense boundary that forces a
 * BAILOUT_TO_CLIENT_SIDE_RENDERING — the whole PDP shell shows a skeleton
 * until JS hydrates, which destroys LCP on mobile PageSpeed.
 *
 * This component renders in the initial HTML (eager + fetchpriority=high)
 * and doubles as the Suspense fallback while the interactive gallery loads.
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
  // #region agent log
  if (typeof fetch !== "undefined") {
    fetch("http://127.0.0.1:7489/ingest/fc89e651-bfd9-4ece-8a01-30fee9370848", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Debug-Session-Id": "90b8a9" },
      body: JSON.stringify({
        sessionId: "90b8a9",
        runId: "lcp-fix",
        hypothesisId: "H1-bailout",
        location: "product-lcp-image/index.tsx",
        message: "ProductLcpImage SSR render",
        data: { src: src.slice(-48), altLen: alt.length },
        timestamp: Date.now(),
      }),
    }).catch(() => {})
  }
  // #endregion

  return (
    <div
      className={`relative ${aspectRatioClass} w-full rounded-[var(--radius-card)] bg-bg overflow-hidden ${className}`}
      data-lcp-hero="true"
    >
      {/* Native img — bypasses Next optimizer latency on the critical path.
          CDN already serves WebP; sizes are modest on mobile 50vw grid. */}
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
