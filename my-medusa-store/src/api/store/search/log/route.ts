import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SEARCH_LOG_MODULE } from "../../../../modules/search-log"
import SearchLogModuleService from "../../../../modules/search-log/service"

/**
 * POST /store/search/log — fire-and-forget endpoint the storefront
 * calls when a customer commits to a search (clicks a result, hits
 * Enter on the search field, taps a recent-search chip, etc.).
 *
 * Body: `{ query: string }`. The service normalizes (lowercase + trim)
 * and dedupes on its own. Errors are swallowed so a failure here can
 * never break the user's search flow.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const body = (req.body || {}) as { query?: string }
  const query = typeof body.query === "string" ? body.query : ""

  // Always 200 — caller doesn't care, this is best-effort.
  try {
    if (query.trim()) {
      const svc: SearchLogModuleService = req.scope.resolve(SEARCH_LOG_MODULE)
      await svc.logQuery(query)
    }
  } catch (e) {
    // Soft-fail: never bubble up to the user.
  }

  res.json({ ok: true })
}
