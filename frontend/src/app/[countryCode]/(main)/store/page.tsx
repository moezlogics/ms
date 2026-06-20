import { Metadata } from "next"
import { getSiteSettings } from "@lib/data/site-settings"
import { parseCategoryBar } from "@lib/util/category-bar"
import { canonicalUrl, ROBOTS_INDEX } from "@lib/util/seo-url"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import StoreTemplate from "@modules/store/templates"
import CategoryCarouselServer from "@modules/home/components/category-carousel/server"
import CollectionGalleryServer from "@modules/store/components/collection-gallery/server"
// Stays force-dynamic — StoreTemplate reads auth cookies + no-store, so
// ISR (revalidate) would 500 the route (see [...slug]/page.tsx note).
export const dynamic = "force-dynamic"

type Params = {
  searchParams: Promise<{
    sortBy?: SortOptions
    page?: string
    minPrice?: string
    maxPrice?: string
    inStock?: string
    [key: string]: any
  }>
  params: Promise<{ countryCode: string }>
}

export async function generateMetadata({ params, searchParams }: Params): Promise<Metadata> {
  await params
  const resolvedSearchParams = await searchParams
  const settings = await getSiteSettings()
  const siteName = settings.site_name || "Store"
  const title =
    settings.seo_store_title || "Shop All Products"
  const description =
    settings.seo_store_description ||
    `Browse all products at ${siteName}. Free shipping on qualifying orders.`
  // Public URL is `/store` — middleware adds `/<countryCode>` internally
  // for routing only. Canonical MUST mirror what the user sees.
  const url = canonicalUrl("/store")

  const hasFilterParams = Object.entries(resolvedSearchParams || {}).some(
    ([key, val]) => (key.startsWith("spec_") || ["minPrice", "maxPrice", "inStock", "sortBy", "page"].includes(key)) && val
  )

  return {
    title: settings.seo_store_title || "Shop",
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
    robots: hasFilterParams
      ? { index: false, follow: true }
      : ROBOTS_INDEX,
  }
}

export default async function StorePage(props: Params) {
  const params = await props.params
  const searchParams = await props.searchParams
  const { sortBy, page, minPrice, maxPrice, inStock } = searchParams

  // Admin-curated top category bar for the Store page (Store Page editor).
  // mode "all" → all top-level; "custom" → chosen ids; "hidden" → no bar.
  const settings = await getSiteSettings()
  const topCategoryBar = parseCategoryBar((settings as any).store_top_categories)

  return (
    <div className="flex flex-col gap-y-4 md:gap-y-6 pb-8">
      {/* Category icons rail */}
      {!topCategoryBar.hidden && (
        <div className="pt-4 md:pt-6">
          <CategoryCarouselServer
            selectedIds={topCategoryBar.ids}
            hidden={topCategoryBar.hidden}
          />
        </div>
      )}

      {/* Product grid with filters */}
      <StoreTemplate
        sortBy={sortBy}
        page={page}
        countryCode={params.countryCode}
        minPrice={minPrice}
        maxPrice={maxPrice}
        inStock={inStock}
        searchParams={searchParams}
      />

      {/* Collection gallery — creative masonry below products */}
      <CollectionGalleryServer />
    </div>
  )
}
