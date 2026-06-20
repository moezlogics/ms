import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { IOrderModuleService } from "@medusajs/types"
import { Modules } from "@medusajs/framework/utils"

export async function POST(req: MedusaRequest, res: Res) {
  try {
    const { order_id, guest_id } = req.body as { order_id: string; guest_id: string }
    if (!order_id || !guest_id) {
      res.status(400).json({ error: "order_id and guest_id are required" })
      return
    }

    const orderModuleService: IOrderModuleService = req.scope.resolve(Modules.ORDER)

    // Retrieve order
    const order = await orderModuleService.retrieveOrder(order_id)
    if (!order) {
      res.status(404).json({ error: "Order not found" })
      return
    }

    // Security check: if the order is already linked to a registered customer account, reject!
    if (order.customer_id) {
      res.status(400).json({ error: "Order is already linked to a registered customer account" })
      return
    }

    const existingMeta = (order.metadata || {}) as Record<string, any>

    // HIJACK GUARD: once an order is claimed by one guest, nobody else can
    // re-claim it. Without this, anyone who learns an order id (it appears
    // in the confirmation URL) could POST their own guest_id here and then
    // read the order's PII (name, phone, address) via /by-guest.
    if (existingMeta.guest_id && existingMeta.guest_id !== guest_id) {
      res.status(409).json({ error: "Order is already linked to another guest" })
      return
    }

    // Already linked to THIS guest — nothing to do (idempotent).
    if (existingMeta.guest_id === guest_id) {
      res.json({ success: true })
      return
    }

    await orderModuleService.updateOrders([{
      id: order_id,
      metadata: {
        ...existingMeta,
        guest_id: guest_id,
      },
    }])

    res.json({ success: true })
  } catch (error: any) {
    console.error("[Link Guest Order API] Error:", error)
    res.status(500).json({ error: error.message || "Failed to link guest order" })
  }
}

type Res = MedusaResponse & {
  status: (code: number) => Res
}
