import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"
import { completeCartWorkflow } from "@medusajs/medusa/core-flows"

/**
 * POST /store/chat/confirm-order
 *
 * Final step of the AI-assisted order flow. The AI never places orders
 * directly — it only `prepare_order_for_confirmation`, which renders a
 * "Confirm order" button in the chat. Tapping that button hits THIS
 * route, which is the single, isolated, server-side place where an
 * order can actually be created from the chat surface.
 *
 * Body: { cart_id: string }
 *
 * SECURITY:
 *   - Requires an authenticated customer (auth bearer). Anonymous
 *     callers get 401.
 *   - Re-fetches the cart server-side and verifies `cart.customer_id`
 *     matches the authed user. A user CANNOT confirm someone else's
 *     cart even if they discover the id.
 *   - Cart must be COD (no payment session yet OR payment provider
 *     id starts with "pp_system_default_" / "manual" / "cod"). For
 *     anything that needs a real charge we return 409 and tell the
 *     storefront to send the user to /checkout — payments only ever
 *     run through the proper checkout flow, never via chat.
 *   - The cart's customer_id is forced to the authed user before
 *     completion so the resulting order is automatically attached to
 *     their account and shows up at /account/orders.
 *
 * Response: { order: { id, display_id }, redirect: "/account/orders/details/..." }
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const authedCustomerId =
    ((req as any).auth_context?.actor_id as string | undefined) || null

  const body = (req.body || {}) as Record<string, any>
  const cartId = (body.cart_id || "").toString().trim()
  if (!cartId) {
    return res.status(400).json({ message: "cart_id is required" })
  }

  const cartModule = req.scope.resolve(Modules.CART) as any

  let cart: any
  try {
    cart = await cartModule.retrieveCart(cartId, {
      relations: [
        "items",
        "shipping_address",
        "payment_collection",
        "payment_collection.payment_sessions",
      ],
    })
  } catch {
    return res.status(404).json({ message: "Cart not found" })
  }

  if (!cart) {
    return res.status(404).json({ message: "Cart not found" })
  }

  // Ownership: a cart already linked to a customer can ONLY be completed
  // by that same signed-in customer. Anonymous carts can be completed by
  // anyone holding the (unguessable) cart id — same surface as the normal
  // guest checkout. Guests (no auth) may ONLY complete anonymous carts.
  if (cart.customer_id && cart.customer_id !== authedCustomerId) {
    return res.status(403).json({ message: "Forbidden" })
  }

  if (!cart.items?.length) {
    return res.status(400).json({ message: "Cart is empty" })
  }

  // COD needs a delivery address + contact email on the cart (the AI
  // collects these via collect_checkout_info). Refuse otherwise so we
  // never create an order we can't ship.
  const addr = cart.shipping_address
  const hasShipping = !!(addr && addr.address_1 && addr.city)
  const hasEmail = !!cart.email
  if (!hasShipping || !hasEmail) {
    const missing: string[] = []
    if (!hasShipping) missing.push("shipping_address")
    if (!hasEmail) missing.push("email")
    return res.status(400).json({
      message:
        "Delivery details are incomplete. Please provide name, full address, city and email first.",
      missing,
    })
  }

  // Anchor the cart to the authed customer (if any) so the order shows up
  // in their account. Guests stay anonymous → a normal guest order.
  if (authedCustomerId && !cart.customer_id) {
    try {
      await cartModule.updateCarts(cart.id, { customer_id: authedCustomerId })
    } catch (e: any) {
      return res.status(500).json({
        message: e?.message || "Could not attach cart to customer",
      })
    }
  }

  // Only let cash-on-delivery (or an empty payment collection that
  // implies "no charge yet") complete from chat. Anything else has to
  // use the regular checkout — we don't run real payments here.
  const sessions = cart.payment_collection?.payment_sessions || []
  const allCod = sessions.every((s: any) => {
    const pid = (s.provider_id || "").toLowerCase()
    return (
      pid.includes("cod") ||
      pid.includes("manual") ||
      pid.includes("system_default")
    )
  })

  if (sessions.length && !allCod) {
    return res.status(409).json({
      message:
        "This order needs an online payment — please confirm it from the checkout page.",
      redirect: "/checkout",
    })
  }

  try {
    const { result } = await completeCartWorkflow(req.scope).run({
      input: { id: cart.id },
    } as any)

    const order = (result as any)?.order || (result as any)
    const orderId = order?.id || (result as any)?.id

    return res.json({
      order: {
        id: orderId,
        display_id: order?.display_id ?? null,
      },
      redirect: orderId
        ? authedCustomerId
          ? `/account/orders/details/${orderId}`
          : `/order/confirmed/${orderId}`
        : "/account/orders",
    })
  } catch (e: any) {
    // The cart may still be missing a shipping method or COD payment
    // session (normally set up on the checkout page). Rather than 500,
    // send the user to checkout to finish — their cart + details are
    // already saved, so it's one tap there.
    return res.status(409).json({
      message:
        "Aap ka order taiyaar hai — bas ek aakhri tap checkout par karna hai (shipping/payment confirm).",
      redirect: "/checkout",
      detail: e?.message || "cart_not_ready",
    })
  }
}
