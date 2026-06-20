import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../modules/brand"
import BrandModuleService from "../../../modules/brand/service"

/**
 * GET /store/active-filters
 *
 * Returns the set of category_ids and brand_ids that are actually
 * "live" for a given product-set scope. Powers the storefront's
 * hybrid filter sidebar:
 *
 *   • /brands/apple   → activeCategoryIds = categories of Apple's
 *                       products → sidebar hides empty categories
 *   • /electronics    → activeBrandIds = brands appearing in
 *                       Electronics → sidebar hides empty brands
 *   • /store          → both empty → sidebar shows the full list
 *
 * Query params (pick ONE — they're mutually exclusive):
 *   ?category_id=cat_xxx               → resolves brand_ids
 *   ?product_ids=p1,p2,...             → resolves both
 *   (no params)                        → returns empty arrays
 *
 * Response:
 *   { category_ids: string[], brand_ids: string[] }
 *
 * Implementation notes:
 *   • category_id mode hits `query.graph` on product → categories.id.
 *     Single round-trip, no batching needed thanks to Medusa's
 *     join-friendly graph engine.
 *   • product_ids mode does the same for categories AND a small
 *     `listBrandProducts({ product_id: [...] })` for brands.
 *   • Result is cached for 60s at the HTTP layer (`Cache-Control`)
 *     so a brand/category page refresh doesn't re-do the work.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query") as any
  const brandSvc: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  const categoryId = (req.query.category_id || "").toString().trim()
  const productIdsRaw = (req.query.product_ids || "").toString().trim()
  const productIds = productIdsRaw
    ? productIdsRaw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2000)
    : []

  if (!categoryId && !productIds.length) {
    let categoryIds: string[] = []
    let brandIds: string[] = []
    try {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id", "categories.id"],
        pagination: { take: 10000 } as any,
      })
      const resolvedProductIds = (data || []).map((p: any) => p.id).filter(Boolean)
      const set = new Set<string>()
      for (const p of data || []) {
        for (const c of (p as any).categories || []) {
          if (c?.id) set.add(c.id)
        }
      }
      categoryIds = Array.from(set)

      const links = (await brandSvc.listBrandProducts(
        { product_id: resolvedProductIds } as any,
        { take: 10000 } as any
      )) as any[]
      brandIds = Array.from(
        new Set(links.map((l) => l.brand_id).filter(Boolean))
      )
    } catch (e) {
      // Ignore
    }
    res.setHeader("Cache-Control", "public, max-age=60")
    return res.json({ category_ids: categoryIds, brand_ids: brandIds })
  }

  let resolvedProductIds: string[] = productIds

  // category_id mode: pull the products under that category first.
  if (categoryId && !productIds.length) {
    try {
      const { data } = await query.graph({
        entity: "product",
        fields: ["id"],
        filters: { categories: { id: categoryId } } as any,
        pagination: { take: 2000 } as any,
      })
      resolvedProductIds = (data || []).map((p: any) => p.id).filter(Boolean)
    } catch {
      resolvedProductIds = []
    }
  }

  if (!resolvedProductIds.length) {
    res.setHeader("Cache-Control", "public, max-age=60")
    return res.json({ category_ids: [], brand_ids: [] })
  }

  // categories.id for every product in scope
  let categoryIds: string[] = []
  try {
    const { data } = await query.graph({
      entity: "product",
      fields: ["id", "categories.id"],
      filters: { id: resolvedProductIds } as any,
      pagination: { take: 2000 } as any,
    })
    const set = new Set<string>()
    for (const p of data || []) {
      for (const c of (p as any).categories || []) {
        if (c?.id) set.add(c.id)
      }
    }
    categoryIds = Array.from(set)
  } catch {
    categoryIds = []
  }

  // brand_ids via the brand_product join — one query for the whole set.
  let brandIds: string[] = []
  try {
    const links = (await brandSvc.listBrandProducts(
      { product_id: resolvedProductIds } as any,
      { take: 2000 } as any
    )) as any[]
    brandIds = Array.from(
      new Set(links.map((l) => l.brand_id).filter(Boolean))
    )
  } catch {
    brandIds = []
  }

  res.setHeader("Cache-Control", "public, max-age=60")
  return res.json({ category_ids: categoryIds, brand_ids: brandIds })
}
