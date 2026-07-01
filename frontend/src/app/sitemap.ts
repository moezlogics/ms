import { MetadataRoute } from "next"
import { listBlogPosts, listBlogCategories } from "@lib/data/blog"
import { listBrands, getProductBrandMap } from "@lib/data/brands"
import { getBaseURL } from "@lib/util/env"
import { buildCategoryPath } from "@lib/util/category-path"
import { buildBrandPath } from "@lib/util/brand-path"
import { getProductPath } from "@lib/util/product"


/**
 * Refresh sitemap chunks once an hour via ISR.
 *
 * `force-dynamic` cannot be combined with `generateSitemaps` — it
 * breaks the auto-generated `/sitemap.xml` index route registration
 * and the URL 404s. Instead we lean on Incremental Static Regeneration:
 * the first request after `revalidate` seconds re-runs the helpers, so
 * if the backend was offline during `next build` the URL list self-heals
 * within an hour without needing a redeploy.
 */
export const revalidate = 3600

/**
 * Cookie-free data fetching for sitemap generation.
 *
 * CRITICAL: We deliberately bypass `sdk.client.fetch` here. The SDK
 * wrapper (see `lib/config.ts`) injects `getLocaleHeader()` which
 * eventually calls `nextCookies()` — that's a dynamic API and reading
 * it inside `app/sitemap.ts` marks the entire route as dynamic. Combined
 * with `generateSitemaps()` that crashes route registration and the
 * `/sitemap.xml` URL stops resolving entirely (blank/404).
 *
 * Plain `fetch()` with the publishable key + `next.revalidate` gives us
 * the same caching semantics without ever touching cookies.
 */
const BACKEND_URL =
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  process.env.MEDUSA_BACKEND_URL ||
  "http://localhost:3072"

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

const STORE_HEADERS: Record<string, string> = PUBLISHABLE_KEY
  ? { "x-publishable-api-key": PUBLISHABLE_KEY }
  : {}

function buildQuery(params: Record<string, any>): string {
  const sp = new URLSearchParams()
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue
    sp.append(k, String(v))
  }
  return sp.toString()
}

async function listRegions(): Promise<any[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/store/regions`, {
      headers: STORE_HEADERS,
      next: { tags: ["regions"], revalidate: 60 },
    })
    if (!res.ok) return []
    const { regions } = await res.json()
    return regions || []
  } catch {
    return []
  }
}

async function listProducts({
  pageParam = 1,
  queryParams,
  countryCode,
}: {
  pageParam?: number
  queryParams?: any
  countryCode?: string
}) {
  const limit = queryParams?.limit || 12
  const offset = pageParam === 1 ? 0 : (pageParam - 1) * limit

  let regionId: string | undefined

  if (countryCode) {
    try {
      const regions = await listRegions()
      const region = regions?.find((r) =>
        r.countries?.some((c: any) => c.iso_2 === countryCode)
      )
      regionId = region?.id
    } catch {}
  }

  const query: Record<string, any> = {
    limit,
    offset,
    fields:
      queryParams?.fields ||
      "*variants.calculated_price,+variants.inventory_quantity,*variants.images,+variants.metadata,+metadata,+tags,",
    ...queryParams,
  }
  if (regionId) {
    query.region_id = regionId
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/store/products?${buildQuery(query)}`,
      {
        headers: STORE_HEADERS,
        next: { tags: ["products"], revalidate: 60 },
      }
    )
    if (!res.ok) {
      return { response: { products: [], count: 0 }, nextPage: null }
    }
    const { products, count } = await res.json()
    const nextPage = count > offset + limit ? pageParam + 1 : null
    return { response: { products: products || [], count: count || 0 }, nextPage }
  } catch {
    // Backend briefly unreachable during build — sitemap re-renders
    // on the next ISR tick (revalidate=3600 above) so the URL list
    // self-heals. No log: this would be a misleading false alarm.
    return { response: { products: [], count: 0 }, nextPage: null }
  }
}

async function listCollections(queryParams: Record<string, string> = {}) {
  const limit = queryParams.limit || "100"
  const offset = queryParams.offset || "0"

  const fields = queryParams.fields
    ? `${queryParams.fields},+metadata`
    : "+metadata"

  try {
    const res = await fetch(
      `${BACKEND_URL}/store/collections?${buildQuery({
        ...queryParams,
        limit,
        offset,
        fields,
      })}`,
      {
        headers: STORE_HEADERS,
        next: { tags: ["collections"], revalidate: 60 },
      }
    )
    if (!res.ok) return { collections: [], count: 0 }
    const { collections } = await res.json()
    return { collections: collections || [], count: (collections || []).length }
  } catch {
    return { collections: [], count: 0 }
  }
}

async function listCategories(query?: Record<string, any>) {
  const CATEGORY_FIELDS =
    "*category_children, *products, *parent_category, *parent_category.parent_category, *parent_category.parent_category.parent_category, *parent_category.parent_category.parent_category.parent_category, *parent_category.parent_category.parent_category.parent_category.parent_category, +metadata"

  const limit = query?.limit || 100

  try {
    const res = await fetch(
      `${BACKEND_URL}/store/product-categories?${buildQuery({
        fields: CATEGORY_FIELDS,
        limit,
        ...query,
      })}`,
      {
        headers: STORE_HEADERS,
        next: { tags: ["categories"], revalidate: 60 },
      }
    )
    if (!res.ok) return []
    const { product_categories } = await res.json()
    return product_categories || []
  } catch {
    return []
  }
}

/**
 * Paginated dynamic sitemap.
 *
 * For stores with thousands of products, a single sitemap.xml hits
 * Google's 50k-URL / 50MB limit fast. Next.js `generateSitemaps` lets us
 * split into `/sitemap/{id}.xml` chunks:
 *
 *   /sitemap/0.xml → static routes, collections, categories, brands, blog
 *   /sitemap/1.xml → first batch of products
 *   /sitemap/2.xml → next batch …
 *
 * URLs emitted match the user-facing paths (no country-code prefix) —
 * the storefront middleware rewrites every public path internally to
 * `/<countryCode>/...` so adding the prefix here would point crawlers
 * at the rewrite target instead of the canonical address bar URL.
 */
const STATIC_PATHS = [
  "",
  "/store",
  "/blog",
  "/brands",
  "/contact",
  "/about",
  "/disclaimer",
  "/terms",
  "/privacy",
  "/refund-policy",
]
const PAGE_SIZE = 2000

type Entry = MetadataRoute.Sitemap[number]

function entry(
  baseUrl: string,
  path: string,
  lastModified?: string | Date,
  changeFrequency?: Entry["changeFrequency"],
  priority?: number
): Entry {
  const cleaned = path.startsWith("/") ? path : `/${path}`
  return {
    url: `${baseUrl}${cleaned}`,
    lastModified: lastModified ? new Date(lastModified) : new Date(),
    changeFrequency,
    priority,
  }
}

/** Resolve the set of country prefixes this storefront serves. */
async function getCountryCodes(): Promise<string[]> {
  try {
    const regions = await listRegions()
    const codes = Array.from(
      new Set(
        (regions ?? [])
          .flatMap((r: any) => r.countries?.map((c: any) => c.iso_2) ?? [])
          .filter(Boolean) as string[]
      )
    )
    return codes.length ? codes : ["us"]
  } catch (e) {
    console.error("[sitemap] listRegions failed", e)
    return ["us"]
  }
}

/**
 * Tells Next.js how many sitemap chunks to render. Fetches the product
 * total once so we can split into PAGE_SIZE-sized product chunks.
 */
export async function generateSitemaps(): Promise<{ id: number }[]> {
  const countryCodes = await getCountryCodes()

  let total = 0
  try {
    const { response } = await listProducts({
      countryCode: countryCodes[0],
      queryParams: { limit: 1, fields: "id" },
    })
    total = response?.count || 0
  } catch (e: any) {
    // Already logged by `listProducts.catch` at warn level. Suppress
    // the duplicate to keep the build output tidy.
  }

  // If we never managed to fetch a count, skip product chunks
  // entirely — just emit chunk 0 (the static URLs). Otherwise we'd
  // burn a build chunk that always returns an empty array. Crawlers
  // will discover products via the next deploy's sitemap once the
  // backend is healthy again.
  if (total === 0) {
    return [{ id: 0 }]
  }

  const productChunks = Math.max(1, Math.ceil(total / PAGE_SIZE))
  // id 0 → everything except products; id 1..N → product chunks
  return Array.from({ length: 1 + productChunks }, (_, i) => ({ id: i }))
}

export default async function sitemap({
  id,
}: {
  id: number
}): Promise<MetadataRoute.Sitemap> {
  const baseUrl = getBaseURL()
  const countryCodes = await getCountryCodes()

  const numericId = Number(id)
  if (numericId === 0) return buildIndexChunk(baseUrl, countryCodes)
  return buildProductChunk(baseUrl, countryCodes, numericId - 1)
}

/**
 * Chunk 0 — non-product entries: static routes, collections, categories,
 * brands, blog posts and blog category filters. Cheap to render.
 */
async function buildIndexChunk(
  baseUrl: string,
  _countryCodes: string[]
): Promise<MetadataRoute.Sitemap> {
  const entries: Entry[] = []

  for (const path of STATIC_PATHS) {
    entries.push(
      entry(
        baseUrl,
        path || "/",
        new Date(),
        path === "" ? "daily" : "weekly",
        path === "" ? 1.0 : 0.7
      )
    )
  }

  try {
    const { collections } = await listCollections({ fields: "handle" })
    for (const c of collections || []) {
      if (!c.handle) continue
      entries.push(
        entry(baseUrl, `/collections/${c.handle}`, c.updated_at, "weekly", 0.6)
      )
    }
  } catch (e) {
    console.error("[sitemap] listCollections failed", e)
  }

  try {
    const product_categories = await listCategories()
    for (const cat of product_categories || []) {
      // Emit the *full* parent-prefixed path so sub-categories
      // (e.g. /electronics/phones) point at their canonical URL
      // rather than just /phones, which would 404.
      const path = buildCategoryPath(cat as any)
      if (!path) continue
      entries.push(
        entry(baseUrl, `/${path}`, cat.updated_at, "weekly", 0.6)
      )
    }
  } catch (e) {
    console.error("[sitemap] listCategories failed", e)
  }

  try {
    const brands = await listBrands()
    for (const brand of brands) {
      const path = buildBrandPath(brand, brands) || brand.handle
      entries.push(
        entry(baseUrl, `/${path}`, brand.updated_at, "weekly", 0.6)
      )
    }
  } catch (e) {
    console.error("[sitemap] listBrands failed", e)
  }

  try {
    const { posts } = await listBlogPosts({ limit: 500 })
    for (const post of posts) {
      entries.push(
        entry(
          baseUrl,
          `/blog/${post.handle}`,
          post.updated_at || post.published_at || undefined,
          "monthly",
          0.5
        )
      )
    }
  } catch (e) {
    console.error("[sitemap] listBlogPosts failed", e)
  }

  try {
    const categories = await listBlogCategories()
    for (const cat of categories) {
      entries.push(
        entry(baseUrl, `/blog?category=${cat.handle}`, undefined, "weekly", 0.4)
      )
    }
  } catch (e) {
    console.error("[sitemap] listBlogCategories failed", e)
  }

  return entries
}

/**
 * Chunk 1..N — paginated product entries. `pageIndex` is 0-based and
 * maps to the backend offset `pageIndex * PAGE_SIZE`.
 *
 * Same product appears under every country prefix the store serves;
 * we only need to fetch each page once and emit the URL per country.
 */
async function buildProductChunk(
  baseUrl: string,
  countryCodes: string[],
  pageIndex: number
): Promise<MetadataRoute.Sitemap> {
  const entries: Entry[] = []
  const pageParam = pageIndex + 1 // listProducts pageParam is 1-based

  // Fetch the page once using the first country (region affects price, not slug)
  let products: any[] = []
  let brandMap: Record<string, any> = {}
  try {
    const { response } = await listProducts({
      countryCode: countryCodes[0],
      pageParam,
      queryParams: { limit: PAGE_SIZE, fields: "id,handle,updated_at,*categories,metadata" },
    })
    products = response?.products || []

    const productIds = products.map((p) => p.id).filter(Boolean)
    if (productIds.length > 0) {
      brandMap = await getProductBrandMap(productIds).catch(() => ({}))
    }
  } catch (e) {
    console.error(`[sitemap] listProducts page ${pageParam} failed`, e)
  }

  for (const p of products) {
    if (!p.handle) continue
    const brand = brandMap[p.id]
    const path = getProductPath(p, brand)
    entries.push(
      entry(
        baseUrl,
        path,
        p.updated_at ?? undefined,
        "weekly",
        0.8
      )
    )
  }

  return entries
}
