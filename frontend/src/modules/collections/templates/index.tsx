import { HttpTypes } from "@medusajs/types"
import StoreTemplate from "@modules/store/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

export default function CollectionTemplate({
  sortBy,
  collection,
  page,
  countryCode,
  searchParams,
}: {
  sortBy?: SortOptions
  collection: HttpTypes.StoreCollection
  page?: string
  countryCode: string
  searchParams?: any
}) {
  const breadcrumbs = [
    { label: "Home", href: "/" },
    { label: "Shop", href: "/store" },
    { label: collection.title }
  ]

  const richContent = (collection as any).metadata?.content as string | undefined

  return (
    <>
      <StoreTemplate
        title={collection.title}
        breadcrumbs={breadcrumbs}
        sortBy={sortBy}
        page={page}
        countryCode={countryCode}
        collectionId={collection.id}
        searchParams={searchParams}
      />

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
