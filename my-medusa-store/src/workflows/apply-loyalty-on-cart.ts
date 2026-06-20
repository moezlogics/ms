import {
  createWorkflow,
  transform,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import {
  acquireLockStep,
  createPromotionsStep,
  releaseLockStep,
  updateCartPromotionsWorkflow,
  updateCartsStep,
  useQueryGraphStep,
} from "@medusajs/medusa/core-flows"
import {
  validateCustomerExistsStep,
  ValidateCustomerExistsStepInput,
} from "./steps/validate-customer-exists"
import { computeRedeemAmountStep } from "./steps/compute-redeem-amount"
import { reserveLoyaltyPointsStep } from "./steps/reserve-loyalty-points"
import { CartData, CUSTOMER_ID_PROMOTION_RULE_ATTRIBUTE } from "../utils/promo"
import { CreatePromotionDTO } from "@medusajs/framework/types"
import { PromotionActions } from "@medusajs/framework/utils"
import { getCartLoyaltyPromoStep } from "./steps/get-cart-loyalty-promo"

type WorkflowInput = {
  cart_id: string
  /**
   * Optional partial redemption amount in major currency units (e.g. 250
   * means "Rs 250 off"). If omitted, the workflow redeems the maximum
   * the system allows on this cart (see `computeRedeemAmountStep`).
   */
  amount?: number
}

const fields = [
  "id",
  "customer.*",
  "promotions.*",
  "promotions.application_method.*",
  "promotions.rules.*",
  "promotions.rules.values.*",
  "currency_code",
  "subtotal",
  "total",
  "metadata",
]

/**
 * Apply a loyalty-points discount to a cart.
 *
 * Major changes vs. the original implementation:
 *
 * 1. **Atomic point reservation.** Points are deducted from the
 *    customer's balance immediately (`reserveLoyaltyPointsStep`) instead
 *    of at order-completion time. This kills the double-spend race and
 *    works around Medusa V2's missing `order.cart` association — the
 *    debit no longer depends on the order having a queryable cart.
 *
 * 2. **Partial-amount support.** Callers may pass `amount` for a
 *    "redeem only 200 of my 1000 points" flow. Omitting it falls back
 *    to the maximum allowed (capped at 50% of subtotal).
 *
 * 3. **Cart metadata carries the amount.** Both `loyalty_promo_id` AND
 *    `loyalty_amount` are stored on the cart, then copied onto the order
 *    by the `order-placed` subscriber. Cancellation logic can refund
 *    the right amount without re-deriving from the promotion.
 *
 * Compensation: `reserveLoyaltyPointsStep` has a rollback handler that
 * restores the points if a later step (promotion creation, cart update)
 * throws — so a partial failure can't strand a customer with their
 * balance debited but no discount applied.
 */
export const applyLoyaltyOnCartWorkflow = createWorkflow(
  "apply-loyalty-on-cart",
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

    validateCustomerExistsStep({
      customer: carts[0].customer,
    } as ValidateCustomerExistsStepInput)

    // Reject duplicate apply (a second click while already-applied
    // would otherwise double-reserve points).
    getCartLoyaltyPromoStep({
      cart: carts[0] as unknown as CartData,
      throwErrorOn: "found",
    })

    acquireLockStep({
      key: input.cart_id,
      timeout: 2,
      ttl: 10,
    })

    const amount = computeRedeemAmountStep({
      cart: carts[0] as any,
      requested_amount: input.amount,
    })

    // Deduct points NOW — this is the atomic reservation.
    reserveLoyaltyPointsStep(
      transform({ carts, amount }, (data) => ({
        customer_id: data.carts[0].customer!.id,
        amount: data.amount,
        cart_id: data.carts[0].id,
      }))
    )

    const promoToCreate = transform(
      {
        carts,
        amount,
      },
      (data) => {
        const randomStr = Math.random().toString(36).substring(2, 8)
        const uniqueId = (
          "LOYALTY-" +
          data.carts[0].customer?.first_name +
          "-" +
          randomStr
        ).toUpperCase()
        return {
          code: uniqueId,
          type: "standard",
          status: "active",
          application_method: {
            type: "fixed",
            value: data.amount,
            target_type: "order",
            currency_code: data.carts[0].currency_code,
            allocation: "across",
          },
          rules: [
            {
              attribute: CUSTOMER_ID_PROMOTION_RULE_ATTRIBUTE,
              operator: "eq",
              values: [data.carts[0].customer!.id],
            },
          ],
          campaign: {
            name: uniqueId,
            description:
              "Loyalty points promotion for " + data.carts[0].customer!.email,
            campaign_identifier: uniqueId,
            budget: {
              type: "usage",
              limit: 1,
            },
          },
        }
      }
    )

    const loyaltyPromo = createPromotionsStep([
      promoToCreate,
    ] as CreatePromotionDTO[])

    const { metadata, ...updatePromoData } = transform(
      {
        carts,
        promoToCreate,
        loyaltyPromo,
        amount,
      },
      (data) => {
        const promos = [
          ...((data.carts[0].promotions
            ?.map((promo) => promo?.code)
            .filter(Boolean) || []) as string[]),
          data.promoToCreate.code,
        ]

        return {
          cart_id: data.carts[0].id,
          promo_codes: promos,
          action: PromotionActions.ADD,
          // Persist both the promo id and the redeemed amount on the
          // cart. The `order-placed` subscriber forwards these onto the
          // order, where `handle-order-points` / `order-canceled` read
          // them. Without `loyalty_amount` we'd have to look up the
          // promotion to know how many points to clawback on cancel —
          // and Medusa's promotion engine doesn't keep historical
          // amounts after the campaign is exhausted.
          metadata: {
            loyalty_promo_id: data.loyaltyPromo[0].id,
            loyalty_amount: data.amount,
          },
        }
      }
    )

    updateCartPromotionsWorkflow.runAsStep({
      input: updatePromoData,
    })

    updateCartsStep([
      {
        id: input.cart_id,
        metadata,
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
