import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { SITE_SETTINGS_MODULE } from "../../../modules/site-settings"
import SiteSettingsModuleService from "../../../modules/site-settings/service"
import { cached } from "../../../utils/cache-response"

// Public: GET /store/site-settings — storefront reads these on every request.
// Redis-cached so origin hits (CDN misses) don't re-query the DB each time.
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: SiteSettingsModuleService = req.scope.resolve(SITE_SETTINGS_MODULE)
  const settings = await cached(req.scope, "store:site-settings", 120, () =>
    svc.getAll()
  )
  // Allow short-term CDN/browser caching
  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120")
  res.json({ settings })
}
