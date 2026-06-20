import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"

export async function GET(req: MedusaRequest, res: Res) {
  try {
    const { guest_id, order_ids } = req.query as { guest_id: string; order_ids?: string }
    if (!guest_id) {
      res.status(400).json({ error: "guest_id is required" })
      return
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    
    let filterIds: string[] = []
    if (order_ids) {
      filterIds = order_ids.split(",").filter(Boolean)
    }

    const filters: any = {}
    if (filterIds.length > 0) {
      filters.id = filterIds
    } else {
      // Query directly by metadata
      filters.metadata = { guest_id }
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
        "shipping_address.*"
      ],
      filters
    })

    // Filter results in memory to ensure they belong to this guest (security check)
    const secureOrders = orders.filter((o: any) => {
      const meta = o.metadata || {}
      return meta.guest_id === guest_id
    })

    res.json({ orders: secureOrders })
  } catch (error: any) {
    console.error("[Guest Orders API] Error:", error)
    res.status(500).json({ error: error.message || "Failed to fetch guest orders" })
  }
}

type Res = MedusaResponse & {
  status: (code: number) => Res
}
