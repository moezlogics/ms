"use client"

import { setAddresses } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import React, { useActionState } from "react"
import ErrorMessage from "../error-message"
import ShippingAddress from "../shipping-address"

/**
 * Single-page checkout — address section.
 * Always visible. No step-URL logic.
 */
const Addresses = ({
  cart,
  customer,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
}) => {
  const [message, formAction] = useActionState(setAddresses, null)
  const formRef = React.useRef<HTMLFormElement>(null)

  const handleBlur = (e: React.FocusEvent<HTMLFormElement>) => {
    // If focus leaves the form entirely, submit it
    if (!e.currentTarget.contains(e.relatedTarget)) {
      formRef.current?.requestSubmit()
    }
  }

  return (
    <div>
      {/* Section header */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-xl font-semibold text-ink">
          Contact &amp; Delivery
        </h3>
      </div>

      <form action={formAction} ref={formRef} onBlur={handleBlur}>
        <ShippingAddress
          customer={customer}
          cart={cart}
        />

        <ErrorMessage error={message} data-testid="address-error-message" />
      </form>
    </div>
  )
}

export default Addresses
