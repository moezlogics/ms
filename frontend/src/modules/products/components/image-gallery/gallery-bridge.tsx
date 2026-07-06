"use client"

import { useSearchParams } from "next/navigation"
import ImageGallery, { type ImageGalleryProps } from "./index"

/**
 * Thin client bridge — isolates `useSearchParams()` so the parent server
 * tree (ProductTemplate) can SSR the LCP hero + preload link without
 * BAILOUT_TO_CLIENT_SIDE_RENDERING.
 */
export default function ImageGalleryBridge(props: ImageGalleryProps) {
  const variantId = useSearchParams().get("v_id")
  return <ImageGallery {...props} variantId={variantId} />
}
