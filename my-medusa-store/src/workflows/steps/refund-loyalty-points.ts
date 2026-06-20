import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { LOYALTY_MODULE } from "../../modules/loyalty"
import LoyaltyModuleService from "../../modules/loyalty/service"

type StepInput = {
  customer_id: string
  /** Amount in major currency units that was originally reserved. */
  amount: number
  cart_id?: string | null
  order_id?: string | null
  description?: string
}

/**
 * Restore previously-reserved loyalty points back to a customer's
 * balance. Used in three places:
 *
 *   1. `remove-loyalty-from-cart` — user clicks "Remove" before
 *      checking out, so we give the reserved points back.
 *   2. `order-canceled` subscriber — order they redeemed against got
 *      canceled, refund the points spent.
 *   3. `reserve-loyalty-points` compensation — apply-cart workflow
 *      partially failed mid-way; reserve already debited, this step
 *      undoes it.
 *
 * Idempotent at the service level — caller decides the description so
 * the customer's transaction history reads cleanly ("Removed from cart"
 * vs "Refunded — order canceled").
 */
export const refundLoyaltyPointsStep = createStep(
  "refund-loyalty-points",
  async (
    { customer_id, amount, cart_id, order_id, description }: StepInput,
    { container }
  ) => {
    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )
    // Mirror of `reserveLoyaltyPointsStep` — refund the SAME number of
    // points that were originally debited for this `amount` of discount
    // (`amount × 2` under the 1-point-=-0.5-PKR ratio). Using the earn
    // conversion here would refund only 2 % of what was taken,
    // silently shrinking the customer's balance on every remove or
    // cancel.
    const points = await loyaltyModuleService.calculatePointsForAmount(amount)
    if (points <= 0) {
      // Nothing to refund — keep the workflow happy.
      return new StepResponse(null, null)
    }

    await loyaltyModuleService.addPoints(customer_id, points, {
      kind: "refund",
      cart_id: cart_id || null,
      order_id: order_id || null,
      description: description || "Refunded loyalty redemption",
    })

    return new StepResponse({ customer_id, points }, { customer_id, points })
  },
  async (data, { container }) => {
    if (!data) return
    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )
    // Compensation: re-deduct the refund if a later step in the same
    // workflow throws (rare — most callers are leaf workflows).
    await loyaltyModuleService.deductPoints(data.customer_id, data.points, {
      kind: "adjust",
      description: "Refund rolled back",
    })
  }
)
