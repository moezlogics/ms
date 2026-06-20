import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SEARCH_LOG_MODULE } from "../../../../modules/search-log"
import SearchLogModuleService from "../../../../modules/search-log/service"

/**
 * GET /store/search/trending?limit=8 — returns the top trending
 * search queries (most-searched in the last 30 days). Used by the
 * header search bar's empty state. If no queries have been logged
 * yet the response is `{ queries: [] }` and the storefront hides the
 * "Trending" section entirely (per spec).
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const rawLimit = (req.query as any)?.limit
  const parsed = parseInt(typeof rawLimit === "string" ? rawLimit : "8", 10)
  const limit = Number.isFinite(parsed)
    ? Math.min(20, Math.max(1, parsed))
    : 8

  let queries: string[] = []
  try {
    const svc: SearchLogModuleService = req.scope.resolve(SEARCH_LOG_MODULE)
    queries = await svc.getTrending(limit)
  } catch (e) {
    // Soft-fail — return an empty list so the UI cleanly hides the
    // trending row.
    queries = []
  }

  res.json({ queries })
}
