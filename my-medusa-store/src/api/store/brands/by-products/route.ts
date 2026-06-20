import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"

/**
 * GET /store/brands/by-products?product_ids=p1,p2,...
 *
 * Bulk resolver: returns the DIRECT brand each product is linked to,
 * keyed by product id.
 *
 *   { brands: { [product_id]: { ...brand } } }
 *
 * Why this exists:
 *   The storefront product grid needs to label each card with its
 *   brand (and build the brand-prefixed canonical URL). Previously it
 *   looped over EVERY brand and called `/store/brands/[handle]` —
 *   which returns the brand's own + DESCENDANT products (a roll-up).
 *   That caused two bugs:
 *     1. N+1 requests (one per brand) on every product listing.
 *     2. A sub-brand product (e.g. linked to "Apple Mac") would be
 *        non-deterministically labelled with the PARENT brand
 *        ("Apple") because the parent's roll-up also contained it and
 *        the concurrent writes raced.
 *
 *   This endpoint reads the `brand_product` link table directly, so a
 *   product always maps to the exact (leaf) brand the admin assigned
 *   — no roll-up, no race, one round-trip.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  const raw = (req.query.product_ids || "").toString().trim()
  const productIds = raw
    ? raw
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean)
        .slice(0, 2000)
    : []

  // No product_ids supplied → return the FULL direct map. Used by the
  // search index, which labels the whole catalog at once and can't fit
  // thousands of ids in a query string. Still direct-links-only.
  const links = (await svc.listBrandProducts(
    productIds.length ? ({ product_id: productIds } as any) : ({} as any),
    { take: 100000 } as any
  )) as any[]

  const brandIds = Array.from(
    new Set(links.map((l) => l.brand_id).filter(Boolean))
  )

  const brands = brandIds.length
    ? ((await svc.listBrands(
        { id: brandIds } as any,
        { take: 500 } as any
      )) as any[])
    : []

  const brandById = new Map(brands.map((b) => [b.id, b]))

  const map: Record<string, any> = {}
  for (const l of links) {
    const brand = brandById.get(l.brand_id)
    // A product can only carry one direct link (the admin widget
    // enforces this), but guard against duplicates by keeping the
    // first resolvable brand we see.
    if (brand && !map[l.product_id]) {
      map[l.product_id] = brand
    }
  }

  res.setHeader("Cache-Control", "public, max-age=60")
  res.json({ brands: map })
}
