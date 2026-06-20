import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  // Optional `parent_id` filter — `?parent_id=null` (literal string)
  // returns top-level brands, `?parent_id=brand_xxx` returns children
  // of that brand. Useful for the admin sub-brand picker.
  const rawParent = req.query.parent_id
  const filter: Record<string, any> = {}
  if (typeof rawParent === "string") {
    filter.parent_id = rawParent === "null" || rawParent === "" ? null : rawParent
  }

  const [brands, count] = await svc.listAndCountBrands(
    filter,
    { order: { sort_order: "ASC" } as any, take: 500 }
  )

  res.json({ brands, count })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const body = (req.body || {}) as Record<string, any>

  if (!body.name || typeof body.name !== "string") {
    return res.status(400).json({ error: "name is required" })
  }

  const handle =
    body.handle ||
    body.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")

  // Validate parent_id: must be either null or an existing brand
  // (we don't let an admin point a child at a non-existent parent).
  let parentId: string | null = null
  if (body.parent_id) {
    const parent = await svc.retrieveBrand(body.parent_id).catch(() => null)
    if (!parent) {
      return res.status(400).json({ error: "parent_id does not refer to an existing brand" })
    }
    parentId = parent.id
  }

  const [brand] = await svc.createBrands([
    {
      name: body.name,
      handle,
      logo_url: body.logo_url ?? null,
      description: body.description ?? null,
      website_url: body.website_url ?? null,
      seo_title: body.seo_title ?? null,
      seo_description: body.seo_description ?? null,
      sort_order:
        typeof body.sort_order === "number"
          ? body.sort_order
          : parseInt(body.sort_order, 10) || 0,
      is_active: body.is_active !== false,
      parent_id: parentId,
    } as any,
  ])

  res.status(201).json({ brand })
}
