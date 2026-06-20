import ItemsTemplate from "./items"
import Summary from "./summary"
import EmptyCartMessage from "../components/empty-cart-message"
import SignInPrompt from "../components/sign-in-prompt"
import CartViewTracker from "@modules/analytics/cart-view-tracker"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

/**
 * Cart page — compact card layout, mobile-first.
 * Desktop: items (left 8) + sticky summary card (right 4).
 * Mobile: items stacked above the summary.
 *
 * `loyaltyBalance` is fetched server-side in the page route and
 * threaded down to the loyalty-redeem widget rendered inside the
 * Summary. Pass `null` for anonymous visitors so the widget shows
 * the sign-in CTA instead of the redeem button.
 */
const CartTemplate = ({
  cart,
  customer,
  loyaltyBalance = null,
}: {
  cart: HttpTypes.StoreCart | null
  customer: HttpTypes.StoreCustomer | null
  loyaltyBalance?: number | null
}) => {
  // Total for the mobile sticky checkout bar. We use `total` (final
  // payable) rather than subtotal so the user sees the same number
  // they'll be charged. Falls back to 0 + currency code if missing.
  const stickyTotal =
    typeof cart?.total === "number" && cart?.currency_code
      ? convertToLocale({
          amount: cart.total,
          currency_code: cart.currency_code,
        })
      : null

  return (
    <div
      className="container-anvogue py-4 md:py-6 pb-32 lg:pb-6"
      data-testid="cart-container"
    >
      {cart?.items?.length ? (
        <>
          <CartViewTracker cart={cart} />

          {/* Page heading */}
          <div className="mb-3 md:mb-5">
            <h1 className="text-lg md:text-xl font-semibold text-ink flex items-center gap-2">
              <i className="ph-fill ph-shopping-bag text-primary text-xl" aria-hidden />
              Your Cart
            </h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6">
            {/* Items */}
            <div className="lg:col-span-8 flex flex-col gap-3">
              {!customer && <SignInPrompt />}
              <ItemsTemplate cart={cart} />
            </div>

            {/* Summary */}
            <div className="lg:col-span-4">
              <div className="lg:sticky lg:top-20">
                {cart && cart.region && (
                  <div className="bg-surface rounded-xl p-4 border border-line shadow-sm">
                    <div className="flex items-center gap-2 mb-4">
                      <i className="ph-fill ph-receipt text-primary text-sm" aria-hidden />
                      <h2 className="text-sm font-semibold text-ink">Order Summary</h2>
                    </div>
                    <Summary cart={cart as any} loyaltyBalance={loyaltyBalance} />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Mobile sticky checkout — sits above the bottom-nav (44px) and
              its safe-area padding. Hidden on lg+ where the right-rail
              Summary card already provides the Checkout button.
              The desktop Summary still owns the canonical CTA — this bar
              just mirrors it on small screens for thumb reach. */}
          <div
            className="lg:hidden fixed inset-x-0 z-30 px-4 pointer-events-none"
            style={{
              bottom:
                "calc(44px + env(safe-area-inset-bottom, 0px) + 6px)",
            }}
          >
            <div className="pointer-events-auto rounded-2xl bg-bg/95 backdrop-blur-xl border border-line/70 shadow-[0_-4px_24px_-6px_rgba(0,0,0,0.12)] px-4 py-3 flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-ink/50 leading-none">
                  Total
                </p>
                <p
                  className="text-base font-bold text-ink mt-1 leading-none truncate"
                  data-testid="mobile-cart-total"
                  suppressHydrationWarning
                >
                  {stickyTotal || "—"}
                </p>
              </div>
              <LocalizedClientLink
                href="/checkout"
                className="shrink-0"
                data-testid="mobile-checkout-button"
              >
                <button
                  type="button"
                  className="h-11 px-6 rounded-full bg-primary text-primary-fg text-sm font-semibold tracking-wide flex items-center gap-2 shadow-[0_6px_20px_-6px_rgb(var(--color-primary)/0.55)] hover:brightness-110 active:scale-[0.98] transition-all"
                >
                  <i className="ph-bold ph-lock-key text-[13px]" aria-hidden />
                  Checkout
                  <i className="ph-bold ph-arrow-right text-[13px]" aria-hidden />
                </button>
              </LocalizedClientLink>
            </div>
          </div>
        </>
      ) : (
        <EmptyCartMessage />
      )}
    </div>
  )
}

export default CartTemplate
