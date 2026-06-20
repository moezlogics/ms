import type {
  SubscriberArgs,
  SubscriberConfig,
} from "@medusajs/framework"
import { Modules } from "@medusajs/framework/utils"
import { handleOrderPointsWorkflow } from "../workflows/handle-order-points"

export default async function orderPlacedHandler({
  event: { data },
  container,
}: SubscriberArgs<{ id: string }>) {
  const logger = container.resolve("logger")
  const query = container.resolve("query")
  const orderModuleService = container.resolve(Modules.ORDER) as any

  try {
    const { data: [order] } = await query.graph({
      entity: "order",
      fields: ["id", "metadata", "cart.metadata"],
      filters: { id: data.id },
    })

    if (order && order.cart?.metadata) {
      const cartMeta = order.cart.metadata
      const orderMeta = order.metadata || {}

      const hasCoords = cartMeta.map_lat !== undefined && cartMeta.map_lng !== undefined
      const hasPrescription = cartMeta.prescription_url !== undefined
      const hasPushEndpoint = cartMeta.push_endpoint !== undefined
      // Loyalty redemption details — `loyalty_promo_id` identifies the
      // one-shot promotion created by `applyLoyaltyOnCartWorkflow`, and
      // `loyalty_amount` is the cash-equivalent value of the points that
      // were already debited at apply time. Both are required downstream
      // by `handleOrderPointsWorkflow` (to skip earning on the redeemed
      // slice + deactivate the promo) and by `order-canceled` (to refund
      // the right number of points).
      const hasLoyaltyPromo =
        typeof cartMeta.loyalty_promo_id === "string" &&
        cartMeta.loyalty_promo_id.length > 0

      // Guest ownership: if the storefront stamped a guest_id on the cart
      // at checkout, copy it onto the order at CREATION so the order is
      // owned from birth (no "unclaimed window" for link-guest to race).
      const hasGuestId =
        typeof cartMeta.guest_id === "string" && cartMeta.guest_id.length > 0

      if (hasCoords || hasPrescription || hasPushEndpoint || hasLoyaltyPromo || hasGuestId) {
        const updateData: Record<string, any> = { ...orderMeta }

        if (hasGuestId && !updateData.guest_id) {
          updateData.guest_id = cartMeta.guest_id
        }

        if (hasCoords) {
          updateData.map_lat = cartMeta.map_lat
          updateData.map_lng = cartMeta.map_lng
          updateData.map_address = cartMeta.map_address
          updateData.map_source = cartMeta.map_source
        }

        if (hasPrescription) {
          updateData.prescription_url = cartMeta.prescription_url
          updateData.prescription_uploaded_at = cartMeta.prescription_uploaded_at
        }

        if (hasPushEndpoint) {
          updateData.push_endpoint = cartMeta.push_endpoint
        }

        if (hasLoyaltyPromo) {
          updateData.loyalty_promo_id = cartMeta.loyalty_promo_id
          updateData.loyalty_amount = Number(cartMeta.loyalty_amount) || 0
        }

        await orderModuleService.updateOrders(data.id, {
          metadata: updateData,
        })
        logger.info(`[orderPlacedHandler] Successfully copied cart metadata to order ${data.id}`)
      }
    }
  } catch (err: any) {
    logger.error(
      `[orderPlacedHandler] Failed to copy metadata from cart to order: ${err?.message || err}`
    )
  }

  await handleOrderPointsWorkflow(container).run({
    input: {
      order_id: data.id,
    },
  })
}

export const config: SubscriberConfig = {
  event: "order.placed",
}
