"use client"

import { setAddressesAndPlace } from "@lib/data/cart"
import compareAddresses from "@lib/util/compare-addresses"
import { HttpTypes } from "@medusajs/types"
import { useToggleState } from "@medusajs/ui"
import BillingAddress from "@modules/checkout/components/billing_address"
import ErrorMessage from "@modules/checkout/components/error-message"
import Payment from "@modules/checkout/components/payment"
import Shipping from "@modules/checkout/components/shipping"
import ShippingAddress from "@modules/checkout/components/shipping-address"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { useActionState } from "react"

type Props = {
  cart: HttpTypes.StoreCart
  customer: HttpTypes.StoreCustomer | null
  shippingMethods: HttpTypes.StoreCartShippingOption[] | null
  paymentMethods: any[]
}

export function CheckoutFormClient({ cart, customer, shippingMethods, paymentMethods }: Props) {
  const { state: sameAsBilling, toggle: toggleSameAsBilling } = useToggleState(
    cart?.shipping_address && cart?.billing_address
      ? compareAddresses(cart?.shipping_address, cart?.billing_address)
      : true
  )

  const [message, formAction, pending] = useActionState(setAddressesAndPlace, null)

  return (
    <form action={formAction} className="w-full pb-24 lg:pb-0">
      {/* ── Contact & Shipping Address ── */}
      <div className="flex items-center justify-between mb-5">
        <h2 className="text-[13px] font-semibold text-ink tracking-wide uppercase">Contact</h2>
        <LocalizedClientLink
          href="/account?return_to=/checkout"
          className="text-xs text-primary hover:underline"
        >
          Have an account? Log in
        </LocalizedClientLink>
      </div>

      <ShippingAddress
        customer={customer}
        cart={cart}
        checked={sameAsBilling}
        onChange={toggleSameAsBilling}
      />

      {!sameAsBilling && (
        <div className="mt-6">
          <h3 className="text-[13px] font-semibold text-ink mb-3">Billing address</h3>
          <BillingAddress cart={cart} />
        </div>
      )}

      <hr className="border-line my-6" />

      {/* ── Shipping Method ── */}
      <h2 className="text-[13px] font-semibold text-ink tracking-wide uppercase mb-4">
        Shipping method
      </h2>
      <Shipping cart={cart} availableShippingMethods={shippingMethods} />

      <hr className="border-line my-6" />

      {/* ── Payment ── */}
      <h2 className="text-[13px] font-semibold text-ink tracking-wide uppercase mb-1">Payment</h2>
      <p className="text-xs text-ink/50 mb-4">All transactions are secure and encrypted.</p>
      <Payment cart={cart} availablePaymentMethods={paymentMethods} />

      {/* ── Error + bottom actions ── */}
      <ErrorMessage error={message} data-testid="checkout-error" />

      <div className="flex items-center justify-between mt-8 pt-4 border-t border-line">
        <LocalizedClientLink
          href="/cart"
          className="text-sm text-ink/55 flex items-center gap-1.5 hover:text-ink transition-colors"
        >
          <i className="ph-bold ph-caret-left text-[10px]" aria-hidden />
          Return to cart
        </LocalizedClientLink>

        <button
          type="submit"
          disabled={pending}
          data-testid="submit-order-button"
          className="h-12 px-8 rounded-full bg-primary text-primary-fg text-sm font-semibold flex items-center gap-2 shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.5)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:brightness-100 disabled:active:scale-100"
        >
          {pending ? (
            <>
              <i className="ph-bold ph-spinner animate-spin text-sm" aria-hidden />
              Processing…
            </>
          ) : (
            <>
              <i className="ph-fill ph-lock-key text-[13px]" aria-hidden />
              Complete order
            </>
          )}
        </button>
      </div>

      {/* ── Mobile Sticky CTA ── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-line p-4 flex items-center justify-between shadow-[0_-4px_12px_rgba(0,0,0,0.05)]">
        <div className="flex flex-col">
          <span className="text-xs text-ink/50 uppercase font-semibold tracking-wider">Total</span>
          <span className="text-lg font-bold text-ink">
            {convertToLocale({ amount: cart.total ?? 0, currency_code: cart.currency_code })}
          </span>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="h-11 px-6 rounded-full bg-primary text-primary-fg text-sm font-semibold flex items-center gap-2 shadow-[0_6px_18px_-6px_rgb(var(--color-primary)/0.5)] hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {pending ? (
            <>
              <i className="ph-bold ph-spinner animate-spin text-sm" aria-hidden />
              Processing…
            </>
          ) : (
            <>
              <i className="ph-fill ph-lock-key text-[13px]" aria-hidden />
              Complete order
            </>
          )}
        </button>
      </div>
    </form>
  )
}
