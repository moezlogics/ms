import { clx } from "@medusajs/ui"
import { VariantPrice } from "types/global"

/**
 * Anvogue price row. Shows a strike-through original price next to the sale
 * price when the variant is on sale; otherwise renders the calculated price.
 */
export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) return null

  const isSale = price.price_type === "sale"

  return (
    <div className="flex items-baseline gap-2">
      {isSale && (
        <span
          className="caption1 line-through text-brand-secondary2"
          data-testid="original-price"
        >
          {price.original_price}
        </span>
      )}
      <span
        className={clx(
          "text-title",
          isSale ? "text-brand-red" : "text-brand-black"
        )}
        data-testid="price"
      >
        {price.calculated_price}
      </span>
    </div>
  )
}
