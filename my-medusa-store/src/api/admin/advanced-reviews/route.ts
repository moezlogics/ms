import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADVANCED_REVIEWS_MODULE } from "../../../modules/advanced_reviews"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const reviewsModuleService = req.scope.resolve(ADVANCED_REVIEWS_MODULE)
    
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0

    const [reviews, count] = await (reviewsModuleService as any).listAndCountAdvancedReviews(
      {},
      { 
        skip: offset, 
        take: limit, 
        order: { created_at: "DESC" } 
      }
    )

    res.json({
      reviews,
      count,
      limit,
      offset
    })
  } catch (error: any) {
    console.error("[Admin Reviews] Error:", error)
    res.status(500).json({ error: error.message || "Failed to fetch reviews." })
  }
}
