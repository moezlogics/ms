"use client"

import { addToCart } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import { Button } from "@medusajs/ui"
import { useState } from "react"

type ReorderButtonProps = {
  order: HttpTypes.StoreOrder
}

/**
 * One-tap reorder — adds all items from a past order to the cart.
 */
export default function ReorderButton({ order }: ReorderButtonProps) {
  const [isAdding, setIsAdding] = useState(false)
  const [done, setDone] = useState(false)

  const handleReorder = async () => {
    if (!order.items?.length) return

    setIsAdding(true)
    try {
      for (const item of order.items) {
        if (item.variant_id) {
          await addToCart({
            variantId: item.variant_id,
            quantity: item.quantity,
            countryCode:
              order.shipping_address?.country_code || "pk",
          })
        }
      }
      setDone(true)
      setTimeout(() => setDone(false), 3000)
    } catch (e) {
      console.error("Reorder failed:", e)
    } finally {
      setIsAdding(false)
    }
  }

  return (
    <Button
      variant="primary"
      className="flex-1 rounded-lg gap-1.5"
      onClick={handleReorder}
      disabled={isAdding || done}
      data-testid="reorder-button"
    >
      {isAdding ? (
        <>
          <i className="ph-bold ph-spinner animate-spin text-[14px]" aria-hidden />
          Adding...
        </>
      ) : done ? (
        <>
          <i className="ph-fill ph-check-circle text-[14px]" aria-hidden />
          Added to cart!
        </>
      ) : (
        <>
          <i className="ph-bold ph-arrow-counter-clockwise text-[14px]" aria-hidden />
          Reorder
        </>
      )}
    </Button>
  )
}
