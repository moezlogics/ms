"use client"

import React from "react"

type PaymentWrapperProps = {
  cart: any
  children: React.ReactNode
}

/**
 * Payment wrapper — simplified after Stripe removal.
 * Just renders children directly.
 */
const PaymentWrapper: React.FC<PaymentWrapperProps> = ({ children }) => {
  return <div>{children}</div>
}

export default PaymentWrapper
