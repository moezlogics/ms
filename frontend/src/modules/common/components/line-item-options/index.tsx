import { HttpTypes } from "@medusajs/types"

type LineItemOptionsProps = {
  variant: HttpTypes.StoreProductVariant | undefined
  "data-testid"?: string
  "data-value"?: HttpTypes.StoreProductVariant
}

const LineItemOptions = ({
  variant,
  "data-testid": dataTestid,
  "data-value": dataValue,
}: LineItemOptionsProps) => {
  if (!variant?.title) return null

  return (
    <p
      data-testid={dataTestid}
      className="text-[11px] text-ink/50 truncate"
    >
      {variant.title}
    </p>
  )
}

export default LineItemOptions
