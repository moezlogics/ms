import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BRAND_MODULE } from "../../../../modules/brand"
import BrandModuleService from "../../../../modules/brand/service"

/**
 * GET /store/brands/path?path=apple/mac
 *
 * Resolves a slash-separated chain of brand handles into a single
 * brand. Each segment must be a direct child of the previous one,
 * so `?path=apple/mac` 404s if Mac is not actually a sub-brand of
 * Apple — preventing URL-guessing from surfacing the wrong product
 * set.
 *
 * NOTE: This route originally lived at `/store/brands/path/[...path]`
 * but Medusa V2's file-based router (path-to-regexp under the hood)
 * does not support catch-all dynamic segments and crashed on startup.
 * Switching to a single query parameter keeps the same semantics
 * without breaking the route loader.
 *
 * Successful response shape:
 *   {
 *     brand:       { ...the deepest matched brand },
 *     chain:       [ { id, name, handle } ...root → leaf ],
 *     children:    [ ...the immediate sub-brands of `brand` ],
 *     product_ids: [ ...products on `brand` AND its descendants ]
 *   }
 *
 * 404 with `{ error }` if any handle in the chain doesn't resolve.
 * 400 with `{ error }` if no path segments were supplied.
 */
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const svc: BrandModuleService = req.scope.resolve(BRAND_MODULE)

  const rawPath = (req.query.path as unknown) as string | string[] | undefined
  const segments: string[] = Array.isArray(rawPath)
    ? rawPath.flatMap((s) => String(s).split("/")).filter(Boolean)
    : rawPath
    ? String(rawPath).split("/").filter(Boolean)
    : []

  if (segments.length === 0) {
    return res.status(400).json({ error: "Empty brand path" })
  }

  // Walk the path segment-by-segment, verifying parent_id at each
  // step. Each level looks up `{ handle, parent_id }` so a stray
  // top-level brand can't impersonate a sub-brand.
  let parentId: string | null = null
  const chain: { id: string; name: string; handle: string; parent_id: string | null }[] = []

  for (const handle of segments) {
    const found = (await svc.listBrands(
      { handle, is_active: true, parent_id: parentId } as any,
      { take: 1 }
    )) as any[]
    if (!found.length) {
      return res.status(404).json({ error: "Brand path not found", failed_at: handle })
    }
    const b = found[0]
    chain.push({
      id: b.id,
      name: b.name,
      handle: b.handle,
      parent_id: b.parent_id ?? null,
    })
    parentId = b.id
  }

  const leafId = chain[chain.length - 1].id
  const brand = await svc.retrieveBrand(leafId).catch(() => null)
  if (!brand) {
    return res.status(404).json({ error: "Brand path not found" })
  }

  const { brand_ids, product_ids } = await svc.retrieveBrandWithProducts(leafId)

  const childIds = brand_ids.filter((id) => id !== leafId)
  const children = childIds.length
    ? await svc.listBrands(
        { id: childIds, is_active: true } as any,
        { order: { sort_order: "ASC" } as any, take: 500 }
      )
    : []

  return res.json({
    brand,
    chain,
    children,
    product_ids,
  })
}
