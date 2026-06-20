import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query")

  try {
    const { data: orders } = await query.graph({
      entity: "order",
      fields: [
        "created_at",
        "shipping_address.first_name",
        "shipping_address.city",
        "items.title",
        "items.thumbnail",
      ],
      pagination: {
        take: 10,
        skip: 0,
        order: {
          created_at: "DESC"
        }
      }
    })

    const purchases = orders.map((order: any) => {
      const firstItem = order.items?.[0]
      return {
        name: order.shipping_address?.first_name || "Someone",
        city: order.shipping_address?.city || "Pakistan",
        product: firstItem?.title || "a product",
        thumbnail: firstItem?.thumbnail || null,
        created_at: order.created_at,
      }
    })

    return res.json({ purchases })
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch recent purchases" })
  }
}
