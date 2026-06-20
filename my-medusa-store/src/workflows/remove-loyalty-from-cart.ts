import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  releaseLockStep,
  useQueryGraphStep,
  updateCartPromotionsWorkflow,
  updateCartsStep,
  updatePromotionsStep,
} from "@medusajs/medusa/core-flows"
import { getCartLoyaltyPromoStep } from "./steps/get-cart-loyalty-promo"
import { refundLoyaltyPointsStep } from "./steps/refund-loyalty-points"
import { PromotionActions } from "@medusajs/framework/utils"
import { CartData } from "../utils/promo"

type WorkflowInput = {
  cart_id: string
}

const fields = [
  "id",
  "customer.*",
  "promotions.*",
  "promotions.application_method.*",
  "promotions.rules.*",
  "promotions.rules.values.*",
  "currency_code",
  "total",
  "metadata",
]

/**
 * Remove a previously-applied loyalty redemption from a cart and
 * **refund the reserved points back to the customer**.
 *
 * The old implementation only stripped the promotion — points stayed
 * debited because there was no record of how many were originally
 * reserved (the historic workflow recomputed everything at order time
 * and never touched the balance at apply). Now `applyLoyaltyOnCart`
 * persists `loyalty_amount` on cart.metadata, so this workflow knows
 * exactly how much to credit back.
 */
export const removeLoyaltyFromCartWorkflow = createWorkflow(
  "remove-loyalty-from-cart",
  (input: WorkflowInput) => {
    const { data: carts } = useQueryGraphStep({
      entity: "cart",
      fields,
      filters: {
        id: input.cart_id,
      },
      options: {
        throwIfKeyNotFound: true,
      },
    })

    const loyaltyPromo = getCartLoyaltyPromoStep({
      cart: carts[0] as unknown as CartData,
      throwErrorOn: "not-found",
    })

    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    // Refund the reserved amount BEFORE removing the promo so a later
    // failure still leaves the customer with their points + the cart
    // intact (better UX than "discount gone, balance lost").
    refundLoyaltyPointsStep(
      transform({ carts }, (data) => {
        const meta = (data.carts[0].metadata || {}) as Record<string, any>
        const amount = Number(meta.loyalty_amount) || 0
        return {
          customer_id: data.carts[0].customer!.id,
          amount,
          cart_id: data.carts[0].id,
          description: "Removed from cart before checkout",
        }
      })
    )

    updateCartPromotionsWorkflow.runAsStep({
      input: {
        cart_id: input.cart_id,
        promo_codes: [loyaltyPromo.code!],
        action: PromotionActions.REMOVE,
      },
    })

    const newMetadata = transform(
      {
        carts,
      },
      (data) => {
        const {
          loyalty_promo_id: _ignoreId,
          loyalty_amount: _ignoreAmount,
          ...rest
        } = (data.carts[0].metadata || {}) as Record<string, any>

        return {
          ...rest,
          loyalty_promo_id: null,
          loyalty_amount: null,
        }
      }
    )

    updateCartsStep([
      {
        id: input.cart_id,
        metadata: newMetadata,
      },
    ])

    updatePromotionsStep([
      {
        id: loyaltyPromo.id,
        status: "inactive",
      },
    ])

    // retrieve cart with updated promotions
    const { data: updatedCarts } = useQueryGraphStep({
      entity: "cart",
      fields,
      filters: { id: input.cart_id },
    }).config({ name: "retrieve-cart" })

    releaseLockStep({
      key: input.cart_id,
    })

    return new WorkflowResponse(updatedCarts[0])
  }
)
