import { MedusaService } from "@medusajs/framework/utils"
import { Brand, BrandProduct } from "./models/brand"

class BrandModuleService extends MedusaService({
  Brand,
  BrandProduct,
}) {
  /**
   * Collect the brand ID itself + every descendant brand ID by
   * walking the `parent_id` chain breadth-first.
   *
   * Used by:
   *   • GET /store/brands/[handle]            — parent brand pages
   *     surface products from sub-brands too (e.g. /brands/apple
   *     shows all Apple + Mac + iPhone products).
   *   • GET /store/brands/path/[...path]      — nested resolution
   *     for /brands/apple/mac.
   *
   * Cycle-safe: we track visited IDs so a corrupted parent_id loop
   * can't hang the request.
   *
   * Performance:
   *   One brand-list query per level. Real-world brand trees are
   *   shallow (2-3 levels) so this is fine without recursion-in-SQL.
   *   If a store ever grows to 10k+ brands we can swap to a
   *   `WITH RECURSIVE` CTE without changing the call sites.
   */
  async listDescendantBrandIds(brandId: string): Promise<string[]> {
    const visited = new Set<string>()
    const queue: string[] = [brandId]
    while (queue.length) {
      const current = queue.shift()!
      if (visited.has(current)) continue
      visited.add(current)
      const children = await this.listBrands(
        { parent_id: current } as any,
        { take: 500 } as any
      )
      for (const c of children as any[]) {
        if (c?.id && !visited.has(c.id)) queue.push(c.id)
      }
    }
    return Array.from(visited)
  }

  /**
   * Return the brand + product IDs belonging to it OR any of its
   * descendants. Used by both the legacy /store/brands/[handle]
   * endpoint and the new /store/brands/path/[...path] endpoint so
   * callers don't have to compose the two queries themselves.
   */
  async retrieveBrandWithProducts(
    brandId: string
  ): Promise<{ brand_ids: string[]; product_ids: string[] }> {
    const brand_ids = await this.listDescendantBrandIds(brandId)
    if (!brand_ids.length) return { brand_ids: [], product_ids: [] }

    const links = await this.listBrandProducts(
      { brand_id: brand_ids } as any,
      { take: 2000 } as any
    )
    const product_ids = Array.from(
      new Set((links as any[]).map((l) => l.product_id).filter(Boolean))
    )
    return { brand_ids, product_ids }
  }
}

export default BrandModuleService
