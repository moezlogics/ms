import { HttpTypes } from "@medusajs/types"
import { Text } from "@medusajs/ui"

type OrderDetailsProps = {
  order: HttpTypes.StoreOrder
  showStatus?: boolean
}

const OrderDetails = ({ order, showStatus }: OrderDetailsProps) => {
  const formatStatus = (str: string) => {
    if (!str) return "N/A"
    const formatted = str.split("_").join(" ")

    return formatted.slice(0, 1).toUpperCase() + formatted.slice(1)
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 text-sm">
        {/* Order Number */}
        <div className="flex flex-col gap-1">
          <span className="text-ink/40 text-xs font-semibold uppercase tracking-wider">Order Number</span>
          <span className="font-semibold text-ink font-mono text-base">
            #<span data-testid="order-id">{order.display_id}</span>
          </span>
        </div>

        {/* Order Date */}
        <div className="flex flex-col gap-1">
          <span className="text-ink/40 text-xs font-semibold uppercase tracking-wider">Order Date</span>
          <span className="font-semibold text-ink" data-testid="order-date">
            {new Date(order.created_at).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </span>
        </div>

        {/* Email */}
        <div className="flex flex-col gap-1">
          <span className="text-ink/40 text-xs font-semibold uppercase tracking-wider">Confirmation Email</span>
          <span className="font-semibold text-ink truncate" data-testid="order-email">
            {order.email}
          </span>
        </div>

        {showStatus && (
          <>
            {/* Order Status */}
            <div className="flex flex-col gap-1">
              <span className="text-ink/40 text-xs font-semibold uppercase tracking-wider">Fulfillment Status</span>
              <span className="font-semibold text-ink" data-testid="order-status">
                {formatStatus(order.fulfillment_status)}
              </span>
            </div>

            {/* Payment Status */}
            <div className="flex flex-col gap-1">
              <span className="text-ink/40 text-xs font-semibold uppercase tracking-wider">Payment Status</span>
              <span className="font-semibold text-ink" data-testid="order-payment-status">
                {formatStatus(order.payment_status)}
              </span>
            </div>
          </>
        )}
      </div>
    </div>
  )
}

export default OrderDetails
