import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LOYALTY_MODULE } from "../../../../../../modules/loyalty"
import LoyaltyModuleService from "../../../../../../modules/loyalty/service"
import { MAX_REDEEM_RATIO } from "../../../../../../workflows/steps/compute-redeem-amount"

/**
 * GET /store/carts/:id/loyalty-points/max
 *
 * Returns the maximum amount the authenticated customer can redeem on
 * this cart, given:
 *   • their current point balance
 *   • the cart subtotal
 *   • the global MAX_REDEEM_RATIO (50% cap by default)
 *
 * The storefront slider uses this to set its upper bound — keeping the
 * cap logic on the backend means the storefront can't accidentally
 * allow over-redemption when the rules change.
 *
 * Response:
 *   {
 *     balance: 1240,         // raw point count
 *     max_amount: 350,       // major currency units (e.g. PKR)
 *     subtotal: 700,
 *     ratio: 0.5,
 *     currency_code: "pkr"
 *   }
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const { id: cart_id } = req.params

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const loyaltyModuleService: LoyaltyModuleService =
    req.scope.resolve(LOYALTY_MODULE)

  try {
    const {
      data: [rawCart],
    } = (await query.graph({
      entity: "cart",
      fields: ["id", "customer.id", "subtotal", "total", "currency_code"],
      filters: { id: cart_id },
    })) as { data: any[] }

    const cart = rawCart as any

    if (!cart) {
      return res.status(404).json({ message: "Cart not found" })
    }
    if (!cart.customer?.id) {
      return res.json({
        balance: 0,
        max_amount: 0,
        subtotal: cart.subtotal || 0,
        ratio: MAX_REDEEM_RATIO,
        currency_code: cart.currency_code,
      })
    }

    const balance = await loyaltyModuleService.getPoints(cart.customer.id)
    const balanceAsAmount =
      await loyaltyModuleService.calculateAmountFromPoints(balance)

    const baseTotal = Math.max(0, cart.subtotal ?? cart.total ?? 0)
    const cartCap = Math.floor(baseTotal * MAX_REDEEM_RATIO)
    const maxAmount = Math.max(0, Math.min(balanceAsAmount, cartCap))

    res.json({
      balance,
      max_amount: maxAmount,
      subtotal: baseTotal,
      ratio: MAX_REDEEM_RATIO,
      currency_code: cart.currency_code,
    })
  } catch (e: any) {
    res
      .status(500)
      .json({ message: e?.message || "Could not compute max redeem" })
  }
}
