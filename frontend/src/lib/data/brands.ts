import { cache } from "react"
// Server-side (brand pages, brands sidebar, per-product brand enrichment on
// every product list) → hit the backend directly (internal/localhost), not
// through the public domain + Cloudflare. On the client `MEDUSA_BACKEND_URL`
// isn't inlined, so it falls back to the public url automatically.
const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:3062"

const PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

/**
 * Medusa V2 enforces an `x-publishable-api-key` header on every
 * `/store/*` route — without it the backend returns 400 and the
 * brand carousel silently renders nothing. Every helper below MUST
 * include this header (see other `lib/data/*.ts` files for the same
 * pattern).
 */
const STORE_HEADERS: Record<string, string> = PUBLISHABLE_KEY
  ? { "x-publishable-api-key": PUBLISHABLE_KEY }
  : {}

export type Brand = {
  id: string
  name: string
  handle: string
  logo_url: string | null
  description: string | null
  website_url: string | null
  seo_title: string | null
  seo_description: string | null
  sort_order: number
  is_active: boolean
  /** Null for top-level brands; otherwise points at parent brand.id. */
  parent_id: string | null
  created_at: string
  updated_at: string
}

export const listBrands = cache(async function listBrands(): Promise<Brand[]> {
  const res = await fetch(`${BACKEND_URL}/store/brands`, {
    headers: STORE_HEADERS,
    next: { revalidate: 60, tags: ["brands"] },
    cache: "force-cache",
  })

  if (!res.ok) return []
  const json = await res.json()
  return json.brands || []
})

export async function getBrandForProduct(
  productId: string
): Promise<Brand | null> {
  const res = await fetch(
    `${BACKEND_URL}/store/brands?product_id=${encodeURIComponent(productId)}`,
    {
      headers: STORE_HEADERS,
      next: { revalidate: 60, tags: ["brands"] },
      cache: "force-cache",
    }
  )
  if (!res.ok) return null
  const json = await res.json()
  return json.brand || null
}

/**
 * Resolves a single brand handle. The response also includes the
 * descendant `product_ids` (so /brands/apple shows iPhone + Mac
 * products too) and the immediate `children` sub-brands so the
 * page can render a "Browse Apple Mac · iPhone · …" rail.
 */
export async function getBrandByHandle(
  handle: string
): Promise<{ brand: Brand; product_ids: string[]; children: Brand[] } | null> {
  const res = await fetch(`${BACKEND_URL}/store/brands/${handle}`, {
    headers: STORE_HEADERS,
    next: { revalidate: 60, tags: ["brands"] },
    cache: "force-cache",
  })

  if (!res.ok) return null
  const json = await res.json()
  return {
    brand: json.brand,
    product_ids: json.product_ids || [],
    children: json.children || [],
  }
}

/**
 * Resolve a nested brand URL like `/brands/apple/mac` → walks the
 * full chain on the backend so any handle pretending to be nested
 * (e.g. /brands/foo/bar where bar is actually a top-level brand)
 * properly 404s.
 *
 * Returns:
 *   - brand:        the leaf brand object
 *   - chain:        breadcrumb-ready list (root → leaf)
 *   - children:     immediate sub-brands of `brand`
 *   - product_ids:  brand's own + every descendant's products
 *   - null          on 404 / network error so callers can `notFound()`
 */
export async function getBrandByPath(
  segments: string[]
): Promise<{
  brand: Brand
  chain: { id: string; name: string; handle: string; parent_id: string | null }[]
  children: Brand[]
  product_ids: string[]
} | null> {
  const cleaned = (segments || []).filter(Boolean)
  if (cleaned.length === 0) return null

  // Medusa V2's file-based router can't represent a catch-all
  // segment (`[...path]` crashes path-to-regexp at startup), so the
  // backend exposes this as `/store/brands/path?path=apple/mac`
  // instead. We build the value with raw "/" joins and let
  // URLSearchParams handle the encoding so individual handles with
  // odd characters still survive the round-trip.
  const params = new URLSearchParams({ path: cleaned.join("/") })
  const res = await fetch(
    `${BACKEND_URL}/store/brands/path?${params.toString()}`,
    {
      headers: STORE_HEADERS,
      next: { revalidate: 60, tags: ["brands"] },
      cache: "force-cache",
    }
  )

  if (!res.ok) return null
  const json = await res.json()
  return {
    brand: json.brand,
    chain: json.chain || [],
    children: json.children || [],
    product_ids: json.product_ids || [],
  }
}

/**
 * Resolve the DIRECT brand for a specific set of product IDs.
 * Returns a Record<productId, Brand> containing only products that
 * actually have a brand link.
 *
 * Scoped to the products passed in (normally the current grid page)
 * and served by a single bulk endpoint, so there is no N+1 fan-out.
 *
 * IMPORTANT: this uses the direct `brand_product` link table — NOT
 * the descendant roll-up from `getBrandByHandle`. A product linked to
 * a sub-brand (e.g. "Apple Mac") therefore maps to that sub-brand,
 * never to its parent, and its canonical URL stays stable. The old
 * implementation looped over every brand's rolled-up product_ids and
 * raced on the writes, so sub-brand products got mislabelled.
 */
export async function getProductBrandMap(
  productIds: string[]
): Promise<Record<string, Brand>> {
  const ids = (productIds || []).filter(Boolean)
  if (!ids.length) return {}

  const params = new URLSearchParams({ product_ids: ids.join(",") })
  const res = await fetch(
    `${BACKEND_URL}/store/brands/by-products?${params.toString()}`,
    {
      headers: STORE_HEADERS,
      next: { revalidate: 60, tags: ["brands"] },
      cache: "force-cache",
    }
  )

  if (!res.ok) return {}
  const json = await res.json()
  return json.brands || {}
}

/**
 * Full catalog product → DIRECT brand map. Use only where the whole
 * catalog is processed at once (e.g. the search index) and product
 * ids can't be passed individually. For a specific page of products
 * prefer `getProductBrandMap(ids)` — it's scoped and cheaper.
 */
export async function getAllProductBrandMap(): Promise<Record<string, Brand>> {
  const res = await fetch(`${BACKEND_URL}/store/brands/by-products`, {
    headers: STORE_HEADERS,
    next: { revalidate: 60, tags: ["brands"] },
    cache: "force-cache",
  })

  if (!res.ok) return {}
  const json = await res.json()
  return json.brands || {}
}
