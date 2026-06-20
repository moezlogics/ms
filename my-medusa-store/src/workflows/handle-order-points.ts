import {
  createWorkflow,
  when,
  transform,
} from "@medusajs/framework/workflows-sdk"
import {
  updatePromotionsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import {
  validateCustomerExistsStep,
  ValidateCustomerExistsStepInput,
} from "./steps/validate-customer-exists"
import { addPurchaseAsPointsStep } from "./steps/add-purchase-as-points"

type WorkflowInput = {
  order_id: string
}

/**
 * Post-order loyalty bookkeeping.
 *
 * After an order is placed we need to:
 *
 *   1. **Credit earned points** on the portion of the order the
 *      customer actually paid in cash (subtotal − loyalty_amount).
 *      The previous code earned off `order.total` which double-counted
 *      the redeemed slice — a customer who spent 1000 points on a 5000
 *      cart paid 4000 in cash and then earned 4000 more points,
 *      effectively recovering the 1000 they "spent" (and #1 meant the
 *      1000 was never even debited in the first place).
 *
 *   2. **Deactivate the loyalty promotion** so it can't be reused on
 *      another cart. The budget.limit=1 setting handles this on
 *      Medusa's side, but flipping `status=inactive` makes the admin
 *      UI cleaner and prevents accidental admin reuse.
 *
 * No debit step is needed here: points were already deducted at apply
 * time by `reserveLoyaltyPointsStep`. The only ledger entry we add is
 * an "earn" row referencing this order_id.
 *
 * Why read from `order.metadata` instead of `order.cart.promotions`?
 * Medusa V2 doesn't reliably surface the parent cart on order graphs —
 * the historic workflow relied on `order.cart.promotions.*` which
 * always came back undefined in production, so the deduction step
 * never ran. The `order-placed` subscriber now forwards
 * `loyalty_promo_id` and `loyalty_amount` from cart.metadata to
 * order.metadata, giving this workflow a stable, queryable signal.
 */
export const handleOrderPointsWorkflow = createWorkflow(
  "handle-order-points",
  ({ order_id }: WorkflowInput) => {
    const { data: orders } = useQueryGraphStep({
      entity: "order",
      fields: [
        "id",
        "customer.*",
        "total",
        "subtotal",
        "item_subtotal",
        "metadata",
      ],
      filters: {
        id: order_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    validateCustomerExistsStep({
      customer: orders[0].customer,
    } as ValidateCustomerExistsStepInput)

    // How much (if any) of this order was paid with loyalty points.
    // Defaults to 0 when the customer didn't redeem.
    const loyaltyContext = transform({ orders }, (data) => {
      const meta = (data.orders[0].metadata || {}) as Record<string, any>
      const loyaltyAmount = Number(meta.loyalty_amount) || 0
      const loyaltyPromoId =
        typeof meta.loyalty_promo_id === "string" ? meta.loyalty_promo_id : null

      // Earn on the cash portion only. Use item_subtotal/subtotal so we
      // don't credit the customer for shipping/tax/loyalty discount.
      // Fall back to total if those fields are missing (older Medusa
      // versions or edge-case order shapes).
      const earnBase = Math.max(
        0,
        (data.orders[0].item_subtotal ??
          data.orders[0].subtotal ??
          data.orders[0].total ??
          0) - loyaltyAmount
      )

      return {
        loyaltyAmount,
        loyaltyPromoId,
        earnBase,
      }
    })

    // Credit earned points (always — even on partially-redeemed orders).
    when({ loyaltyContext }, (data) => data.loyaltyContext.earnBase > 0).then(
      () => {
        addPurchaseAsPointsStep(
          transform({ orders, loyaltyContext }, (data) => ({
            customer_id: data.orders[0].customer!.id,
            amount: data.loyaltyContext.earnBase,
            order_id: data.orders[0].id,
          }))
        )
      }
    )

    // If the order used a loyalty promo, retire it so it can't be
    // reused on a future cart. Medusa's budget.limit=1 also protects
    // against double-use, but explicit status:inactive keeps the admin
    // promotions list tidy.
    when(
      { loyaltyContext },
      (data) => data.loyaltyContext.loyaltyPromoId !== null
    ).then(() => {
      updatePromotionsStep(
        transform({ loyaltyContext }, (data) => [
          {
            id: data.loyaltyContext.loyaltyPromoId!,
            status: "inactive",
          },
        ]) as any
      )
    })
  }
)
