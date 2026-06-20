// Server-only data function → hit the backend directly (internal/localhost)
// instead of looping out through the public domain + Cloudflare. Prefer the
// internal URL; fall back to the public one, then localhost (3062 — the
// backend's real port).
const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:3062"

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const STORE_HEADERS: Record<string, string> = PUBLISHABLE_KEY
  ? { "x-publishable-api-key": PUBLISHABLE_KEY }
  : {}

/**
 * Resolves the set of category_ids and brand_ids that are actually
 * relevant for the current archive scope. Powers the sidebar's
 * "hybrid" mode — see backend route `/store/active-filters` for the
 * end-to-end logic.
 *
 *   `getActiveFilters({ categoryId: "cat_xxx" })`
 *     → categories that share products with that category PLUS
 *       brands appearing in that category.
 *   `getActiveFilters({ productIds: ["p1", ...] })`
 *     → categories + brands present across that exact product set.
 *
 * When neither argument is supplied, returns empty arrays — callers
 * treat empty as "show everything" (e.g. the /store page).
 *
 * Result is intentionally cached for 60s at the Next.js fetch layer
 * since it's purely a function of the inputs.
 */
export type ActiveFilters = {
  category_ids: string[]
  brand_ids: string[]
}

export async function getActiveFilters(opts: {
  categoryId?: string
  productIds?: string[]
}): Promise<ActiveFilters> {
  const { categoryId, productIds } = opts
  const params = new URLSearchParams()
  if (categoryId) params.set("category_id", categoryId)
  if (productIds && productIds.length) {
    params.set("product_ids", productIds.slice(0, 2000).join(","))
  }
  if (![...params.keys()].length) {
    return { category_ids: [], brand_ids: [] }
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/store/active-filters?${params.toString()}`,
      {
        headers: STORE_HEADERS,
        // Filter narrowing depends on product/category/brand
        // relationships, so we bind the cache entry to the same
        // global tags the backend subscriber emits. That way a
        // product / category / brand edit drops this immediately
        // instead of waiting up to 60s for the time-based fallback.
        next: {
          revalidate: 60,
          tags: ["active-filters", "products", "categories", "brands"],
        },
        cache: "force-cache",
      }
    )
    if (!res.ok) return { category_ids: [], brand_ids: [] }
    const json = await res.json()
    return {
      category_ids: Array.isArray(json.category_ids) ? json.category_ids : [],
      brand_ids: Array.isArray(json.brand_ids) ? json.brand_ids : [],
    }
  } catch {
    return { category_ids: [], brand_ids: [] }
  }
}
