"use client"

import { useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import ImageGallery, { type ImageGalleryProps } from "./index"

/**
 * Thin client bridge — isolates `useSearchParams()` so the parent server
 * tree (ProductTemplate) can SSR the LCP hero + preload link without
 * BAILOUT_TO_CLIENT_SIDE_RENDERING.
 *
 * Integrates with the custom "variant-change" event for instant, flicker-free
 * updates when selecting variants on the client side.
 */
export default function ImageGalleryBridge(props: ImageGalleryProps) {
  const searchParams = useSearchParams()
  const [variantId, setVariantId] = useState<string | null>(null)

  useEffect(() => {
    setVariantId(searchParams.get("v_id"))
  }, [searchParams])

  useEffect(() => {
    const handleVariantChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      setVariantId(customEvent.detail)
    }
    window.addEventListener("variant-change", handleVariantChange)
    return () => window.removeEventListener("variant-change", handleVariantChange)
  }, [])

  return <ImageGallery {...props} variantId={variantId} />
}
