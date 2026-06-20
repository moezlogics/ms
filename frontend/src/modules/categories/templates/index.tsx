import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import StoreTemplate from "@modules/store/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import CategoryCarousel from "@modules/home/components/category-carousel"
import { buildCategoryPath } from "@lib/util/category-path"
import { listCategories, collectDescendantCategoryIds } from "@lib/data/categories"

export default async function CategoryTemplate({
  category,
  sortBy,
  page,
  countryCode,
  searchParams,
}: {
  category: HttpTypes.StoreProductCategory
  sortBy?: SortOptions
  page?: string
  countryCode: string
  searchParams?: any
}) {
  if (!category || !countryCode) notFound()

  // Roll the parent category up over its whole subtree so its archive
  // page shows products filed under sub-categories too (Medusa's
  // category_id filter is not recursive on its own).
  const allCategories = await listCategories().catch(() => [])
  const categoryIds = collectDescendantCategoryIds(
    category.id,
    allCategories as any[]
  )

  // Build breadcrumb chain (reversed so root is first). Each
  // breadcrumb href uses the *full* parent-prefixed path so that
  // intermediate categories link to their canonical URL, not to a
  // possibly-404ing leaf-only handle.
  const parents: HttpTypes.StoreProductCategory[] = []
  const getParents = (cat: HttpTypes.StoreProductCategory) => {
    if (cat.parent_category) {
      parents.unshift(cat.parent_category)
      getParents(cat.parent_category)
    }
  }
  getParents(category)

  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/store" },
    ...parents.map((p) => ({
      label: p.name,
      href: `/${buildCategoryPath(p)}`,
    })),
    { label: category.name },
  ]

  // Pre-compute the current category's path so subcategory carousel
  // items can be rendered as `<parent path>/<child handle>` without
  // needing each child to re-walk its parent chain.
  const currentPath = buildCategoryPath(category)

  const richContent = (category as any).metadata?.content as string | undefined

  return (
    <>
      <StoreTemplate
        categoryId={category.id}
        categoryIds={categoryIds}
        currentCategoryHandle={category.handle}
        currentCategoryName={category.name}
        title={category.name}
        breadcrumbs={breadcrumbs}
        sortBy={sortBy}
        page={page}
        countryCode={countryCode}
        searchParams={searchParams}
      >
        {/* Subcategory icons — same clean style as homepage/store */}
        {category.category_children && category.category_children.length > 0 && (
          <div className="-mx-4 md:mx-0">
            <CategoryCarousel
              items={category.category_children.map((c) => ({
                id: c.id,
                name: c.name,
                // The `handle` field on CategoryCarouselItem is used
                // as the link slug — pass the full parent-prefixed
                // path so the carousel emits canonical URLs.
                handle: `${currentPath}/${c.handle}`,
                image: (c as any).metadata?.image || null,
              }))}
            />
          </div>
        )}
      </StoreTemplate>

      {/* Rich content from admin — rendered below products */}
      {richContent && (
        <div className="container-anvogue pb-12">
          <div className="border-t border-line pt-8 mt-4">
            <div
              className="prose prose-sm max-w-none text-ink/80 leading-relaxed"
              dangerouslySetInnerHTML={{ __html: richContent }}
            />
          </div>
        </div>
      )}
    </>
  )
}
