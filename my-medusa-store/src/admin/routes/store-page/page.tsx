import { defineRouteConfig } from "@medusajs/admin-sdk"
import TopCategoryEditor from "../../components/top-category-editor"
import PageBuilderHeader from "../../components/page-builder-header"

/**
 * Store Page editor — mirrors the Homepage editor, for the /store page.
 *
 * v1: choose how the top category bar behaves on the Store page (show all /
 * choose specific / hide), independent of the homepage. Built to grow —
 * more Store page blocks (featured collections, filters, banners) can be
 * stacked here later.
 *
 * The top-category selection is stored in site_settings under
 * `store_top_categories` and read by the storefront's
 * CategoryCarouselServer on /store.
 */
const StorePageEditor = () => {
  return (
    <div className="flex flex-col gap-y-3">
      <PageBuilderHeader
        page="Store Page"
        subtitle="Compose the /store page from blocks. Right now you can control the top category bar; more blocks will appear here over time."
      />

      <TopCategoryEditor
        settingKey="store_top_categories"
        title="Top Category Bar"
        description="Choose how the top category rail behaves on the Store page: show all categories, pick specific ones (drag to reorder), or hide it completely."
      />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Store Page",
})

export default StorePageEditor
