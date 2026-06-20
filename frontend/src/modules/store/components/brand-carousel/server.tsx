import { listBrands } from "@lib/data/brands"
import CategoryCarousel, { CategoryCarouselItem } from "@modules/home/components/category-carousel"
import { buildBrandPath } from "@lib/util/brand-path"

/**
 * Server wrapper: fetches active brands and maps them into the shared
 * carousel component. Brands use `logo_url` as their icon — same clean
 * PNG style as categories (no borders, no circles).
 */
export default async function BrandCarouselServer() {
  let items: CategoryCarouselItem[] = []
  try {
    const brands = await listBrands()
    items = (brands || [])
      .filter((b) => b.is_active)
      .slice(0, 30)
      .map((b) => ({
        id: b.id,
        name: b.name,
        handle: buildBrandPath(b, brands) || b.handle,
        image: b.logo_url || null,
      }))
  } catch (e) {
    console.error("[brand-carousel] failed to load brands", e)
  }

  if (!items.length) return null
  return (
    <CategoryCarousel
      items={items}
      linkPrefix="/"
      ariaLabel="Shop by brand"
    />
  )
}
