"use client"

import { convertToLocale } from "@lib/util/money"
import React from "react"

type CartTotalsProps = {
  totals: {
    total?: number | null
    subtotal?: number | null
    tax_total?: number | null
    currency_code: string
    item_subtotal?: number | null
    shipping_subtotal?: number | null
    discount_subtotal?: number | null
    /** Original total before discounts — used for savings calculation */
    original_item_subtotal?: number | null
    shipping_methods?: any[] | null
  }
}

const CartTotals: React.FC<CartTotalsProps> = ({ totals }) => {
  const {
    currency_code,
    total,
    tax_total,
    item_subtotal,
    shipping_subtotal,
    discount_subtotal,
    original_item_subtotal,
    shipping_methods,
  } = totals

  const hasShippingMethod = Array.isArray(shipping_methods) && shipping_methods.length > 0
  const isFreeShipping = hasShippingMethod && (shipping_subtotal ?? 0) === 0
  const hasDiscount = !!discount_subtotal && discount_subtotal > 0

  // Calculate total savings (discount + free shipping equivalent)
  const totalSavings = discount_subtotal ?? 0
  const savingsPercent =
    original_item_subtotal && original_item_subtotal > 0 && totalSavings > 0
      ? Math.round((totalSavings / original_item_subtotal) * 100)
      : item_subtotal && item_subtotal > 0 && totalSavings > 0
      ? Math.round((totalSavings / (item_subtotal + totalSavings)) * 100)
      : 0

  return (
    <div>
      <div className="flex flex-col gap-y-2.5 text-sm text-ink/70">
        {/* Subtotal */}
        <div className="flex items-center justify-between">
          <span>Subtotal</span>
          <span
            className="font-medium text-ink"
            data-testid="cart-subtotal"
            data-value={item_subtotal || 0}
          >
            {convertToLocale({ amount: item_subtotal ?? 0, currency_code })}
          </span>
        </div>

        {/* Discount — green highlight */}
        {hasDiscount && (
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <i
                className="ph-fill ph-tag text-[12px] text-success"
                aria-hidden
              />
              Discount
            </span>
            <span
              className="font-semibold text-success"
              data-testid="cart-discount"
              data-value={discount_subtotal || 0}
            >
              −{" "}
              {convertToLocale({
                amount: discount_subtotal ?? 0,
                currency_code,
              })}
            </span>
          </div>
        )}

        {/* Shipping — green "FREE" badge when free */}
        <div className="flex items-center justify-between">
          <span>Shipping</span>
          <span data-testid="cart-shipping" data-value={shipping_subtotal || 0}>
            {!hasShippingMethod ? (
              <span className="text-ink/45 italic">
                Calculated at checkout
              </span>
            ) : isFreeShipping ? (
              <span className="inline-flex items-center gap-1 font-semibold text-success">
                <i
                  className="ph-fill ph-check-circle text-[13px]"
                  aria-hidden
                />
                FREE
              </span>
            ) : (
              <span className="font-medium text-ink">
                {convertToLocale({
                  amount: shipping_subtotal ?? 0,
                  currency_code,
                })}
              </span>
            )}
          </span>
        </div>

        {/* Taxes */}
        <div className="flex items-center justify-between">
          <span>Taxes</span>
          <span
            className="font-medium text-ink"
            data-testid="cart-taxes"
            data-value={tax_total || 0}
          >
            {convertToLocale({ amount: tax_total ?? 0, currency_code })}
          </span>
        </div>
      </div>

      {/* Divider */}
      <div className="h-px w-full bg-line my-4" />

      {/* Total */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-base font-semibold text-ink">Total</span>
        <span
          className="text-xl font-bold text-ink"
          data-testid="cart-total"
          data-value={total || 0}
        >
          {convertToLocale({ amount: total ?? 0, currency_code })}
        </span>
      </div>

      {/* Savings highlight — green banner */}
      {totalSavings > 0 && (
        <div className="mt-3 flex items-center gap-2 px-3.5 py-2.5 rounded-xl bg-success/10 border border-success/20">
          <span className="flex items-center justify-center w-7 h-7 rounded-full bg-success/20 shrink-0">
            <i
              className="ph-fill ph-confetti text-[14px] text-success"
              aria-hidden
            />
          </span>
          <div className="text-[13px] text-success font-semibold">
            You&apos;re saving{" "}
            {convertToLocale({ amount: totalSavings, currency_code })}
            {savingsPercent > 0 && ` (${savingsPercent}% off)`} on this order!
            🎉
          </div>
        </div>
      )}

      <div className="h-px w-full bg-line mt-4" />
    </div>
  )
}

export default CartTotals
