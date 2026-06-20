import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BANNERS_MODULE } from "../../../modules/banners"
import BannersModuleService from "../../../modules/banners/service"

/**
 * GET /admin/banners
 *
 * Returns every banner (active + inactive) ordered by `sort_order ASC`
 * so the admin always sees the same order as the storefront carousel.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: BannersModuleService = req.scope.resolve(BANNERS_MODULE)

  const [banners, count] = await svc.listAndCountBanners(
    {},
    { order: { sort_order: "ASC" } as any, take: 100 }
  )

  res.json({ banners, count })
}

/**
 * POST /admin/banners — create a banner.
 *
 * `image_url` is the only hard requirement; everything else (headline,
 * link, CTA label, mobile variant, sort order) is optional. New banners
 * default to active so they show up on the storefront immediately.
 */
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: BannersModuleService = req.scope.resolve(BANNERS_MODULE)
  const body = (req.body || {}) as Record<string, any>

  if (!body.image_url || typeof body.image_url !== "string") {
    return res.status(400).json({ error: "image_url is required" })
  }

  const [banner] = await svc.createBanners([
    {
      title: body.title ?? null,
      subtitle: body.subtitle ?? null,
      image_url: body.image_url,
      image_url_mobile: body.image_url_mobile ?? null,
      link_url: body.link_url ?? null,
      cta_label: body.cta_label ?? null,
      text_position: body.text_position ?? "bottom-left",
      theme: body.theme ?? "dark",
      sort_order:
        typeof body.sort_order === "number"
          ? body.sort_order
          : parseInt(body.sort_order, 10) || 0,
      is_active: body.is_active !== false,
    } as any,
  ])

  res.status(201).json({ banner })
}
