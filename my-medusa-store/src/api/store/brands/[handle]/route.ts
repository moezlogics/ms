import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const { handle } = req.params

  const brands = await svc.listBrands(
    { handle, is_active: true },
    { take: 1 }
  )

  if (!brands.length) {
    return res.status(404).json({ error: "Brand not found" })
  }

  const brand = brands[0] as any

  // Roll up: this brand's products PLUS every descendant brand's
  // products. So `/brands/apple` returns Apple + Apple Mac + Apple
  // iPhone products in one shot. Descendant resolution is BFS in the
  // service so cycles are safe.
  const { brand_ids, product_ids } = await svc.retrieveBrandWithProducts(
    brand.id
  )

  // Fetch the descendant brand records (one query) so the storefront
  // can render a "Browse Apple Mac · iPhone · Watch" rail without
  // doing N follow-up requests.
  const childIds = brand_ids.filter((id) => id !== brand.id)
  const children = childIds.length
    ? await svc.listBrands(
        { id: childIds, is_active: true } as any,
        { order: { sort_order: "ASC" } as any, take: 500 }
      )
    : []

  res.json({ brand, product_ids, children })
}
