import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type ShippingDetailsProps = {
  order: HttpTypes.StoreOrder
  hideHeading?: boolean
}

const ShippingDetails = ({ order, hideHeading = false }: ShippingDetailsProps) => {
  return (
    <div className="w-full">
      {!hideHeading && (
        <h3 className="text-base font-bold text-ink mb-4 flex items-center gap-2">
          <i className="ph-bold ph-truck text-lg text-primary" aria-hidden />
          Delivery Details
        </h3>
      )}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
        <div data-testid="shipping-address-summary" className="space-y-1.5">
          <h4 className="font-bold text-ink/40 text-xs uppercase tracking-wider">Shipping Address</h4>
          <div className="text-ink font-medium leading-relaxed bg-surface-alt/20 p-4 rounded-2xl border border-line/35 shadow-sm">
            <p className="font-bold text-sm text-ink">{order.shipping_address?.first_name} {order.shipping_address?.last_name}</p>
            <p className="text-xs mt-0.5 text-ink/80">{order.shipping_address?.address_1}</p>
            {order.shipping_address?.address_2 && <p className="text-xs text-ink/80">{order.shipping_address?.address_2}</p>}
            <p className="text-xs text-ink/80">{order.shipping_address?.postal_code} {order.shipping_address?.city}</p>
            <p className="text-[10px] text-primary mt-1.5 uppercase font-bold tracking-wider">{order.shipping_address?.country_code?.toUpperCase()}</p>
          </div>
        </div>

        <div className="space-y-4">
          <div data-testid="shipping-contact-summary" className="space-y-1.5">
            <h4 className="font-bold text-ink/40 text-xs uppercase tracking-wider">Contact</h4>
            <div className="text-ink font-medium bg-surface-alt/20 p-4 rounded-2xl border border-line/35 shadow-sm space-y-2">
              <p className="flex items-center gap-2 text-xs font-mono text-ink/95">
                <i className="ph-bold ph-phone text-primary text-sm shrink-0" aria-hidden />
                {order.shipping_address?.phone || "No phone provided"}
              </p>
              <p className="flex items-center gap-2 text-xs text-ink/95 truncate">
                <i className="ph-bold ph-envelope text-primary text-sm shrink-0" aria-hidden />
                {order.email}
              </p>
            </div>
          </div>

          <div data-testid="shipping-method-summary" className="space-y-1.5">
            <h4 className="font-bold text-ink/40 text-xs uppercase tracking-wider">Shipping Method</h4>
            <div className="text-ink font-medium bg-surface-alt/20 p-4 rounded-2xl border border-line/35 shadow-sm flex justify-between items-center">
              <span className="text-xs font-bold text-ink">{(order as any).shipping_methods?.[0]?.name || "Standard Delivery"}</span>
              <span className="text-xs font-semibold bg-primary/10 text-primary px-3 py-1 rounded-full border border-primary/20">
                {convertToLocale({
                  amount: order.shipping_methods?.[0]?.total ?? 0,
                  currency_code: order.currency_code,
                })}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShippingDetails

