"use client"

import { updateLineItem } from "@lib/data/cart"
import { HttpTypes } from "@medusajs/types"
import DeleteButton from "@modules/common/components/delete-button"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LineItemUnitPrice from "@modules/common/components/line-item-unit-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "@modules/products/components/thumbnail"
import { useState } from "react"
import ErrorMessage from "@modules/checkout/components/error-message"
import { useSiteSettings } from "@lib/context/site-settings-context"

type ItemProps = {
  item: HttpTypes.StoreCartLineItem
  type?: "full" | "preview"
  currencyCode: string
}

export default function Item({ item, type = "full", currencyCode }: ItemProps) {
  const { aspectClass: globalAspectClass } = useSiteSettings()
  const [updating, setUpdating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const changeQuantity = async (quantity: number) => {
    setError(null)
    setUpdating(true)
    await updateLineItem({ lineId: item.id, quantity })
      .catch((err) => setError(err.message))
      .finally(() => setUpdating(false))
  }

  const maxQuantity = item.variant?.manage_inventory ? 10 : 10

  if (type === "preview") {
    return (
      <div className="flex items-start gap-3 py-2.5 border-b border-line/50 last:border-b-0" data-testid="product-row">
        <LocalizedClientLink href={`/${item.product_handle}`} className="shrink-0">
          <div className={`w-12 rounded-lg overflow-hidden bg-surface border border-line ${globalAspectClass}`}>
            <Thumbnail thumbnail={item.thumbnail} images={item.variant?.product?.images} size="square" />
          </div>
        </LocalizedClientLink>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-ink truncate" data-testid="product-title">{item.product_title}</p>
          <LineItemOptions variant={item.variant} data-testid="product-variant" />
          <span className="text-[10px] text-ink/50">{item.quantity}×</span>
        </div>
        <LineItemPrice item={item} style="tight" currencyCode={currencyCode} />
      </div>
    )
  }

  // Brand text — best effort: collection title (e.g. "Apple") falls
  // back to product subtitle. Hidden when neither is set.
  const brand =
    (item.variant?.product as any)?.collection?.title ||
    (item.variant?.product as any)?.subtitle ||
    null

  return (
    <div
      className="bg-bg rounded-2xl border border-line shadow-[0_4px_20px_rgba(0,0,0,0.04)] p-3 sm:p-4 flex gap-3 sm:gap-4 items-stretch group"
      data-testid="product-row"
    >
      {/* Thumbnail — neutral surface tile, image floats inside with padding
          so a transparent product PNG doesn't bleed to the card edge. */}
      <LocalizedClientLink
        href={`/${item.product_handle}`}
        className={`shrink-0 w-20 rounded-xl bg-surface border border-line/60 overflow-hidden flex items-center justify-center p-2 ${globalAspectClass}`}
      >
        <Thumbnail
          thumbnail={item.thumbnail}
          images={item.variant?.product?.images}
          size="square"
        />
      </LocalizedClientLink>

      {/* Body */}
      <div className="flex-1 min-w-0 flex flex-col justify-between gap-1">
        {/* Title + brand + variant */}
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <LocalizedClientLink href={`/${item.product_handle}`} className="flex-1 min-w-0">
              <h2
                className="text-sm font-semibold text-ink leading-tight hover:text-primary transition-colors line-clamp-2"
                data-testid="product-title"
              >
                {item.product_title}
              </h2>
            </LocalizedClientLink>
          </div>
          {brand && (
            <p className="text-[11px] font-medium text-primary mt-0.5 truncate">
              {brand}
            </p>
          )}
          <LineItemOptions
            variant={item.variant}
            data-testid="product-variant"
          />
        </div>

        {/* Bottom row — large price (left) · qty stepper · delete (right) */}
        <div className="flex items-center justify-between gap-2 mt-1">
          {/* Price — wraps LineItemPrice so its inner formatting stays
              intact, but bumps the visible figure with our own size. */}
          <div className="text-base font-bold text-ink leading-none [&_*]:text-base [&_*]:font-bold [&_*]:text-ink">
            <LineItemPrice
              item={item}
              style="tight"
              currencyCode={currencyCode}
            />
          </div>

          {/* Qty stepper — circle minus · count · circle plus, gap-3 like the
              reference. Disabled at boundaries; shows "…" while updating. */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              disabled={updating || item.quantity <= 1}
              onClick={() => changeQuantity(item.quantity - 1)}
              aria-label="Decrease quantity"
              className="w-7 h-7 flex items-center justify-center rounded-full border border-line text-ink/70 hover:border-ink/40 hover:text-ink active:scale-90 transition disabled:opacity-30 disabled:hover:border-line"
            >
              <i className="ph-bold ph-minus text-[12px]" aria-hidden />
            </button>
            <span className="text-sm font-semibold text-ink min-w-[16px] text-center tabular-nums">
              {updating ? "…" : item.quantity}
            </span>
            <button
              type="button"
              disabled={updating || item.quantity >= maxQuantity}
              onClick={() => changeQuantity(item.quantity + 1)}
              aria-label="Increase quantity"
              className="w-7 h-7 flex items-center justify-center rounded-full border border-primary text-primary hover:bg-primary hover:text-primary-fg active:scale-90 transition disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-primary"
            >
              <i className="ph-bold ph-plus text-[12px]" aria-hidden />
            </button>

            <DeleteButton
              id={item.id}
              data-testid="product-delete-button"
              className="ml-1 w-7 h-7 flex items-center justify-center rounded-full text-ink/35 hover:text-danger hover:bg-danger/5 transition-colors"
            />
          </div>
        </div>

        <ErrorMessage error={error} data-testid="product-error-message" />
      </div>
    </div>
  )
}
