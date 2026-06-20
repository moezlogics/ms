import { clx } from "@medusajs/ui"

import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"

type Size = "default" | "lg"

export default function ProductPrice({
  product,
  variant,
  size = "default",
}: {
  product: HttpTypes.StoreProduct
  variant?: HttpTypes.StoreProductVariant
  /** `lg` = PDP hero size (3xl). `default` = card / cross-sell size (2xl). */
  size?: Size
}) {
  const { cheapestPrice, variantPrice } = getProductPrice({
    product,
    variantId: variant?.id,
  })

  const selectedPrice = variant ? variantPrice : cheapestPrice

  if (!selectedPrice) {
    return <div className="block w-32 h-9 bg-gray-100 animate-pulse" />
  }

  const isSale = selectedPrice.price_type === "sale"
  const priceClass =
    size === "lg"
      ? "text-2xl md:text-[26px] font-bold leading-none"
      : "text-2xl font-bold"

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-center gap-2">
        <span
          className={clx(priceClass, {
            "text-danger": isSale,
            "text-ink": !isSale,
          })}
        >
          {!variant && "From "}
          <span
            data-testid="product-price"
            data-value={selectedPrice.calculated_price_number}
            suppressHydrationWarning
          >
            {selectedPrice.calculated_price}
          </span>
        </span>
        {isSale && selectedPrice.percentage_diff && (
          <span className="inline-flex items-center text-[10px] md:text-[11px] font-bold uppercase tracking-wide bg-danger text-white px-1.5 py-0.5 rounded">
            −{selectedPrice.percentage_diff}% OFF
          </span>
        )}
      </div>
      {isSale && (
        <span
          className="text-xs md:text-[13px] line-through text-ink/50"
          data-testid="original-product-price"
          data-value={selectedPrice.original_price_number}
          suppressHydrationWarning
        >
          {selectedPrice.original_price}
        </span>
      )}
    </div>
  )
}
