"use client"

import { useEffect, useRef } from "react"
import { trackViewCart } from "@lib/analytics"

/**
 * Fires a GA4 `view_cart` event once on mount.
 * Place this on the cart page.
 */
export default function CartViewTracker({ cart }: { cart: any }) {
  const tracked = useRef(false)

  useEffect(() => {
    if (tracked.current || !cart || !cart.items?.length) return
    tracked.current = true

    trackViewCart({
      items: (cart.items || []).map((item: any) => ({
        id: item.product_id || item.id,
        title: item.title || "",
        price: item.unit_price || 0,
        quantity: item.quantity || 1,
      })),
      total: cart.total || 0,
      currency: cart.region?.currency_code || "usd",
    })
  }, [cart])

  return null
}
