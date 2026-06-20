import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { LOYALTY_MODULE } from "../../modules/loyalty"
import LoyaltyModuleService from "../../modules/loyalty/service"

type StepInput = {
  customer_id: string
  amount: number
  cart_id: string
}

/**
 * Reserve loyalty points up-front (atomic deduction at apply time)
 * so two carts in two tabs can't spend the same balance.
 *
 * The compensation handler runs when a later step in the apply-loyalty
 * workflow throws — points are restored and the placeholder reservation
 * row is back-stamped as refunded.
 *
 * Why deduct at apply instead of at order placement?
 *   1. **Race-free**: balance check + deduct happens in one DB write.
 *   2. **No order.cart dependency**: Medusa V2 doesn't expose `order.cart`
 *      reliably, so the historic complete-time deduction silently never
 *      fired (the redeemed promo applied as discount, but points stayed
 *      in the account — customers got a free discount AND kept the
 *      balance, effectively earning *more* points on the redeemed order).
 *   3. **Clean refund path**: removing the redemption restores points,
 *      and order cancellation gets the same `addPoints(kind:"refund")`
 *      treatment.
 */
export const reserveLoyaltyPointsStep = createStep(
  "reserve-loyalty-points",
  async ({ customer_id, amount, cart_id }: StepInput, { container }) => {
    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )
    // REDEEM conversion: 1 point = 0.5 PKR, so to discount `amount`
    // PKR we need `amount × 2` points. (Earn ratio is a different
    // 0.02× rate — see service.ts. Calling `calculateEarnPoints` here
    // would silently under-deduct by 100× and effectively give the
    // customer 99% of their redemption for free.)
    const points = await loyaltyModuleService.calculatePointsForAmount(amount)

    await loyaltyModuleService.deductPoints(customer_id, points, {
      kind: "redeem",
      cart_id,
      description: `Applied to cart ${cart_id.slice(-8)} (pending checkout)`,
    })

    // Stash everything we need for compensation in the rollback payload.
    return new StepResponse({ customer_id, points, cart_id }, {
      customer_id,
      points,
      cart_id,
    })
  },
  async (data, { container }) => {
    if (!data) return
    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )
    await loyaltyModuleService.addPoints(data.customer_id, data.points, {
      kind: "refund",
      cart_id: data.cart_id,
      description: "Reservation rolled back",
    })
  }
)
