"use client"

import { HttpTypes } from "@medusajs/types"
import Image from "next/image"
import { useRef, useState, useCallback, useEffect } from "react"
import dynamic from "next/dynamic"

// The lightbox library + its 4 plugins + CSS are a heavy JS chunk that's
// only needed AFTER the shopper taps an image. Load it lazily (ssr:false,
// mounted only once first opened) so it stays out of the initial PDP
// bundle — PageSpeed flagged Total Blocking Time ~1s on the product page.
const ProductLightbox = dynamic(() => import("./product-lightbox"), {
  ssr: false,
})

type VideoItem = {
  url: string
  poster?: string
}

type GalleryItem = {
  type: "image" | "video"
  url: string
  id?: string
  /** Video poster / thumbnail */
  poster?: string
}

type ImageGalleryProps = {
  images: HttpTypes.StoreProductImage[]
  /** Video URLs from product.metadata.videos */
  videos?: VideoItem[]
  /**
   * Map of image URL → alt text (CDN-generated). Resolved server-side in
   * the product page so every <img alt={...}> carries the AI-generated
   * description instead of a generic "Product image 1" placeholder.
   */
  altMap?: Record<string, string>
  /** Fallback alt — typically the product title. */
  altFallback?: string
  aspectRatioClass?: string
}

/**
 * Professional PDP gallery — Shopify-style zoom with lens overlay.
 *
 * Layout — desktop (≥ lg):
 *   [vertical thumbnails]  [main image/video (aspect 4/5)]
 *                          └ hover = semi-transparent lens + magnified crop
 *                          └ click = open lightbox
 *
 * Layout — mobile:
 *   [main image/video] (swipe-navigable with dots)
 *   [horizontal thumbnail strip]
 */
const ImageGallery = ({ images, videos, altMap, altFallback, aspectRatioClass }: ImageGalleryProps) => {
  const aspectClass = aspectRatioClass || "aspect-square"
  const altFor = (url: string, index: number) =>
    (altMap && altMap[url]) || altFallback || `Product image ${index + 1}`
  const [activeIndex, setActiveIndex] = useState(0)
  const [lightboxIndex, setLightboxIndex] = useState(-1)
  // Lazily mount the (heavy) lightbox on first open, then keep it mounted
  // so its close animation still plays. Keeps its JS chunk out of the
  // initial PDP load.
  const [lightboxMounted, setLightboxMounted] = useState(false)
  useEffect(() => {
    if (lightboxIndex >= 0) setLightboxMounted(true)
  }, [lightboxIndex])
  const [isZooming, setIsZooming] = useState(false)
  const [origin, setOrigin] = useState({ x: 50, y: 50 })
  const zoomRef = useRef<HTMLDivElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const mobileScrollRef = useRef<HTMLDivElement>(null)

  const safeImages = (images || []).filter((i) => !!i?.url)
  const safeVideos = (videos || []).filter((v) => !!v?.url)

  // Build unified gallery items: images first, then videos
  const galleryItems: GalleryItem[] = [
    ...safeImages.map((img) => ({
      type: "image" as const,
      url: img.url!,
      id: img.id,
    })),
    ...safeVideos.map((vid, i) => ({
      type: "video" as const,
      url: vid.url,
      poster: vid.poster,
      id: `video-${i}`,
    })),
  ]

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const rect = zoomRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    setOrigin({
      x: Math.max(0, Math.min(100, x)),
      y: Math.max(0, Math.min(100, y)),
    })
  }, [])

  const handleThumbnailClick = (index: number) => {
    setActiveIndex(index)
    if (mobileScrollRef.current) {
      const width = mobileScrollRef.current.offsetWidth
      mobileScrollRef.current.scrollTo({
        left: width * index,
        behavior: "smooth"
      })
    }
  }

  const handleMobileScroll = () => {
    if (mobileScrollRef.current) {
      const scrollLeft = mobileScrollRef.current.scrollLeft
      const width = mobileScrollRef.current.offsetWidth
      if (width > 0) {
        const newIndex = Math.round(scrollLeft / width)
        if (newIndex !== activeIndex) {
          setActiveIndex(newIndex)
        }
      }
    }
  }

  if (!galleryItems.length) {
    return (
      <div className={`${aspectClass} w-full rounded-xl bg-surface flex items-center justify-center`}>
        <i className="ph ph-image text-5xl text-ink/30" aria-hidden />
      </div>
    )
  }

  const active = galleryItems[activeIndex] || galleryItems[0]
  const isActiveVideo = active.type === "video"

  // Build lightbox slides
  const lightboxSlides = galleryItems.map((item) => {
    if (item.type === "video") {
      return {
        type: "video" as const,
        width: 1280,
        height: 720,
        poster: item.poster,
        sources: [
          {
            src: item.url,
            type: getVideoMimeType(item.url),
          },
        ],
      }
    }
    return { src: item.url }
  })

  return (
    <>
      <div className="flex flex-col gap-3 lg:gap-4 w-full">
        {/* Main stage */}
        <div className="min-w-0 relative w-full">
          {/* Desktop View: only visible on lg and up */}
          <div className="hidden lg:block relative w-full">
            {isActiveVideo ? (
              /* ──── Video player ──── */
              <div
                className={`relative ${aspectClass} w-full rounded-xl bg-ink/5 overflow-hidden group cursor-pointer`}
                onClick={() => setLightboxIndex(activeIndex)}
              >
                <video
                  ref={videoRef}
                  src={active.url}
                  poster={active.poster}
                  className="absolute inset-0 w-full h-full object-contain bg-black"
                  controls
                  controlsList="nodownload"
                  playsInline
                  preload="metadata"
                  onClick={(e) => e.stopPropagation()}
                />
                {/* Fullscreen hint */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setLightboxIndex(activeIndex) }}
                  className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-bg/90 backdrop-blur text-ink flex items-center justify-center shadow-soft opacity-0 group-hover:opacity-100 transition-opacity z-10"
                  aria-label="Open video in fullscreen"
                >
                  <i className="ph-bold ph-arrows-out text-xs" aria-hidden />
                </button>
              </div>
            ) : (
              /* ──── Shopify-style hover zoom with lens overlay ──── */
              <div
                ref={zoomRef}
                onMouseEnter={() => setIsZooming(true)}
                onMouseLeave={() => setIsZooming(false)}
                onMouseMove={handleMouseMove}
                onClick={() => setLightboxIndex(activeIndex)}
                className={`relative ${aspectClass} w-full rounded-xl bg-bg overflow-hidden cursor-zoom-in group`}
                role="button"
                tabIndex={0}
                aria-label="Open product image in lightbox"
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault()
                    setLightboxIndex(activeIndex)
                  }
                }}
              >
                {active?.url && (
                  <Image
                    key={active.url}
                    src={active.url}
                    alt={altFor(active.url, activeIndex)}
                    fill
                    priority={activeIndex === 0}
                    sizes="50vw"
                    quality={95}
                    className={`object-cover ${isZooming ? "" : "transition-all duration-300 ease-in-out"}`}
                    style={isZooming ? {
                      transform: "scale(2)",
                      transformOrigin: `${origin.x}% ${origin.y}%`
                    } : undefined}
                  />
                )}
                {/* Enlarge hint */}
                <span
                  className={`absolute bottom-2.5 right-2.5 bg-bg/90 backdrop-blur text-ink text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1 shadow-soft pointer-events-none ${isZooming ? "opacity-0" : "opacity-0 group-hover:opacity-100"} transition-opacity`}
                  aria-hidden
                >
                  <i className="ph-bold ph-magnifying-glass-plus text-[10px]" />
                  Click to enlarge
                </span>
              </div>
            )}
          </div>

          {/* Mobile View: visible on screen < lg */}
          <div className="block lg:hidden relative w-full overflow-hidden px-2">
            <div
              ref={mobileScrollRef}
              onScroll={handleMobileScroll}
              className="flex overflow-x-auto snap-x snap-mandatory scrollbar-hide w-full"
              style={{ scrollSnapType: "x mandatory", scrollbarWidth: "none", msOverflowStyle: "none" }}
            >
              {galleryItems.map((item, i) => (
                <div
                  key={item.id || i}
                  onClick={() => setLightboxIndex(i)}
                  className={`w-full shrink-0 snap-center relative ${aspectClass} bg-bg rounded-xl overflow-hidden cursor-zoom-in`}
                >
                  {item.type === "video" ? (
                    <video
                      src={item.url}
                      poster={item.poster}
                      className="absolute inset-0 w-full h-full object-contain bg-black"
                      controls
                      controlsList="nodownload"
                      playsInline
                      preload="metadata"
                      onClick={(e) => e.stopPropagation()}
                    />
                  ) : (
                    <Image
                      src={item.url}
                      alt={altFor(item.url, i)}
                      fill
                      priority={i === 0}
                      /* On mobile the PDP shows the gallery in a 50/50 grid
                         (≈50vw), not full width — `100vw` was making Next
                         serve a 2× oversized image (PageSpeed: 750×875 for a
                         206×240 slot). `priority` on the first image already
                         applies eager + fetchpriority=high; the rest stay
                         lazy by default. */
                      sizes="50vw"
                      quality={75}
                      className="object-cover"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Prev/Next arrows on mobile */}
            {galleryItems.length > 1 && (
              <GalleryArrows
                activeIndex={activeIndex}
                total={galleryItems.length}
                onChange={handleThumbnailClick}
              />
            )}
          </div>
        </div>

        {/* Thumbnails row (shown below the main stage on both mobile and desktop) */}
        {galleryItems.length > 1 && (
          <div className={`flex flex-row gap-2 overflow-x-auto py-1.5 scrollbar-hide items-center w-full scroll-smooth ${
            galleryItems.length < 5 ? "justify-center" : "justify-start lg:justify-center"
          }`}>
            {galleryItems.map((item, i) => {
              const isActive = i === activeIndex
              const thumbSrc =
                item.type === "video"
                  ? item.poster || undefined
                  : item.url

              return (
                <button
                  key={item.id || i}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => handleThumbnailClick(i)}
                  className={`relative shrink-0 w-10 h-10 md:w-16 md:h-16 rounded-md md:rounded-lg overflow-hidden bg-surface transition-all duration-200 ${
                    isActive
                      ? "ring-2 ring-primary"
                      : "ring-1 ring-line/50 opacity-60 hover:opacity-100"
                  }`}
                >
                  {thumbSrc ? (
                    <Image
                      src={thumbSrc}
                      alt={
                        item.type === "video"
                          ? `${altFallback || "Product"} video ${i + 1}`
                          : altFor(item.url, i)
                      }
                      fill
                      sizes="80px"
                      quality={85}
                      className="object-cover"
                    />
                  ) : (
                    <div className="w-full h-full bg-ink/10 flex items-center justify-center">
                      <i className="ph-fill ph-video-camera text-sm md:text-base text-ink/40" aria-hidden />
                    </div>
                  )}

                  {/* Video badge overlay on thumbnail */}
                  {item.type === "video" && (
                    <div className="absolute inset-0 flex items-center justify-center bg-ink/20">
                      <div className="w-4 h-4 md:w-6 md:h-6 rounded-full bg-bg/90 flex items-center justify-center shadow-sm">
                        <i className="ph-fill ph-play text-[6px] md:text-[10px] text-ink ml-0.5" aria-hidden />
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {lightboxMounted && (
        <ProductLightbox
          open={lightboxIndex >= 0}
          close={() => setLightboxIndex(-1)}
          index={lightboxIndex < 0 ? 0 : lightboxIndex}
          slides={lightboxSlides}
        />
      )}
    </>
  )
}

/**
 * Infer MIME type from video URL extension.
 */
function getVideoMimeType(url: string): string {
  const ext = url.split("?")[0].split(".").pop()?.toLowerCase()
  switch (ext) {
    case "webm": return "video/webm"
    case "ogg": case "ogv": return "video/ogg"
    case "mov": return "video/quicktime"
    case "avi": return "video/x-msvideo"
    default: return "video/mp4"
  }
}

/**
 * Mobile-only prev/next arrow buttons — rendered inside the media container
 * so `absolute top-1/2` is scoped to the image/video, not a taller parent.
 */
function GalleryArrows({
  activeIndex,
  total,
  onChange,
}: {
  activeIndex: number
  total: number
  onChange: (i: number) => void
}) {
  return (
    <div className="lg:hidden absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-between px-1 pointer-events-none z-20">
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onChange((activeIndex - 1 + total) % total) }}
        aria-label="Previous image"
        className="pointer-events-auto w-6 h-6 rounded-full bg-surface border border-line flex items-center justify-center shadow-md text-black"
      >
        <i className="ph-bold ph-caret-left text-[10px]" aria-hidden />
      </button>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onChange((activeIndex + 1) % total) }}
        aria-label="Next image"
        className="pointer-events-auto w-6 h-6 rounded-full bg-surface border border-line flex items-center justify-center shadow-md text-black"
      >
        <i className="ph-bold ph-caret-right text-[10px]" aria-hidden />
      </button>
    </div>
  )
}

export default ImageGallery
