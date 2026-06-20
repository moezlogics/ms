import { CustomerDTO } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import LoyaltyModuleService from "../../modules/loyalty/service"
import { LOYALTY_MODULE } from "../../modules/loyalty"

/**
 * How much of the cart's subtotal can be paid with loyalty points.
 * Half-off is the industry default — beyond that and operators lose
 * the upsell on items still in the cart. Adjust per-site if needed.
 */
export const MAX_REDEEM_RATIO = 0.5

export type ComputeRedeemAmountStepInput = {
  cart: {
    id: string
    customer: CustomerDTO
    subtotal?: number
    total: number
    currency_code: string
  }
  /**
   * Optional partial redemption amount in major currency units (e.g. 250
   * means "Rs 250 off"). If omitted, falls back to the maximum the
   * customer is allowed to redeem on this cart.
   */
  requested_amount?: number
}

/**
 * Resolve the actual amount of currency to discount, given the
 * customer's balance, the cart subtotal, and (optionally) a user-chosen
 * partial-redeem amount. Centralised so apply-cart + validation + the
 * storefront max calculation all agree.
 *
 * Rules:
 *   • amount >= 1 (zero/negative input is rejected)
 *   • amount <= customer balance (in points → currency)
 *   • amount <= subtotal × MAX_REDEEM_RATIO (so the cart still has
 *     real money in it to qualify for shipping promos, etc.)
 *   • If `requested_amount` is omitted, the max of those three caps wins
 *     — i.e. "redeem as much as the system allows" is the default.
 */
export const computeRedeemAmountStep = createStep(
  "compute-redeem-amount",
  async (input: ComputeRedeemAmountStepInput, { container }) => {
    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )

    const balance = await loyaltyModuleService.getPoints(input.cart.customer.id)
    if (balance <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "You have no loyalty points to redeem"
      )
    }

    // Prefer subtotal (pre-tax/shipping) so the discount lands on
    // products, not on freight. Fall back to total if the cart entity
    // doesn't expose subtotal for some reason.
    const baseTotal = Math.max(0, input.cart.subtotal ?? input.cart.total ?? 0)
    if (baseTotal <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Cart is empty — add items before redeeming points"
      )
    }

    const balanceAsAmount = await loyaltyModuleService.calculateAmountFromPoints(
      balance
    )
    const cartCap = Math.floor(baseTotal * MAX_REDEEM_RATIO)
    const maxAllowed = Math.min(balanceAsAmount, cartCap)

    if (maxAllowed <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        `Cart too small to redeem points — minimum cart value is ${Math.ceil(1 / MAX_REDEEM_RATIO)} ${input.cart.currency_code.toUpperCase()}`
      )
    }

    let amount: number
    if (typeof input.requested_amount === "number") {
      const requested = Math.floor(input.requested_amount)
      if (requested <= 0) {
        throw new MedusaError(
          MedusaError.Types.INVALID_DATA,
          "Redeem amount must be at least 1"
        )
      }
      if (requested > maxAllowed) {
        throw new MedusaError(
          MedusaError.Types.NOT_ALLOWED,
          `You can redeem at most ${maxAllowed} ${input.cart.currency_code.toUpperCase()} on this cart`
        )
      }
      amount = requested
    } else {
      amount = maxAllowed
    }

    return new StepResponse(amount)
  }
)
