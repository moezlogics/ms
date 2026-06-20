import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BANNERS_MODULE } from "../../../modules/banners"
import BannersModuleService from "../../../modules/banners/service"
import { cached } from "../../../utils/cache-response"

/**
 * GET /store/banners — public list of active banners, ordered by
 * `sort_order ASC`. Used by the storefront hero slider on the homepage.
 * Cached (Redis) since it's read on every homepage render.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: BannersModuleService = req.scope.resolve(BANNERS_MODULE)

  const banners = await cached(req.scope, "store:banners:active", 120, () =>
    svc.listBanners(
      { is_active: true },
      { order: { sort_order: "ASC" } as any, take: 50 }
    )
  )

  res.setHeader("Cache-Control", "public, max-age=60, s-maxage=120")
  res.json({ banners })
}
