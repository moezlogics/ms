import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { applyLoyaltyOnCartWorkflow } from "../../../../../workflows/apply-loyalty-on-cart"
import { removeLoyaltyFromCartWorkflow } from "../../../../../workflows/remove-loyalty-from-cart"

/**
 * Apply / remove a loyalty redemption on a cart.
 *
 * POST   /store/carts/:id/loyalty-points          → reserve points + add discount
 * DELETE /store/carts/:id/loyalty-points          → refund points + drop discount
 *
 * POST body:
 *   { amount?: number }  // optional partial-redeem; omit for "max allowed"
 *
 * The body is intentionally tiny — the backend workflow validates the
 * amount against the customer's balance + the cart subtotal cap so the
 * storefront can't bypass either limit by hand-crafting a request.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const { id: cart_id } = req.params

  // Parse + sanitise the requested amount. We accept ints only — points
  // are integers and so is the resulting discount, so anything else
  // would just confuse the downstream Math.floor.
  const body = (req.body || {}) as { amount?: unknown }
  let amount: number | undefined
  if (body.amount !== undefined && body.amount !== null) {
    const n = Number(body.amount)
    if (!Number.isFinite(n) || n <= 0) {
      return res
        .status(400)
        .json({ message: "Redeem amount must be a positive number" })
    }
    amount = Math.floor(n)
  }

  // Replace any existing reservation so a user changing their mind on
  // the slider doesn't have to click Remove → Apply. Wrapped in
  // try/catch because the first apply will have no prior promotion to
  // remove (and that throws "not-found" by design).
  try {
    await removeLoyaltyFromCartWorkflow(req.scope).run({
      input: { cart_id },
    })
  } catch {
    // No prior redemption — fine.
  }

  try {
    const { result: cart } = await applyLoyaltyOnCartWorkflow(req.scope).run({
      input: { cart_id, amount },
    })
    res.json({ cart })
  } catch (e: any) {
    // Surface the workflow error to the client so the storefront can
    // show a useful "you can only redeem N points on this cart" toast
    // instead of a generic 500.
    res.status(400).json({ message: e?.message || "Could not apply points" })
  }
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const { id: cart_id } = req.params

  try {
    const { result: cart } = await removeLoyaltyFromCartWorkflow(req.scope).run(
      { input: { cart_id } }
    )
    res.json({ cart })
  } catch (e: any) {
    res
      .status(400)
      .json({ message: e?.message || "Could not remove redemption" })
  }
}
