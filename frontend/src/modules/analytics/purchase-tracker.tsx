"use client"

import { useEffect, useRef } from "react"
import { trackPurchase } from "@lib/analytics"

/**
 * Fires a GA4 `purchase` event once on mount.
 * Placed on the order confirmation page.
 */
export default function PurchaseTracker({ order }: { order: any }) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current || !order) return
    tracked.current = true

    trackPurchase({
      id: order.display_id?.toString() || order.id,
      total: order.total || 0,
      tax: order.tax_total || 0,
      shipping: order.shipping_total || 0,
      currency: order.currency_code || "usd",
      items: (order.items || []).map((item: any) => ({
        id: item.product_id || item.id,
        title: item.title || "",
        variant: item.variant?.title || item.variant_title || "",
        price: item.unit_price || 0,
        quantity: item.quantity || 1,
      })),
    })
  }, [order])

  return null
}
