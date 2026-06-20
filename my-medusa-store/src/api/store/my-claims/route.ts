import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IOrderModuleService } from "@medusajs/types"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: Res) {
  try {
    const { order_id, type, items, return_shipping, additional_items } = req.body as any

    if (!order_id || !type || !items || !items.length) {
      res.status(400).json({ error: "order_id, type, and items are required" })
      return
    }

    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER)

    // Verify order exists and isn't canceled
    const order = await orderModuleService.retrieveOrder(order_id)
    if (!order) {
      res.status(404).json({ error: "Order not found" })
      return
    }

    // Store the claim request in metadata for admin to review
    const existingMeta = (order.metadata || {}) as Record<string, any>
    const claimRequests = existingMeta.claim_requests || []
    claimRequests.push({
      type,
      items,
      return_shipping,
      additional_items,
      requested_at: new Date().toISOString(),
      status: "pending",
    })

    await orderModuleService.updateOrders([{
      id: order_id,
      metadata: {
        ...existingMeta,
        claim_requests: claimRequests,
      },
    }])

    res.status(201).json({ success: true, claim: { order_id, type, status: "pending" } })
  } catch (error: any) {
    console.error("[Store Claims API] Error:", error)
    res.status(500).json({ error: error.message || "Failed to initiate claim" })
  }
}

type Res = MedusaResponse & {
  status: (code: number) => Res
}
