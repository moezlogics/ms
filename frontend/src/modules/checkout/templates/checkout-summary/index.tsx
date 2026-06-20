import ItemsPreviewTemplate from "@modules/cart/templates/preview"
import DiscountCode from "@modules/checkout/components/discount-code"
import CartTotals from "@modules/common/components/cart-totals"
import LoyaltyRedeem from "@modules/cart/components/loyalty-redeem"

/**
 * Checkout summary — compact sticky card on the right column.
 */
const CheckoutSummary = ({ cart, loyaltyBalance }: { cart: any; loyaltyBalance: number | null }) => {
  return (
    <div className="sticky top-20 flex flex-col gap-y-4 py-4 small:py-0">
      <div className="w-full bg-bg rounded-xl border border-line shadow-[0_2px_12px_-4px_rgba(0,0,0,0.06)] overflow-hidden">
        {/* Header */}
        <div className="px-4 py-3 border-b border-line bg-surface/30">
          <h2 className="text-sm font-semibold text-ink flex items-center gap-1.5">
            <i
              className="ph-fill ph-shopping-bag text-primary text-sm"
              aria-hidden
            />
            Order Summary
          </h2>
        </div>

        {/* Items preview */}
        <div className="px-4 py-3 border-b border-line">
          <ItemsPreviewTemplate cart={cart} />
        </div>

        {/* Discount code */}
        <div className="px-4 py-3 border-b border-line">
          <DiscountCode cart={cart} />
        </div>

        {/* Loyalty redeem */}
        <div className="px-4 py-3 border-b border-line">
          <LoyaltyRedeem cart={cart} loyaltyBalance={loyaltyBalance} />
        </div>

        {/* Totals */}
        <div className="px-4 py-3">
          <CartTotals totals={cart} />
        </div>
      </div>

      {/* Security badge */}
      <div className="flex items-center justify-center gap-1.5 text-[10px] text-ink/35">
        <i className="ph-fill ph-lock-key text-[11px]" aria-hidden />
        <span>Secure 256-bit SSL encrypted checkout</span>
      </div>
    </div>
  )
}

export default CheckoutSummary
