"use client"

import CartTotals from "@modules/common/components/cart-totals"
import DiscountCode from "@modules/checkout/components/discount-code"
import LoyaltyRedeem from "@modules/cart/components/loyalty-redeem"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

type SummaryProps = {
  cart: HttpTypes.StoreCart & { promotions: HttpTypes.StorePromotion[] }
  /**
   * Customer's current loyalty balance, or null when not signed in.
   * The redeem widget reads this and decides which state to render.
   */
  loyaltyBalance?: number | null
}

export default function Summary({ cart, loyaltyBalance = null }: SummaryProps) {
  const hasAddress = !!(cart?.shipping_address?.address_1 && cart?.email)
  const hasShipping = (cart?.shipping_methods?.length ?? 0) > 0
  const checkoutHref = hasAddress && hasShipping ? "/checkout" : "/checkout"

  return (
    <div className="flex flex-col gap-4">
      {/* Loyalty — let the user spend points before they enter codes */}
      <LoyaltyRedeem cart={cart} loyaltyBalance={loyaltyBalance} />

      {/* Discount */}
      <DiscountCode cart={cart} />

      <div className="border-t border-line/60" />

      {/* Totals */}
      <CartTotals totals={cart} />

      {/* CTA */}
      <LocalizedClientLink href={checkoutHref} data-testid="checkout-button">
        <button
          type="button"
          className="w-full h-12 rounded-full bg-primary text-primary-fg text-sm font-semibold tracking-wide flex items-center justify-center gap-2 shadow-[0_6px_20px_-6px_rgb(var(--color-primary)/0.45)] hover:brightness-110 active:scale-[0.98] transition-all"
        >
          <i className="ph-bold ph-lock-key text-[13px]" aria-hidden />
          Checkout
          <i className="ph-bold ph-arrow-right text-[13px]" aria-hidden />
        </button>
      </LocalizedClientLink>

      <p className="text-[10px] text-ink/40 text-center flex items-center justify-center gap-1">
        <i className="ph-fill ph-shield-check text-[11px]" aria-hidden />
        Secure SSL encrypted checkout
      </p>
    </div>
  )
}
