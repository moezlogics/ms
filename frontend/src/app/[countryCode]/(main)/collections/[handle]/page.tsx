import { Metadata } from "next"
import { notFound } from "next/navigation"

import { getCollectionByHandle, listCollections } from "@lib/data/collections"
import { listRegions } from "@lib/data/regions"
import { StoreCollection, StoreRegion } from "@medusajs/types"
import CollectionTemplate from "@modules/collections/templates"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"
import { canonicalUrl } from "@lib/util/seo-url"
import BreadcrumbJsonLd from "@modules/common/components/breadcrumb-jsonld"

/**
 * Same DYNAMIC_SERVER_USAGE situation as products/categories/brands:
 * `StoreTemplate` reads auth + uses `cache:"no-store"` in places, and
 * the page exports `generateStaticParams`. Without this opt-in, every
 * collection page 500s in production. See products/[handle]/page.tsx
 * for the longer explanation.
 */
export const dynamic = "force-dynamic"

type Props = {
  params: Promise<{ handle: string; countryCode: string }>
  searchParams: Promise<{
    page?: string
    sortBy?: SortOptions
    [key: string]: any
  }>
}

export const PRODUCT_LIMIT = 12

export async function generateStaticParams() {
  const { collections } = await listCollections({
    fields: "*products",
  })

  if (!collections) {
    return []
  }

  const countryCodes = await listRegions().then(
    (regions: StoreRegion[]) =>
      regions
        ?.map((r) => r.countries?.map((c) => c.iso_2))
        .flat()
        .filter(Boolean) as string[]
  )

  const collectionHandles = collections.map(
    (collection: StoreCollection) => collection.handle
  )

  const staticParams = countryCodes
    ?.map((countryCode: string) =>
      collectionHandles.map((handle: string | undefined) => ({
        countryCode,
        handle,
      }))
    )
    .flat()

  return staticParams
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const searchParams = await props.searchParams
  const collection = await getCollectionByHandle(params.handle)

  if (!collection) {
    notFound()
  }

  const meta = (collection as any).metadata || {}
  const title = meta.meta_title?.trim() || collection.title
  const description =
    meta.meta_description?.trim() ||
    `Shop the ${collection.title} collection.`
  const url = canonicalUrl(`/collections/${params.handle}`)
  const featuredImage = meta.featured_image as string | undefined

  const hasFilterParams = Object.entries(searchParams || {}).some(
    ([key, val]) => (key.startsWith("spec_") || ["minPrice", "maxPrice", "inStock", "sortBy", "page"].includes(key)) && val
  )

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      ...(featuredImage && { images: [{ url: featuredImage, width: 1920, height: 480, alt: collection.title }] }),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(featuredImage ? { images: [featuredImage] } : {}),
    },
    alternates: { canonical: url },
    robots: hasFilterParams
      ? { index: false, follow: true }
      : {
          index: true,
          follow: true,
          googleBot: { index: true, follow: true, "max-image-preview": "large" },
        },
  }
}

export default async function CollectionPage(props: Props) {
  const searchParams = await props.searchParams
  const params = await props.params
  const { sortBy, page } = searchParams

  const collection = await getCollectionByHandle(params.handle).then(
    (collection: StoreCollection) => collection
  )

  if (!collection) {
    notFound()
  }

  // Note: `metadata.featured_image` is intentionally NOT rendered as a
  // top banner here anymore — per design feedback the collection page
  // should open straight onto the product grid. The image is still
  // exposed via OpenGraph / Twitter card metadata above for SEO + link
  // previews, and the storefront `/store` page surfaces it in the
  // Pinterest-style collection gallery below the products.

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: collection.title,
    description: (collection as any).metadata?.meta_description || `Shop the ${collection.title} collection.`,
    url: canonicalUrl(`/collections/${params.handle}`),
  }

  const breadcrumbs = [
    { name: "Home", href: "/" },
    { name: "Shop", href: "/store" },
    { name: collection.title },
  ]

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <BreadcrumbJsonLd
        countryCode={params.countryCode}
        items={breadcrumbs}
      />
      <CollectionTemplate
        collection={collection}
        page={page}
        sortBy={sortBy}
        countryCode={params.countryCode}
        searchParams={searchParams}
      />
    </>
  )
}
