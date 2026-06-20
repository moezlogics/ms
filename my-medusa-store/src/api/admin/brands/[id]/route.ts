import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const { id } = req.params
  const brand = await svc.retrieveBrand(id)
  res.json({ brand })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return PATCH(req, res)
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const { id } = req.params
  const body = (req.body || {}) as Record<string, any>

  const update: Record<string, any> = { id }
  const allowed = [
    "name",
    "handle",
    "logo_url",
    "description",
    "website_url",
    "seo_title",
    "seo_description",
    "sort_order",
    "is_active",
    "parent_id",
  ]
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  if (typeof update.sort_order === "string") {
    update.sort_order = parseInt(update.sort_order, 10) || 0
  }

  // Guard against three edge cases when re-parenting a brand:
  //   1. parent_id === id            → brand can't be its own parent
  //   2. parent_id pointing to a non-existent brand
  //   3. parent_id pointing to a descendant of this brand (would
  //      create a cycle — Apple cannot have Mac as parent if Mac is
  //      a child of Apple).
  if ("parent_id" in update) {
    if (update.parent_id === "" || update.parent_id === undefined) {
      update.parent_id = null
    }
    if (update.parent_id !== null) {
      if (update.parent_id === id) {
        return res.status(400).json({ error: "A brand cannot be its own parent" })
      }
      const parent = await svc.retrieveBrand(update.parent_id).catch(() => null)
      if (!parent) {
        return res.status(400).json({ error: "parent_id does not refer to an existing brand" })
      }
      const descendants = await svc.listDescendantBrandIds(id)
      if (descendants.includes(update.parent_id)) {
        return res.status(400).json({ error: "Cycle detected: new parent is a descendant of this brand" })
      }
    }
  }

  const [brand] = await svc.updateBrands([update as any])
  res.json({ brand })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const { id } = req.params
  await svc.deleteBrands([id])
  res.json({ id, deleted: true })
}
