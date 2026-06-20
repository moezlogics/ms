"use client"

import { convertToLocale } from "@lib/util/money"
import { CheckCircleSolid, XMark } from "@medusajs/icons"
import {
  HttpTypes,
  StoreCart,
  StoreCartShippingOption,
  StorePrice,
} from "@medusajs/types"
import { Button, clx } from "@medusajs/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { useState } from "react"
import { StoreFreeShippingPrice } from "types/global"

const computeTarget = (
  cart: HttpTypes.StoreCart,
  price: HttpTypes.StorePrice
) => {
  const priceRule = (price.price_rules || []).find(
    (pr) => pr.attribute === "item_total"
  )!

  const currentAmount = cart.item_total
  const targetAmount = parseFloat(priceRule.value)

  if (priceRule.operator === "gt") {
    return {
      current_amount: currentAmount,
      target_amount: targetAmount,
      target_reached: currentAmount > targetAmount,
      target_remaining:
        currentAmount > targetAmount ? 0 : targetAmount + 1 - currentAmount,
      remaining_percentage: Math.min(
        (currentAmount / targetAmount) * 100,
        100
      ),
    }
  } else if (priceRule.operator === "gte") {
    return {
      current_amount: currentAmount,
      target_amount: targetAmount,
      target_reached: currentAmount > targetAmount,
      target_remaining:
        currentAmount > targetAmount ? 0 : targetAmount - currentAmount,
      remaining_percentage: Math.min(
        (currentAmount / targetAmount) * 100,
        100
      ),
    }
  } else if (priceRule.operator === "lt") {
    return {
      current_amount: currentAmount,
      target_amount: targetAmount,
      target_reached: targetAmount > currentAmount,
      target_remaining:
        targetAmount > currentAmount ? 0 : currentAmount + 1 - targetAmount,
      remaining_percentage: Math.min(
        (currentAmount / targetAmount) * 100,
        100
      ),
    }
  } else if (priceRule.operator === "lte") {
    return {
      current_amount: currentAmount,
      target_amount: targetAmount,
      target_reached: targetAmount > currentAmount,
      target_remaining:
        targetAmount > currentAmount ? 0 : currentAmount - targetAmount,
      remaining_percentage: Math.min(
        (currentAmount / targetAmount) * 100,
        100
      ),
    }
  } else {
    return {
      current_amount: currentAmount,
      target_amount: targetAmount,
      target_reached: currentAmount === targetAmount,
      target_remaining:
        targetAmount > currentAmount ? 0 : targetAmount - currentAmount,
      remaining_percentage: Math.min(
        (currentAmount / targetAmount) * 100,
        100
      ),
    }
  }
}

export default function ShippingPriceNudge({
  variant = "inline",
  cart,
  shippingOptions,
}: {
  variant?: "popup" | "inline"
  cart: StoreCart
  shippingOptions: StoreCartShippingOption[]
}) {
  if (!cart || !shippingOptions?.length) {
    return
  }

  // Check if any shipping options have a conditional price based on item_total
  const freeShippingPrice = shippingOptions
    .map((shippingOption) => {
      const calculatedPrice = shippingOption.calculated_price

      if (!calculatedPrice) {
        return
      }

      // Get all prices that are:
      // 1. Currency code is same as the cart's
      // 2. Have a rule that is set on item_total
      const validCurrencyPrices = shippingOption.prices.filter(
        (price) =>
          price.currency_code === cart.currency_code &&
          (price.price_rules || []).some(
            (priceRule) => priceRule.attribute === "item_total"
          )
      )

      return validCurrencyPrices.map((price) => {
        return {
          ...price,
          shipping_option_id: shippingOption.id,
          ...computeTarget(cart, price),
        }
      })
    })
    .flat(1)
    .filter(Boolean)
    // We focus here entirely on free shipping, but this can be edited to handle multiple layers
    // of reduced shipping prices.
    .find((price) => price?.amount === 0)

  if (!freeShippingPrice) {
    return
  }

  if (variant === "popup") {
    return <FreeShippingPopup cart={cart} price={freeShippingPrice} />
  } else {
    return <FreeShippingInline cart={cart} price={freeShippingPrice} />
  }
}

function FreeShippingInline({
  cart,
  price,
}: {
  cart: StoreCart
  price: StorePrice & {
    target_reached: boolean
    target_remaining: number
    remaining_percentage: number
  }
}) {
  return (
    <div className="p-3.5 rounded-xl border border-line bg-surface/60 backdrop-blur-sm">
      <div className="space-y-2.5">
        {/* Status text */}
        <div className="flex items-center justify-between text-[13px]">
          <div className="flex items-center gap-2">
            {price.target_reached ? (
              <>
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-success/15">
                  <i
                    className="ph-fill ph-check-circle text-[14px] text-success"
                    aria-hidden
                  />
                </span>
                <span className="font-semibold text-success">
                  Free Shipping unlocked! 🎉
                </span>
              </>
            ) : (
              <>
                <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10">
                  <i
                    className="ph-fill ph-truck text-[13px] text-primary"
                    aria-hidden
                  />
                </span>
                <span className="font-medium text-ink/70">
                  Add{" "}
                  <span className="font-bold text-ink">
                    {convertToLocale({
                      amount: price.target_remaining,
                      currency_code: cart.currency_code,
                    })}
                  </span>{" "}
                  for{" "}
                  <span className="font-bold text-success">FREE shipping</span>
                </span>
              </>
            )}
          </div>
          {!price.target_reached && (
            <span className="text-[11px] text-ink/50 font-medium">
              {Math.round(price.remaining_percentage)}%
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="relative h-2 rounded-full bg-line/80 overflow-hidden">
          <div
            className={clx(
              "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
              price.target_reached
                ? "bg-gradient-to-r from-success/80 to-success"
                : "bg-gradient-to-r from-primary/70 to-primary"
            )}
            style={{ width: `${Math.min(price.remaining_percentage, 100)}%` }}
          />
          {/* Shimmer effect when not complete */}
          {!price.target_reached && (
            <div
              className="absolute inset-y-0 left-0 rounded-full animate-pulse bg-white/20"
              style={{
                width: `${Math.min(price.remaining_percentage, 100)}%`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function FreeShippingPopup({
  cart,
  price,
}: {
  cart: StoreCart
  price: StoreFreeShippingPrice
}) {
  const [isClosed, setIsClosed] = useState(false)

  return (
    <div
      className={clx(
        "fixed bottom-20 sm:bottom-6 right-4 sm:right-6 flex flex-col items-end gap-2 transition-all duration-500 ease-in-out z-[55]",
        {
          "opacity-0 invisible delay-1000": price.target_reached,
          "opacity-0 invisible": isClosed,
          "opacity-100 visible": !price.target_reached && !isClosed,
        }
      )}
    >
      {/* Close button */}
      <button
        className="w-7 h-7 rounded-full bg-ink/80 hover:bg-ink text-bg flex items-center justify-center backdrop-blur-sm transition-colors shadow-lg"
        onClick={() => setIsClosed(true)}
        aria-label="Close"
      >
        <i className="ph ph-x text-[12px]" aria-hidden />
      </button>

      {/* Card */}
      <div className="w-[340px] sm:w-[380px] bg-bg/95 backdrop-blur-xl border border-line rounded-2xl shadow-[0_20px_50px_-12px_rgba(0,0,0,0.2)] overflow-hidden">
        <div className="p-4">
          <div className="space-y-3">
            {/* Status */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-[13px]">
                {price.target_reached ? (
                  <>
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-success/15">
                      <i
                        className="ph-fill ph-check-circle text-[15px] text-success"
                        aria-hidden
                      />
                    </span>
                    <span className="font-semibold text-success">
                      Free Shipping unlocked! 🎉
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 animate-pulse">
                      <i
                        className="ph-fill ph-truck text-[14px] text-primary"
                        aria-hidden
                      />
                    </span>
                    <span className="font-medium text-ink/80">
                      <span className="font-bold text-ink">
                        {convertToLocale({
                          amount: price.target_remaining,
                          currency_code: cart.currency_code,
                        })}
                      </span>{" "}
                      away from{" "}
                      <span className="font-bold text-success">
                        FREE shipping
                      </span>
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Progress bar */}
            <div className="relative h-2.5 rounded-full bg-line/60 overflow-hidden">
              <div
                className={clx(
                  "absolute inset-y-0 left-0 rounded-full transition-all duration-700 ease-out",
                  price.target_reached
                    ? "bg-gradient-to-r from-success/80 to-success"
                    : "bg-gradient-to-r from-primary/70 via-primary to-accent"
                )}
                style={{
                  width: `${Math.min(price.remaining_percentage, 100)}%`,
                }}
              />
            </div>
          </div>
        </div>

        {/* Action buttons */}
        <div className="px-4 pb-4 grid grid-cols-2 gap-2">
          <LocalizedClientLink
            href="/cart"
            className="h-10 inline-flex items-center justify-center rounded-full border border-line text-ink text-[13px] font-semibold hover:bg-surface transition-colors"
          >
            View Cart
          </LocalizedClientLink>
          <LocalizedClientLink
            href="/store"
            className="h-10 inline-flex items-center justify-center rounded-full bg-primary text-primary-fg text-[13px] font-semibold hover:brightness-110 transition-all shadow-[0_4px_14px_-4px_rgb(var(--color-primary)/0.4)]"
          >
            Keep Shopping
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}
