import { listCategories } from "@lib/data/categories"
import CategoryCarousel, { CategoryCarouselItem } from "./index"

/**
 * Server wrapper for the top category rail.
 *
 * Two modes:
 *   • `selectedIds` provided (admin picked specific categories in the
 *     Homepage / Store Page editor) → show EXACTLY those categories, in the
 *     given order. Lets admins curate the top bar per page.
 *   • otherwise → fall back to all top-level (parentless) categories, first
 *     20, so an unconfigured store still shows its main departments.
 *
 * Category images come from `metadata.image` (string URL). Admins set this
 * via the built-in Medusa category editor's metadata fields.
 */
function toItem(c: any): CategoryCarouselItem {
  return {
    id: c.id,
    name: c.name,
    handle: c.handle,
    image:
      (typeof c.metadata?.image === "string" && c.metadata.image) ||
      (typeof c.metadata?.thumbnail === "string" && c.metadata.thumbnail) ||
      null,
  }
}

export default async function CategoryCarouselServer({
  selectedIds,
  hidden,
}: {
  /** Ordered category IDs the admin chose for this page's top bar. */
  selectedIds?: string[]
  /** Admin chose to hide the category bar entirely on this page. */
  hidden?: boolean
} = {}) {
  // Explicitly hidden by the admin → render nothing.
  if (hidden) return null

  let items: CategoryCarouselItem[] = []
  try {
    const categories = (await listCategories({ limit: 200 })) || []

    if (selectedIds && selectedIds.length) {
      // Admin-curated: keep only the picked categories, in the picked order.
      const byId = new Map(categories.map((c: any) => [c.id, c]))
      items = selectedIds
        .map((id) => byId.get(id))
        .filter(Boolean)
        .map((c: any) => toItem(c))
    } else {
      // Default: top-level departments.
      items = categories
        .filter((c: any) => !c.parent_category_id)
        .slice(0, 20)
        .map((c: any) => toItem(c))
    }
  } catch (e) {
    console.error("[category-carousel] failed to load categories", e)
  }

  if (!items.length) return null
  return <CategoryCarousel items={items} />
}
