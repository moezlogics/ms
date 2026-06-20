import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"
import { cached } from "../../../utils/cache-response"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)
  const product_id = req.query.product_id as string | undefined

  if (product_id) {
    const links = await svc.listBrandProducts({ product_id }, { take: 1 })
    if (!links.length) return res.json({ brand: null })
    const brand = await svc.retrieveBrand(links[0].brand_id).catch(() => null)
    return res.json({ brand })
  }

  // Optional `?parent_id=` filter exposed to the storefront so the
  // brand-tree sidebar can lazy-load children if it ever needs to.
  const rawParent = req.query.parent_id
  const filter: Record<string, any> = { is_active: true }
  if (typeof rawParent === "string") {
    filter.parent_id =
      rawParent === "null" || rawParent === "" ? null : rawParent
  }

  // The full brand tree changes rarely but is read on most catalog
  // pages (sidebar) — cache by the parent filter.
  const cacheKey = `store:brands:${
    typeof rawParent === "string" ? rawParent || "root" : "all"
  }`
  const brands = await cached(req.scope, cacheKey, 300, () =>
    svc.listBrands(filter, { order: { sort_order: "ASC" } as any, take: 500 })
  )

  // We return the full flat list (with parent_id on each row) so the
  // storefront can build the tree locally without an extra request
  // per level. 500 cap is fine — even huge electronics catalogs rarely
  // exceed 200 brands.
  res.setHeader("Cache-Control", "public, max-age=120, s-maxage=300")
  res.json({ brands })
}
