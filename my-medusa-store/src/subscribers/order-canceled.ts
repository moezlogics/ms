import { SubscriberArgs, type SubscriberConfig } from "@medusajs/framework"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import { LOYALTY_MODULE } from "../modules/loyalty"
import LoyaltyModuleService from "../modules/loyalty/service"

/**
 * Reverse loyalty bookkeeping when an order is canceled.
 *
 * Two sides to a cancel:
 *
 *   1. **Refund redeemed points.** If the customer paid for part of the
 *      order with loyalty (`order.metadata.loyalty_amount > 0`), credit
 *      those points back so they're not lost to a canceled order.
 *
 *   2. **Clawback earned points.** Points earned by `handleOrderPoints`
 *      reference this order via `loyalty_transaction.order_id`. Sum the
 *      positive `earn`-kind transactions for this order and deduct the
 *      same amount as an `adjust` so the running balance reflects the
 *      cancel.
 *
 * Both sides are best-effort: a missing earn transaction (e.g. order
 * canceled before `handleOrderPoints` ran) just means there's nothing
 * to clawback, which is fine.
 *
 * Idempotency: the subscriber tags each refund and clawback transaction
 * with `order_id`, and checks for an existing matching row before
 * acting. This protects against Medusa retrying the event (or admin
 * clicking "cancel" twice — the order is already in canceled state, so
 * Medusa emits the event once, but the safety belt is cheap).
 */
export default async function orderCanceledHandler({
  event,
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const orderId = event.data?.id
  if (!orderId) {
    logger.warn("[orderCanceled] No order id in event data — skipping.")
    return
  }

  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const loyaltyModuleService: LoyaltyModuleService =
    container.resolve(LOYALTY_MODULE)

  try {
    const {
      data: [order],
    } = await query.graph({
      entity: "order",
      fields: ["id", "customer.*", "metadata"],
      filters: { id: orderId },
    })

    if (!order) {
      logger.warn(`[orderCanceled] Order ${orderId} not found — skipping.`)
      return
    }

    const customerId = order.customer?.id
    if (!customerId) {
      logger.info(
        `[orderCanceled] Order ${orderId} has no customer — skipping loyalty refund.`
      )
      return
    }

    const meta = (order.metadata || {}) as Record<string, any>
    const loyaltyAmount = Number(meta.loyalty_amount) || 0

    // 1) Refund the redeemed points (if any).
    if (loyaltyAmount > 0) {
      // Idempotency guard: if we already wrote a "refund" row for this
      // order, skip. Otherwise admin re-canceling a half-canceled order
      // would double-credit.
      const existingRefunds = await loyaltyModuleService.listLoyaltyTransactions(
        {
          customer_id: customerId,
          order_id: orderId,
          kind: "refund",
        }
      )
      if (existingRefunds.length === 0) {
        // Refund the SAME number of points that were deducted at apply
        // time — i.e. the redeem conversion (amount × 2), not the earn
        // conversion. We're undoing the reservation, not the earning.
        const points =
          await loyaltyModuleService.calculatePointsForAmount(loyaltyAmount)
        await loyaltyModuleService.addPoints(customerId, points, {
          kind: "refund",
          order_id: orderId,
          description: `Refunded — order #${orderId.slice(-8)} canceled`,
        })
        logger.info(
          `[orderCanceled] Refunded ${points} loyalty points to ${customerId} for canceled order ${orderId}`
        )
      } else {
        logger.info(
          `[orderCanceled] Refund row already exists for order ${orderId} — skipping`
        )
      }
    }

    // 2) Clawback earned points (the order had been giving points back
    //    to the customer; cancellation invalidates that).
    const earnedTxns = await loyaltyModuleService.listLoyaltyTransactions({
      customer_id: customerId,
      order_id: orderId,
      kind: "earn",
    })
    const totalEarned = earnedTxns.reduce(
      (acc: number, t: any) => acc + (Number(t.points) || 0),
      0
    )

    if (totalEarned > 0) {
      // Same idempotency guard — don't clawback twice.
      const existingClawbacks =
        await loyaltyModuleService.listLoyaltyTransactions({
          customer_id: customerId,
          order_id: orderId,
          kind: "adjust",
        })
      const alreadyClawedBack = existingClawbacks.reduce(
        (acc: number, t: any) => acc + Math.abs(Number(t.points) || 0),
        0
      )
      const remaining = totalEarned - alreadyClawedBack
      if (remaining > 0) {
        try {
          await loyaltyModuleService.deductPoints(customerId, remaining, {
            kind: "adjust",
            order_id: orderId,
            description: `Clawback — order #${orderId.slice(-8)} canceled`,
          })
          logger.info(
            `[orderCanceled] Clawed back ${remaining} earned points from ${customerId} for canceled order ${orderId}`
          )
        } catch (e: any) {
          // Customer has already spent some/all of the earned points
          // on another cart — we can't go negative. Log and move on; an
          // admin can reconcile from the transaction history if needed.
          logger.warn(
            `[orderCanceled] Could not clawback ${remaining} points (likely already spent): ${e?.message || e}`
          )
        }
      }
    }
  } catch (err: any) {
    logger.error(
      `[orderCanceled] FAILED order=${orderId} message=${err?.message || err}`
    )
    if (err?.stack) {
      logger.error(
        `[orderCanceled] stack: ${err.stack.split("\n").slice(0, 5).join(" | ")}`
      )
    }
  }
}

export const config: SubscriberConfig = {
  event: "order.canceled",
}
