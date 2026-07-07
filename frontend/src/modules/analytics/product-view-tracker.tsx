"use client"

import { useEffect } from "react"
import { trackViewItem } from "@lib/analytics"

/**
 * Fires a GA4 `view_item` event once when the component mounts.
 * Place this on the PDP to track product views.
 */
export default function ProductViewTracker({
  productId,
  productTitle,
  category,
  price,
  currency,
}: {
  productId: string
  productTitle: string
  category?: string
  price?: number
  currency?: string
}) {
  useEffect(() => {
    document.body.setAttribute("data-page-type", "pdp")
    trackViewItem({
      id: productId,
      title: productTitle,
      category,
      price,
      currency,
    })
    return () => {
      document.body.removeAttribute("data-page-type")
    }
  }, [productId, productTitle, category, price, currency])

  return null
}
