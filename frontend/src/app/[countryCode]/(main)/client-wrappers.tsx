"use client"

import dynamic from "next/dynamic"
import { useUserData } from "@lib/context/user-data-context"

const FreeShippingPriceNudgeInner = dynamic(
  () => import("@modules/shipping/components/free-shipping-price-nudge"),
  { ssr: false }
)
const CartDrawerInner = dynamic(
  () => import("@modules/cart/components/cart-drawer"),
  { ssr: false }
)
const RecentPurchasesTickerInner = dynamic(
  () => import("@modules/common/components/recent-purchases-ticker"),
  { ssr: false }
)
const CartMismatchBannerInner = dynamic(
  () => import("@modules/layout/components/cart-mismatch-banner"),
  { ssr: false }
)

export function ClientRecentPurchasesTicker({ interval }: { interval: number }) {
  return <RecentPurchasesTickerInner interval={interval} />
}

/**
 * Cart/customer-dependent overlay widgets (mismatch banner, free-shipping
 * nudge, cart drawer). Data comes from UserDataProvider (client fetch
 * after mount) so the server render stays cookie-free and ISR-safe.
 */
export function ClientUserWidgets({
  cartDrawerEnabled,
}: {
  cartDrawerEnabled: boolean
}) {
  const { customer, cart, shippingOptions, ready } = useUserData()

  if (!ready) return null

  return (
    <>
      {customer && cart && (
        <CartMismatchBannerInner customer={customer} cart={cart} />
      )}
      {cart && (
        <FreeShippingPriceNudgeInner
          variant="popup"
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}
      {cartDrawerEnabled && <CartDrawerInner cart={cart} />}
    </>
  )
}
