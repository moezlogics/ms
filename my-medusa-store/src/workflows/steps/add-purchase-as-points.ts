import {
  createStep,
  StepResponse,
} from "@medusajs/framework/workflows-sdk"
import { LOYALTY_MODULE } from "../../modules/loyalty"
import LoyaltyModuleService from "../../modules/loyalty/service"

type StepInput = {
  customer_id: string
  amount: number
  order_id?: string
}

export const addPurchaseAsPointsStep = createStep(
  "add-purchase-as-points",
  async (input: StepInput, { container }) => {
    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )

    // EARN conversion: 2 points per 100 currency units of cash spent.
    // Caller passes `amount = order.item_subtotal − loyalty_amount`
    // so only the cash portion of the order earns points (the
    // loyalty-redeemed slice doesn't compound back into the balance).
    const pointsToAdd = await loyaltyModuleService.calculateEarnPoints(
      input.amount
    )

    const result = await loyaltyModuleService.addPoints(
      input.customer_id,
      pointsToAdd,
      {
        kind: "earn",
        order_id: input.order_id || null,
        description: input.order_id
          ? `Earned from order #${input.order_id.slice(-8)}`
          : "Earned points",
      }
    )

    return new StepResponse(result, {
      customer_id: input.customer_id,
      points: pointsToAdd
    })
  },
  async (data, { container }) => {
    if (!data) {
      return
    }

    const loyaltyModuleService: LoyaltyModuleService = container.resolve(
      LOYALTY_MODULE
    )

    await loyaltyModuleService.deductPoints(
      data.customer_id,
      data.points
    )
  }
)

