"use client"

import { placeOrder } from "@lib/data/cart"
import React, { useState } from "react"
import ErrorMessage from "../error-message"
import { HttpTypes } from "@medusajs/types"

type PaymentButtonProps = {
  cart: HttpTypes.StoreCart
  "data-testid": string
}

const PaymentButton: React.FC<PaymentButtonProps> = ({ cart, "data-testid": dataTestId }) => {
  const notReady =
    !cart ||
    !cart.shipping_address ||
    !cart.billing_address ||
    !cart.email ||
    (cart.shipping_methods?.length ?? 0) < 1

  return <DefaultPaymentButton notReady={notReady} data-testid={dataTestId} />
}

const DefaultPaymentButton = ({
  notReady,
  "data-testid": dataTestId,
}: {
  notReady: boolean
  "data-testid"?: string
}) => {
  const [submitting, setSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const handlePayment = async () => {
    setSubmitting(true)
    await placeOrder()
      .catch((err) => setErrorMessage(err.message))
      .finally(() => setSubmitting(false))
  }

  return (
    <>
      <button
        type="button"
        disabled={notReady || submitting}
        onClick={handlePayment}
        data-testid={dataTestId || "submit-order-button"}
        className="w-full h-12 rounded-full bg-primary text-primary-fg text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.5)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100"
      >
        {submitting ? (
          <>
            <i className="ph-bold ph-spinner animate-spin text-sm" aria-hidden />
            Processing…
          </>
        ) : (
          <>
            <i className="ph-fill ph-lock-key text-[13px]" aria-hidden />
            Place Order
          </>
        )}
      </button>
      <ErrorMessage error={errorMessage} data-testid="payment-error-message" />
    </>
  )
}

export default PaymentButton
