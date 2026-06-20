import { sdk } from "@lib/config"
import { HttpTypes } from "@medusajs/types"
import { getCacheOptions } from "./cookies"

/**
 * Category fields requested from Medusa. We pull five levels of
 * `parent_category` nesting so the storefront can render full
 * parent-prefixed URLs (e.g. `/fashion/men/kurta/printed-kurta`)
 * without any extra round-trips. Five levels is comfortably more
 * than any realistic taxonomy.
 */
const CATEGORY_FIELDS =
  "*category_children, *products, *parent_category, *parent_category.parent_category, *parent_category.parent_category.parent_category, *parent_category.parent_category.parent_category.parent_category, *parent_category.parent_category.parent_category.parent_category.parent_category, +metadata"

export const listCategories = async (query?: Record<string, any>) => {
  const next = {
    ...(await getCacheOptions("categories")),
  }

  const limit = query?.limit || 100

  return sdk.client
    .fetch<{ product_categories: HttpTypes.StoreProductCategory[] }>(
      "/store/product-categories",
      {
        query: {
          fields: CATEGORY_FIELDS,
          limit,
          ...query,
        },
        next,
        cache: "force-cache",
      }
    )
    .then(({ product_categories }) => product_categories)
}

/**
 * Resolve a category from a URL path expressed as an array of
 * handle segments.
 *
 *  - `["kurta"]`               → top-level category "kurta"
 *  - `["fashion", "men"]`      → "men" nested under "fashion"
 *  - `["a", "b", "c"]`         → "c" under "b" under "a"
 *
 * The lookup queries Medusa for the **leaf** handle (last segment),
 * then walks the returned category's `parent_category` chain and
 * verifies that it matches every prior URL segment exactly. This
 * guarantees that each category has exactly one canonical URL — a
 * sub-category cannot be reached via just its leaf handle, only via
 * its full parent-prefixed path.
 *
 * Returns `null` if no category matches the given path, so callers
 * can render a proper 404 with `notFound()`.
 */
/**
 * Collect a category's own id + every descendant category id.
 *
 * Medusa's `category_id` product filter matches ONLY products
 * directly assigned to the given category — it does NOT roll up
 * sub-categories. Without this, a parent category page (e.g.
 * "Mobile") would show nothing once products are filed under leaf
 * categories ("Mobile → Android"). Walking the tree here gives the
 * parent page every product beneath it, matching how brand pages
 * already roll up sub-brands.
 *
 * `allCategories` is the flat list from `listCategories()`. BFS with
 * a visited-set so a corrupted parent loop can't hang the page.
 */
export const collectDescendantCategoryIds = (
  rootId: string,
  allCategories: Array<{ id: string; parent_category_id?: string | null }>
): string[] => {
  const childrenByParent = new Map<string, string[]>()
  for (const c of allCategories) {
    const pid = (c as any).parent_category_id || null
    if (!pid) continue
    if (!childrenByParent.has(pid)) childrenByParent.set(pid, [])
    childrenByParent.get(pid)!.push(c.id)
  }

  const out = new Set<string>()
  const queue = [rootId]
  while (queue.length) {
    const cur = queue.shift()!
    if (out.has(cur)) continue
    out.add(cur)
    for (const child of childrenByParent.get(cur) || []) {
      if (!out.has(child)) queue.push(child)
    }
  }
  return Array.from(out)
}

export const getCategoryByHandle = async (categoryHandle: string[]) => {
  if (!categoryHandle?.length) return null

  const leafHandle = categoryHandle[categoryHandle.length - 1]

  const next = {
    ...(await getCacheOptions("categories")),
  }

  const { product_categories } = await sdk.client.fetch<
    HttpTypes.StoreProductCategoryListResponse
  >(`/store/product-categories`, {
    query: {
      fields: CATEGORY_FIELDS,
      handle: leafHandle,
    },
    next,
    cache: "force-cache",
  })

  // Medusa may return more than one category with the same leaf
  // handle if the admin has duplicated names under different
  // parents. Pick the one whose ancestor chain exactly matches the
  // requested URL segments.
  for (const cat of product_categories || []) {
    const actual: string[] = [cat.handle]
    let parent: any = (cat as any).parent_category
    while (parent && parent.handle) {
      actual.unshift(parent.handle)
      parent = parent.parent_category
    }
    if (actual.length !== categoryHandle.length) continue
    let match = true
    for (let i = 0; i < actual.length; i++) {
      if (actual[i] !== categoryHandle[i]) {
        match = false
        break
      }
    }
    if (match) return cat
  }

  return null
}
