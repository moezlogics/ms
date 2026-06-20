import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADVANCED_REVIEWS_MODULE } from "../../../../../modules/advanced_reviews"

export async function PUT(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const reviewsModuleService = req.scope.resolve(ADVANCED_REVIEWS_MODULE)
    const { id } = req.params
    const { status } = req.body as any

    if (!["pending", "approved", "flagged"].includes(status)) {
      res.status(400).json({ error: "Invalid status" })
      return
    }

    const updated = await (reviewsModuleService as any).updateAdvancedReviews({
      id,
      status
    })

    res.json({ review: updated })
  } catch (error: any) {
    console.error("[Admin Reviews Status] Error:", error)
    res.status(500).json({ error: error.message || "Failed to update review status." })
  }
}
