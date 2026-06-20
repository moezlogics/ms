import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import LoyaltyPoint from "./models/loyalty-point"
import LoyaltyTransaction from "./models/loyalty-transaction"
import { InferTypeOf } from "@medusajs/framework/types"

type LoyaltyPoint = InferTypeOf<typeof LoyaltyPoint>
type LoyaltyTransaction = InferTypeOf<typeof LoyaltyTransaction>

/**
 * Loyalty program economics — single source of truth.
 *
 *   • Earn rate: 2 points per 100 currency units → effective 1% reward.
 *     Spend 100 PKR → earn 2 points. Spend 5,000 PKR → earn 100 points.
 *
 *   • Redeem value: 1 point = 0.5 currency units.
 *     200 points → 100 PKR off. So to recover the 100 PKR you'd have
 *     to *spend* (and earn back) 200 points × 50 PKR-per-2-points
 *     = 10,000 PKR of further purchases. This 1 % round-trip is the
 *     standard retail loyalty economics — generous enough to feel
 *     valuable, conservative enough not to give margin away.
 *
 * Together these two ratios are inverse-related (earn = 2/100,
 * redeem = 1/0.5 = 2) so the math is symmetric: every PKR redeemed
 * "costs" the same number of points as 100 PKR of pure-cash spending
 * would have earned.
 *
 * If a per-site override is ever needed (different currency, premium
 * tier, etc.), copy this file and change ONLY these two constants —
 * every conversion routes through `calculateEarnPoints` /
 * `calculateAmountFromPoints` / `calculatePointsForAmount`.
 */
const EARN_POINTS_PER_CURRENCY = 0.02 // 2 points per 100 PKR
const REDEEM_CURRENCY_PER_POINT = 0.5 // 1 point worth 0.5 PKR

class LoyaltyModuleService extends MedusaService({
  LoyaltyPoint,
  LoyaltyTransaction,
}) {
  /**
   * Add points to a customer's balance and log a transaction row.
   *
   * @param customerId  Medusa customer id
   * @param points      Points to credit (must be > 0)
   * @param meta        Optional log metadata: order_id, kind, description.
   *                    Defaults: kind="earn", description="Earned points".
   *                    Use kind="refund" when restoring points spent on a
   *                    canceled order (or when removing a not-yet-checked-out
   *                    loyalty redemption from a cart).
   */
  async addPoints(
    customerId: string,
    points: number,
    meta?: {
      kind?: "earn" | "adjust" | "refund"
      order_id?: string | null
      cart_id?: string | null
      description?: string | null
    }
  ): Promise<LoyaltyPoint> {
    if (points <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Points must be greater than zero"
      )
    }

    const existing = await this.listLoyaltyPoints({ customer_id: customerId })
    let updated: LoyaltyPoint
    if (existing.length > 0) {
      updated = await this.updateLoyaltyPoints({
        id: existing[0].id,
        points: existing[0].points + points,
      })
    } else {
      updated = await this.createLoyaltyPoints({
        customer_id: customerId,
        points,
      })
    }

    await this.createLoyaltyTransactions({
      customer_id: customerId,
      points,
      balance_after: updated.points,
      kind: meta?.kind || "earn",
      order_id: meta?.order_id || null,
      cart_id: meta?.cart_id || null,
      description: meta?.description || "Earned points",
    })

    return updated
  }

  /**
   * Deduct points. Throws if the customer doesn't have enough.
   *
   * `kind` should describe WHY points are being removed so the customer
   * sees an accurate history. Defaults to `"redeem"` (the apply-loyalty
   * workflow reserves points up-front so the balance moves at apply time,
   * not at order time). Use `"adjust"` for an admin clawback or for
   * reversing earned points on a canceled order.
   */
  async deductPoints(
    customerId: string,
    points: number,
    meta?: {
      kind?: "redeem" | "adjust"
      cart_id?: string | null
      order_id?: string | null
      description?: string | null
    }
  ): Promise<LoyaltyPoint> {
    if (points <= 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Points must be greater than zero"
      )
    }

    const existing = await this.listLoyaltyPoints({ customer_id: customerId })
    if (existing.length === 0 || existing[0].points < points) {
      throw new MedusaError(
        MedusaError.Types.NOT_ALLOWED,
        "Insufficient loyalty points"
      )
    }

    const updated = await this.updateLoyaltyPoints({
      id: existing[0].id,
      points: existing[0].points - points,
    })

    await this.createLoyaltyTransactions({
      customer_id: customerId,
      points: -points,
      balance_after: updated.points,
      kind: meta?.kind || "redeem",
      cart_id: meta?.cart_id || null,
      order_id: meta?.order_id || null,
      description: meta?.description || "Redeemed for cart discount",
    })

    return updated
  }

  async getPoints(customerId: string): Promise<number> {
    const rows = await this.listLoyaltyPoints({ customer_id: customerId })
    return rows[0]?.points || 0
  }

  /**
   * Most recent transactions, newest first. Used by the storefront
   * loyalty history panel.
   */
  async listTransactionsForCustomer(
    customerId: string,
    take = 50
  ): Promise<LoyaltyTransaction[]> {
    return await this.listLoyaltyTransactions(
      { customer_id: customerId },
      { order: { created_at: "DESC" } as any, take }
    )
  }

  /**
   * EARN: how many points to credit for a given cash purchase amount.
   *
   *   amount × 0.02 (and floored to an integer)
   *
   * Examples:
   *   • 100  → 2 points
   *   • 5000 → 100 points
   *   • 749  → 14 points (749 × 0.02 = 14.98 → floor)
   *
   * Used by `add-purchase-as-points` after an order is placed, and by
   * the cancellation clawback when an order is reversed.
   *
   * Floor (not round) on purpose — over-rounding the earn would slowly
   * leak margin on tens of thousands of orders.
   */
  async calculateEarnPoints(amount: number): Promise<number> {
    if (amount < 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Amount cannot be negative"
      )
    }
    return Math.floor(amount * EARN_POINTS_PER_CURRENCY)
  }

  /**
   * REDEEM: convert points → currency amount the customer can take off
   * the cart total.
   *
   *   points × 0.5 (floored)
   *
   * Examples:
   *   • 100 points → 50 PKR off
   *   • 500 points → 250 PKR off
   *   • 1 point   → 0 (one point alone is below the 1 PKR minimum)
   *
   * Used to compute the slider's upper bound and to show "balance =
   * X PKR worth" on the storefront.
   */
  async calculateAmountFromPoints(points: number): Promise<number> {
    if (points < 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Points cannot be negative"
      )
    }
    return Math.floor(points * REDEEM_CURRENCY_PER_POINT)
  }

  /**
   * REDEEM: convert a desired discount amount → points required to buy
   * that discount. Inverse of `calculateAmountFromPoints`.
   *
   *   ceil(amount / 0.5) = amount × 2
   *
   * Examples:
   *   • 50 PKR off  → 100 points
   *   • 100 PKR off → 200 points
   *   • 1 PKR off   → 2 points
   *
   * `Math.ceil` so partial-rupee fractions can't leak free points
   * (they'd be `0.5 PKR free` per 1 point under-charged, which
   * compounds fast across many redemptions).
   *
   * Used by `reserve-loyalty-points` (debit at apply time) and
   * `refund-loyalty-points` (credit on remove / order cancel).
   */
  async calculatePointsForAmount(amount: number): Promise<number> {
    if (amount < 0) {
      throw new MedusaError(
        MedusaError.Types.INVALID_DATA,
        "Amount cannot be negative"
      )
    }
    return Math.ceil(amount / REDEEM_CURRENCY_PER_POINT)
  }

  /**
   * Backwards-compatible alias for the earn ratio.
   *
   * Older code paths and any third-party scripts that imported the
   * service still call `calculatePointsFromAmount` expecting the earn
   * conversion. New code should call `calculateEarnPoints` (for earning)
   * or `calculatePointsForAmount` (for redemption) explicitly, since
   * those two now produce different numbers.
   *
   * @deprecated Use `calculateEarnPoints` (earning) or
   *             `calculatePointsForAmount` (redemption) directly.
   */
  async calculatePointsFromAmount(amount: number): Promise<number> {
    return this.calculateEarnPoints(amount)
  }
}

export default LoyaltyModuleService
