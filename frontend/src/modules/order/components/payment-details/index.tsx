import { paymentInfoMap } from "@lib/constants"
import { convertToLocale } from "@lib/util/money"
import { HttpTypes } from "@medusajs/types"

type PaymentDetailsProps = {
  order: HttpTypes.StoreOrder
  hideHeading?: boolean
}

const PaymentDetails = ({ order, hideHeading = false }: PaymentDetailsProps) => {
  const payment = order.payment_collections?.[0]?.payments?.[0]

  return (
    <div className="w-full">
      {!hideHeading && (
        <h3 className="text-base font-bold text-ink mb-4 flex items-center gap-2">
          <i className="ph-bold ph-credit-card text-lg text-primary" aria-hidden />
          Payment Details
        </h3>
      )}
      <div>
        {payment ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-sm">
            <div className="space-y-1.5">
              <h4 className="font-bold text-ink/40 text-xs uppercase tracking-wider">Payment Method</h4>
              <div className="text-ink font-bold bg-surface-alt/20 p-4 rounded-2xl border border-line/35 shadow-sm flex items-center gap-3">
                <div className="flex items-center h-9 px-3 bg-surface rounded-xl border border-line/30 shadow-xs shrink-0">
                  {paymentInfoMap[payment.provider_id]?.icon || <i className="ph-fill ph-credit-card text-lg text-primary" />}
                </div>
                <span className="text-xs text-ink font-semibold">
                  {paymentInfoMap[payment.provider_id]?.title || payment.provider_id}
                </span>
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="font-bold text-ink/40 text-xs uppercase tracking-wider">Payment Details</h4>
              <div className="text-ink font-medium bg-surface-alt/20 p-4 rounded-2xl border border-line/35 shadow-sm space-y-1">
                <p className="text-xs font-mono text-ink">
                  Total Paid: <span className="font-bold text-success">{convertToLocale({ amount: payment.amount, currency_code: order.currency_code })}</span>
                </p>
                <p className="text-[10px] text-ink/40 mt-1">
                  Paid on {new Date(payment.created_at ?? "").toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-ink/50 bg-surface-alt/20 p-4 rounded-2xl border border-line/35 shadow-sm italic">
            No payment transaction recorded.
          </div>
        )}
      </div>
    </div>
  )
}

export default PaymentDetails

