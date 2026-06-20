import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADVANCED_REVIEWS_MODULE } from "../../../../../modules/advanced_reviews"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const reviewsModuleService = req.scope.resolve(ADVANCED_REVIEWS_MODULE)
    const { id } = req.params
    const { content } = req.body as any

    if (!content || typeof content !== "string") {
      res.status(400).json({ error: "Reply content is required." })
      return
    }

    const updated = await (reviewsModuleService as any).updateAdvancedReviews({
      id,
      owner_reply: content
    })

    res.json({ review: updated })
  } catch (error: any) {
    console.error("[Admin Reviews Reply] Error:", error)
    res.status(500).json({ error: error.message || "Failed to post reply." })
  }
}
