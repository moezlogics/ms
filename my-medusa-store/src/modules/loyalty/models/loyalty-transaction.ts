import { model } from "@medusajs/framework/utils"

/**
 * Loyalty point transaction log.
 *
 * Every change to a customer's `loyalty_point.points` value writes a
 * row here so the storefront and admin can show a full history. The
 * `kind` discriminator separates earned points (from completed orders)
 * from redeemed points (applied to a cart) and from manual admin
 * adjustments.
 */
const LoyaltyTransaction = model.define("loyalty_transaction", {
  id: model.id({ prefix: "ltx" }).primaryKey(),
  customer_id: model.text(),
  // Positive = earned, negative = redeemed/spent.
  points: model.number(),
  // Running balance after this transaction (snapshot).
  balance_after: model.number().default(0),
  kind: model
    .enum(["earn", "redeem", "adjust", "refund"])
    .default("earn"),
  // Optional ref to the order that produced these points
  order_id: model.text().nullable(),
  // Optional ref to the cart that redeemed them
  cart_id: model.text().nullable(),
  // Human-readable description shown in the UI history panel
  description: model.text().nullable(),
})

export default LoyaltyTransaction
