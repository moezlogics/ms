"use client"

import { useEffect } from "react"
import { getGuestId, addGuestOrder } from "@lib/util/guest"
import { linkGuestOrder } from "@lib/data/guest"

export default function GuestOrderSync({ orderId }: { orderId: string }) {
  useEffect(() => {
    if (!orderId) return

    const guestId = getGuestId()
    if (!guestId) return

    // 1. Save to local browser history
    addGuestOrder(orderId)

    // 2. Call backend to link the order ID in database metadata
    linkGuestOrder(orderId, guestId)
  }, [orderId])

  return null
}
