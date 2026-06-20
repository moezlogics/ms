// NOTE: deliberately NOT a "use server" module. It's a plain server-side
// data fetcher imported by the PDP server component — and a "use server"
// file may ONLY export async functions, which would break the `export type`
// declarations below (the cause of the "getBundlesForProduct is not
// exported" build error).
const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL ||
  process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL ||
  "http://localhost:3062"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export type BundleVariantPrice = {
  calculated_amount: number
  original_amount: number
  currency_code: string
}

export type BundleVariant = {
  id: string
  title: string
  calculated_price?: BundleVariantPrice | null
  options?: Array<{ id: string; value: string; option_id: string }>
}

export type BundleItemProduct = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
  variants: BundleVariant[]
  options?: Array<{
    id: string
    title: string
    values?: Array<{ id: string; value: string }>
  }>
}

export type BundleItem = {
  id: string
  quantity: number
  product: BundleItemProduct
}

export type Bundle = {
  id: string
  title: string
  product: { id: string; title: string; handle: string; thumbnail: string | null } | null
  items: BundleItem[]
}

/**
 * Fetch bundles where the given product is featured (either as the
 * "main" product or as an item). Used by the PDP bundle card.
 */
export async function getBundlesForProduct(
  productId: string,
  currencyCode: string,
  regionId: string
): Promise<Bundle[]> {
  if (!productId) return []
  const params = new URLSearchParams({
    product_id: productId,
    currency_code: currencyCode,
    region_id: regionId,
  })
  try {
    const res = await fetch(
      `${BACKEND_URL}/store/bundle-products?${params.toString()}`,
      {
        headers: { "x-publishable-api-key": PUBLISHABLE_KEY },
        // Bundle output is a function of the included products. Tag
        // it under `products` so the backend's revalidate-storefront
        // subscriber drops the cached response whenever any product
        // changes (price / stock / title) — no dedicated bundles
        // event needed.
        next: { revalidate: 60, tags: ["products"] },
        cache: "force-cache",
      }
    )
    if (!res.ok) return []
    const json = (await res.json()) as { bundle_products: Bundle[] }
    return json.bundle_products || []
  } catch {
    return []
  }
}
