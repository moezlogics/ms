import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { ADVANCED_REVIEWS_MODULE } from "../../../modules/advanced_reviews"

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const reviewsModuleService = req.scope.resolve(ADVANCED_REVIEWS_MODULE)
    const { 
      product_id, 
      guest_name, 
      guest_email, 
      rating, 
      content, 
      photos,
      guest_id
    } = req.body as any

    if (!product_id || !rating || !content) {
      res.status(400).json({ error: "product_id, rating, and content are required." })
      return
    }

    // Determine customer status from session if available
    let customer_id = null
    let is_verified = false

    const reqAny = req as any
    if (reqAny.auth_context && reqAny.auth_context.actor_id) {
      customer_id = reqAny.auth_context.actor_id
      is_verified = true
    } else {
      if (!guest_name || !guest_email) {
        res.status(400).json({ error: "guest_name and guest_email are required when not logged in." })
        return
      }
    }

    // Enforce limits
    if (content.length > 2000) {
      res.status(400).json({ error: "Review cannot exceed 2000 characters." })
      return
    }
    const clean_photos = is_verified && Array.isArray(photos) ? photos.slice(0, 5) : []

    const review = await (reviewsModuleService as any).createAdvancedReviews({
      product_id,
      customer_id,
      guest_name,
      guest_email,
      rating,
      content,
      photos: clean_photos,
      is_verified,
      status: "pending", // require admin approval to appear (or set auto-approve)
      metadata: guest_id ? { guest_id } : null,
    })

    res.status(201).json({ success: true, review })
  } catch (error: any) {
    console.error("[Store Reviews] Error:", error)
    res.status(500).json({ error: error.message || "Failed to submit review." })
  }
}

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
) {
  try {
    const reviewsModuleService = req.scope.resolve(ADVANCED_REVIEWS_MODULE)
    const product_id = req.query.product_id as string

    if (!product_id) {
      res.status(400).json({ error: "product_id is required." })
      return
    }

    // Only return approved reviews
    const limit = req.query.limit ? parseInt(req.query.limit as string) : 50
    const offset = req.query.offset ? parseInt(req.query.offset as string) : 0

    const [reviews, count] = await (reviewsModuleService as any).listAndCountAdvancedReviews(
      { product_id, status: "approved" },
      {
        skip: offset,
        take: limit,
        order: { created_at: "DESC" }
      }
    )

    // ── Hydrate customer info for the storefront avatar/name. ──
    // The Review row only stores `customer_id`. The storefront's
    // <Avatar /> component needs first_name + the slice of metadata
    // that holds avatar_url + gender. We batch-fetch with one
    // query.graph call so N reviews don't trigger N round-trips.
    const customerIds: string[] = Array.from(
      new Set(
        (reviews || [])
          .map((r: any) => r.customer_id)
          .filter((x: any): x is string => !!x)
      )
    )

    const customerMap = new Map<string, any>()
    if (customerIds.length > 0) {
      try {
        const query = req.scope.resolve("query") as any
        const { data: customers } = await query.graph({
          entity: "customer",
          fields: [
            "id",
            "first_name",
            "last_name",
            "metadata",
          ],
          filters: { id: customerIds } as any,
        })
        for (const c of customers || []) {
          // Only ship the fields we actually use — avoids leaking
          // internal metadata keys to the storefront.
          const meta = (c.metadata as any) || {}
          customerMap.set(c.id, {
            first_name: c.first_name || null,
            last_name: c.last_name || null,
            metadata: {
              avatar_url:
                typeof meta.avatar_url === "string" ? meta.avatar_url : null,
              gender:
                typeof meta.gender === "string" ? meta.gender : null,
            },
          })
        }
      } catch (e) {
        console.warn("[Store Reviews] customer hydration failed", e)
      }
    }

    const enrichedReviews = (reviews || []).map((r: any) => ({
      ...r,
      customer: r.customer_id ? customerMap.get(r.customer_id) || null : null,
    }))

    // Calculate averages natively using the retrieved total
    // (In production, you'd calculate and cache this directly onto the product model to avoid querying heavy review sets)
    let avg = 0
    if (enrichedReviews.length > 0) {
      const sum = enrichedReviews.reduce(
        (acc: number, cur: any) => acc + (cur.rating || 0),
        0
      )
      avg = sum / enrichedReviews.length
    }

    res.json({
      reviews: enrichedReviews,
      count,
      limit,
      offset,
      averageRating: avg,
    })
  } catch (error: any) {
    console.error("[Store Reviews] Error:", error)
    res.status(500).json({ error: error.message || "Failed to fetch reviews." })
  }
}
