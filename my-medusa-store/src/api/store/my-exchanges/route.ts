import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IOrderModuleService } from "@medusajs/types"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: Res) {
  try {
    const { order_id, items, return_shipping, additional_items } = req.body as any

    if (!order_id || !items || !items.length) {
      res.status(400).json({ error: "order_id and items are required" })
      return
    }

    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER)

    // Verify order exists
    const order = await orderModuleService.retrieveOrder(order_id)
    if (!order) {
      res.status(404).json({ error: "Order not found" })
      return
    }

    // Store the exchange request in metadata for admin to review
    const existingMeta = (order.metadata || {}) as Record<string, any>
    const exchangeRequests = existingMeta.exchange_requests || []
    exchangeRequests.push({
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
        exchange_requests: exchangeRequests,
      },
    }])

    res.status(201).json({ success: true, exchange: { order_id, status: "pending" } })
  } catch (error: any) {
    console.error("[Store Exchanges API] Error:", error)
    res.status(500).json({ error: error.message || "Failed to initiate exchange" })
  }
}

type Res = MedusaResponse & {
  status: (code: number) => Res
}
