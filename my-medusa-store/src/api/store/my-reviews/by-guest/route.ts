import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADVANCED_REVIEWS_MODULE } from "../../../../modules/advanced_reviews"

export async function GET(req: MedusaRequest, res: Res) {
  try {
    const { guest_id } = req.query as { guest_id: string }
    if (!guest_id) {
      res.status(400).json({ error: "guest_id is required" })
      return
    }

    const reviewsModuleService = req.scope.resolve(ADVANCED_REVIEWS_MODULE)

    // Query advanced reviews by guest_id in metadata
    const reviews = await (reviewsModuleService as any).listAdvancedReviews(
      {
        metadata: { guest_id }
      },
      {
        order: { created_at: "DESC" }
      }
    )

    // Defence-in-depth: nested-JSON metadata filters don't always narrow
    // correctly across module backends. Re-filter in memory so we can NEVER
    // leak another guest's reviews even if the DB filter is too loose.
    const secureReviews = (reviews || []).filter(
      (r: any) => (r?.metadata || {}).guest_id === guest_id
    )

    res.json({ reviews: secureReviews })
  } catch (error: any) {
    console.error("[Guest Reviews API] Error:", error)
    res.status(500).json({ error: error.message || "Failed to fetch guest reviews" })
  }
}

type Res = MedusaResponse & {
  status: (code: number) => Res
}
