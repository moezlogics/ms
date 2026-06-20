import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: Res) {
  try {
    const { display_id, email } = req.query as { display_id: string; email: string }
    if (!display_id || !email) {
      res.status(400).json({ error: "display_id and email are required" })
      return
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const displayIdNumber = parseInt(display_id, 10)
    
    if (isNaN(displayIdNumber)) {
      res.status(400).json({ error: "Invalid display_id format" })
      return
    }

    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "id",
        "display_id",
        "status",
        "created_at",
        "total",
        "currency_code",
        "items.*",
        "metadata",
        "shipping_address.*",
        "email"
      ],
      filters: {
        display_id: displayIdNumber,
        email: email.trim().toLowerCase()
      } as any
    })

    if (!orders || orders.length === 0) {
      res.status(404).json({ error: "Order not found with the provided ID and email" })
      return
    }

    res.json({ order: orders[0] })
  } catch (error: any) {
    console.error("[Track Order API] Error:", error)
    res.status(500).json({ error: error.message || "Failed to retrieve order" })
  }
}

type Res = MedusaResponse & {
  status: (code: number) => Res
}
