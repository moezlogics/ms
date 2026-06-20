"use client"

import OrderCard from "../order-card"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"

/**
 * Lists the customer's orders, falling back to a friendly empty state.
 *
 * Empty state matches the polished card style used on the dashboard
 * overview (rounded panel + emoji + small CTA pill) so the two screens
 * look like part of the same product. The previous version used the
 * default Medusa <Button> which clashed with the rest of the account
 * theme.
 */
const OrderOverview = ({ orders }: { orders: HttpTypes.StoreOrder[] }) => {
  if (orders?.length) {
    return (
      <div className="flex flex-col gap-y-8 w-full">
        {orders.map((o) => (
          <div
            key={o.id}
            className="border-b border-line pb-6 last:pb-0 last:border-none"
          >
            <OrderCard order={o} />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className="rounded-2xl bg-bg border border-line px-6 py-10 text-center"
      data-testid="no-orders-container"
    >
      <span className="text-4xl block mb-3" aria-hidden>
        🛍️
      </span>
      <h2 className="text-base font-semibold text-ink">No orders yet</h2>
      <p className="mt-1 text-sm text-ink/55 max-w-sm mx-auto">
        When you place your first order it'll show up here. Until then —
        let's go find something nice.
      </p>
      <LocalizedClientLink
        href="/store"
        data-testid="continue-shopping-button"
        className="mt-5 inline-flex items-center gap-1.5 h-9 px-5 rounded-full bg-ink text-bg text-[12px] font-semibold hover:bg-ink/85 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-ink"
      >
        Start shopping
        <i className="ph-bold ph-arrow-right text-[11px]" aria-hidden />
      </LocalizedClientLink>
    </div>
  )
}

export default OrderOverview
