import { Button } from "@medusajs/ui"
import { useMemo } from "react"

import Thumbnail from "@modules/products/components/thumbnail"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"
import ReorderButton from "../reorder-button"

type OrderCardProps = {
  order: HttpTypes.StoreOrder
}

const OrderCard = ({ order }: OrderCardProps) => {
  const numberOfLines = useMemo(() => {
    return (
      order.items?.reduce((acc, item) => {
        return acc + item.quantity
      }, 0) ?? 0
    )
  }, [order])

  const numberOfProducts = useMemo(() => {
    return order.items?.length ?? 0
  }, [order])

  return (
    <div
      className="bg-bg border border-line rounded-xl p-4 flex flex-col gap-4"
      data-testid="order-card"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-ink">
            Order #<span data-testid="order-display-id">{order.display_id}</span>
          </div>
          <div className="flex items-center gap-2 text-[12px] text-ink/55 mt-0.5">
            <span data-testid="order-created-at">
              {new Date(order.created_at).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                year: "numeric",
              })}
            </span>
            <span>•</span>
            <span data-testid="order-amount">
              {convertToLocale({
                amount: order.total,
                currency_code: order.currency_code,
              })}
            </span>
            <span>•</span>
            <span>{`${numberOfLines} ${
              numberOfLines > 1 ? "items" : "item"
            }`}</span>
          </div>
        </div>
      </div>

      {/* Items preview */}
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
        {order.items?.slice(0, 3).map((i) => {
          return (
            <div
              key={i.id}
              className="flex flex-col gap-y-1.5"
              data-testid="order-item"
            >
              <div className="rounded-lg overflow-hidden border border-line">
                <Thumbnail thumbnail={i.thumbnail} images={[]} size="full" />
              </div>
              <div className="flex items-center text-[11px] text-ink/70">
                <span
                  className="font-medium truncate"
                  data-testid="item-title"
                >
                  {i.title}
                </span>
                <span className="ml-1 shrink-0">×</span>
                <span data-testid="item-quantity" className="shrink-0">
                  {i.quantity}
                </span>
              </div>
            </div>
          )
        })}
        {numberOfProducts > 3 && (
          <div className="w-full h-full flex flex-col items-center justify-center rounded-lg bg-surface border border-line">
            <span className="text-sm font-semibold text-ink/60">
              +{numberOfProducts - 3}
            </span>
            <span className="text-[11px] text-ink/40">more</span>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 pt-1">
        <LocalizedClientLink
          href={`/account/orders/details/${order.id}`}
          className="flex-1"
        >
          <Button
            data-testid="order-details-link"
            variant="secondary"
            className="w-full rounded-lg"
          >
            See details
          </Button>
        </LocalizedClientLink>
        <ReorderButton order={order} />
      </div>
    </div>
  )
}

export default OrderCard
