import { HttpTypes } from "@medusajs/types"

/**
 * Build the canonical URL path for a category by walking its
 * `parent_category` chain to the root. Returns a slash-separated
 * string of category handles, e.g. `"fashion/men/kurta"`.
 *
 * The returned value is *just the path part* — callers concatenate
 * it with a leading `/` (and an optional locale prefix) to form an
 * actual href, e.g. `/fashion/men/kurta`.
 *
 * Requirements:
 *  - `category.handle` is required.
 *  - `category.parent_category` should be populated as deep as the
 *    deepest displayed category. The data layer (`listCategories` /
 *    `getCategoryByHandle`) requests five levels of nesting, which
 *    is more than enough for any realistic shop taxonomy.
 *
 * If a parent in the chain is missing its handle, the chain is
 * truncated at that point (defensive — never produce a broken URL
 * with `undefined` segments).
 */
export function buildCategoryPath(
  category: Pick<HttpTypes.StoreProductCategory, "handle"> & {
    parent_category?: any | null
  }
): string {
  if (!category?.handle) return ""

  const segments: string[] = [category.handle]
  let parent: any = category.parent_category
  while (parent && parent.handle) {
    segments.unshift(parent.handle)
    parent = parent.parent_category
  }
  return segments.join("/")
}

/**
 * Traverses up the category chain from a leaf category to the root parent,
 * returning the ordered chain of categories.
 */
export function buildCategoryChain(leaf: any): any[] {
  if (!leaf) return []
  const chain: any[] = []
  let cur: any = leaf
  while (cur) {
    chain.unshift(cur)
    cur = cur.parent_category
  }
  return chain
}

