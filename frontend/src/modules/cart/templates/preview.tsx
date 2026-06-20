"use client"

import { HttpTypes } from "@medusajs/types"
import Item from "@modules/cart/components/item"

type ItemsTemplateProps = {
  cart: HttpTypes.StoreCart
}

export default function ItemsPreviewTemplate({ cart }: ItemsTemplateProps) {
  const items = cart.items
  const hasOverflow = items && items.length > 4

  return (
    <div
      className={hasOverflow ? "overflow-y-auto max-h-[360px] overscroll-contain" : ""}
      data-testid="items-table"
    >
      {items
        ? [...items]
            .sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))
            .map((item) => (
              <Item
                key={item.id}
                item={item}
                type="preview"
                currencyCode={cart.currency_code}
              />
            ))
        : Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3 py-2.5 border-b border-line/50 animate-pulse">
              <div className="w-12 h-12 rounded-lg bg-surface" />
              <div className="flex-1 space-y-1.5 py-0.5">
                <div className="h-2.5 bg-surface rounded w-3/4" />
                <div className="h-2 bg-surface rounded w-1/2" />
              </div>
            </div>
          ))}
    </div>
  )
}
