"use client"

import dynamic from "next/dynamic"
import { StoreCart, StoreCartShippingOption, StoreCustomer } from "@medusajs/types"

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

export function ClientFreeShippingNudge({
  cart,
  shippingOptions,
}: {
  cart: StoreCart
  shippingOptions: StoreCartShippingOption[]
}) {
  return (
    <FreeShippingPriceNudgeInner
      variant="popup"
      cart={cart}
      shippingOptions={shippingOptions}
    />
  )
}

export function ClientCartDrawer({ cart }: { cart: StoreCart | null }) {
  return <CartDrawerInner cart={cart} />
}

export function ClientRecentPurchasesTicker({ interval }: { interval: number }) {
  return <RecentPurchasesTickerInner interval={interval} />
}

export function ClientCartMismatchBanner({
  customer,
  cart,
}: {
  customer: StoreCustomer
  cart: StoreCart
}) {
  return <CartMismatchBannerInner customer={customer} cart={cart} />
}
