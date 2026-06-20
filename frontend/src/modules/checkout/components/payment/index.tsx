"use client"

import { RadioGroup } from "@headlessui/react"
import { isManual, paymentInfoMap } from "@lib/constants"
import { initiatePaymentSession } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import ErrorMessage from "@modules/checkout/components/error-message"
import PaymentContainer from "@modules/checkout/components/payment-container"
import { useEffect, useState } from "react"

/**
 * Payment section — single-page checkout style.
 * Always visible. Auto-initiates session when method is selected.
 */
const Payment = ({
  cart,
  availablePaymentMethods,
}: {
  cart: any
  availablePaymentMethods: any[]
}) => {
  const activeSession = cart.payment_collection?.payment_sessions?.find(
    (s: any) => s.status === "pending"
  )

  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(
    activeSession?.provider_id ?? ""
  )

  const paidByGiftcard =
    cart?.gift_cards && cart?.gift_cards?.length > 0 && cart?.total === 0

  // Auto-initiate when method changes
  const handleSelectMethod = async (method: string) => {
    if (!method || method === activeSession?.provider_id) {
      setSelectedPaymentMethod(method)
      return
    }
    setError(null)
    setSelectedPaymentMethod(method)
    setIsLoading(true)
    try {
      await initiatePaymentSession(cart, { provider_id: method })
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-select first method on mount if none active
  useEffect(() => {
    if (!selectedPaymentMethod && availablePaymentMethods?.length > 0) {
      handleSelectMethod(availablePaymentMethods[0].id)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availablePaymentMethods])

  return (
    <div>
      {paidByGiftcard ? (
        <div className="rounded-xl border border-success/30 bg-success/5 p-3 text-sm text-ink">
          <i className="ph-fill ph-gift text-success mr-1.5" aria-hidden />
          Paid in full by gift card
        </div>
      ) : (
        <div>
          {availablePaymentMethods?.length > 0 && (
            <RadioGroup
              value={selectedPaymentMethod}
              onChange={(value: string) => handleSelectMethod(value)}
            >
              {availablePaymentMethods.map((paymentMethod) => (
                <div key={paymentMethod.id} className="mb-2">
                  <PaymentContainer
                    paymentInfoMap={paymentInfoMap}
                    paymentProviderId={paymentMethod.id}
                    selectedPaymentOptionId={selectedPaymentMethod}
                  />
                </div>
              ))}
            </RadioGroup>
          )}

          {isLoading && (
            <p className="text-xs text-ink/50 flex items-center gap-1 mt-2">
              <i className="ph-bold ph-spinner animate-spin text-xs" aria-hidden />
              Initialising payment…
            </p>
          )}

          <ErrorMessage error={error} data-testid="payment-method-error-message" />
        </div>
      )}
    </div>
  )
}

export default Payment
