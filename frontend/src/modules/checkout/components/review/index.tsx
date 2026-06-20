"use client"

import PaymentButton from "../payment-button"

/**
 * Review section — single-page checkout style.
 * Always renders. Place Order button activates once all steps are complete.
 */
const Review = ({ cart }: { cart: any }) => {
  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  const previousStepsCompleted =
    !!(cart?.shipping_address?.address_1) &&
    !!(cart?.email) &&
    (cart?.shipping_methods?.length ?? 0) > 0 &&
    !!(cart?.payment_collection || paidByGiftcard)

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <h3
          className={`text-xl font-semibold ${
            previousStepsCompleted ? "text-ink" : "text-ink/40"
          }`}
        >
          Place Order
        </h3>
      </div>

      <div>
        <p className="text-xs text-ink/55 leading-relaxed mb-4">
          By clicking <strong>Place Order</strong> you confirm that you have read and
          accept our Terms of Use, Terms of Sale, Returns Policy and Privacy Policy.
        </p>

        <PaymentButton cart={cart} data-testid="submit-order-button" />
      </div>
    </div>
  )
}

export default Review
