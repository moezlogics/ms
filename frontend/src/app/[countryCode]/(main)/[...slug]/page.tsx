import { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import React from "react"

import { getCategoryByHandle } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { getSiteSettings } from "@lib/data/site-settings"
import { listProducts } from "@lib/data/products"
import { getBrandByPath, getBrandForProduct, listBrands } from "@lib/data/brands"
import { canonicalUrl } from "@lib/util/seo-url"
import { buildCategoryPath, buildCategoryChain } from "@lib/util/category-path"
import { buildBrandPath, getBrandPath } from "@lib/util/brand-path"
import { getImagesForVariant } from "@lib/util/product"


import ProductTemplate from "@modules/products/templates"
import CategoryTemplate from "@modules/categories/templates"
import StoreTemplate from "@modules/store/templates"
import BreadcrumbJsonLd from "@modules/common/components/breadcrumb-jsonld"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

// ISR: the shared page shell (product / category / brand) is rendered once
// per path and cached for 5 minutes; the backend revalidation subscriber
// purges tags on admin changes for near-instant freshness.
//
// The three previously-proven ISR blockers are all gone:
//  1. no cookies() anywhere in this render tree (layouts + SDK wrapper are
//     cookie-free; per-user UI hydrates client-side via UserDataProvider)
//  2. searchParams is NEVER awaited on the server — v_id gallery selection
//     and archive filters/sort/pagination are applied client-side
//  3. no `cache: "no-store"` fetch in this tree
export const revalidate = 300
type Props = {
  params: Promise<{ slug: string[]; countryCode: string }>
  // NOTE: searchParams intentionally NOT declared/read — awaiting it marks
  // the route dynamic and 500s ISR (proven via runtime logs, session 90b8a9).
}

/**
 * Bulletproof Next.js / SWC Compiler tree-shaking workaround.
 * In Next.js, when a page module has multiple split entry points (e.g. generateMetadata,
 * generateStaticParams, default export SlugPage), the compiler can tree-shake top-level
 * imports that are used only in one of the exports, leading to runtime "ReferenceError: X is not defined"
 * crashes. Exporting a constant referencing these imported utilities forces the compiler
 * to bundle and keep the references alive.
 */
export const _nextJsCompilerWorkaround = {
  buildCategoryChain,
  getImagesForVariant,
}

export async function generateStaticParams() {
  // Return empty array to prevent build failures when backend or publishable keys are missing/offline.
  // Routes will resolve dynamically at runtime.
  return []
}


export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const { slug: segments, countryCode } = params
  if (!segments || segments.length === 0) notFound()
  const lastSegment = segments[segments.length - 1]

  // Filtered/sorted URLs (?spec_*, ?sortBy, ?page …) are noindexed via an
  // X-Robots-Tag header in middleware — query strings are invisible to an
  // ISR render, so robots handling cannot live here anymore.

  // 1. Try Product Match
  const product = await listProducts({
    countryCode,
    queryParams: { handle: lastSegment, limit: 1 },
  }).then(({ response }) => response.products[0]).catch(() => null)

  if (product) {
    // Independent lookups — run in parallel (they were sequential, adding
    // 2 extra serialized backend roundtrips to EVERY product page render).
    const [region, settings, productBrand] = await Promise.all([
      getRegion(countryCode),
      getSiteSettings(),
      getBrandForProduct(product.id).catch(() => null),
    ])
    if (!region) notFound()

    const description =
      product.description?.slice(0, 160) ||
      product.subtitle ||
      `Shop ${product.title} at ${settings.site_name || "our store"}.`

    const images = [
      product.thumbnail,
      ...(product.images?.map((i) => i.url) || []),
    ].filter((v): v is string => !!v)

    const seoTitle =
      (product.metadata as any)?.meta_title || (product.metadata as any)?.seo_title || product.title
    const seoDescription =
      (product.metadata as any)?.meta_description || (product.metadata as any)?.seo_description || description

    const { getProductPath } = await import("@lib/util/product")
    const canonical = canonicalUrl(getProductPath(product, productBrand))


    const firstVariant = product.variants?.[0]
    const price = firstVariant?.calculated_price?.calculated_amount
    const currency =
      firstVariant?.calculated_price?.currency_code || region.currency_code
    const gtinForOg =
      (product.metadata as any)?.gtin13 ||
      (product.metadata as any)?.gtin ||
      (firstVariant as any)?.barcode
    const brandForOg =
      (product.metadata as any)?.brand || product.collection?.title

    const ogProduct: Record<string, string> = {
      "og:type": "product",
      ...(price && {
        "product:price:amount": String(price),
        "product:price:currency": (currency || "PKR").toUpperCase(),
      }),
      "product:availability": (product.variants ?? []).some(
        (v: any) =>
          v.allow_backorder ||
          v.manage_inventory === false ||
          (typeof v.inventory_quantity === "number" && v.inventory_quantity > 0)
      )
        ? "in stock"
        : "out of stock",
      "product:condition": "new",
      "product:retailer_item_id": firstVariant?.sku || product.id,
      ...(gtinForOg && { "product:retailer_part_no": String(gtinForOg) }),
      ...(brandForOg && { "product:brand": String(brandForOg) }),
      ...(product.categories?.[0]?.name && {
        "product:category": product.categories[0].name,
      }),
      // Real system timestamps — ensures Google indexes the actual
      // creation/modification dates instead of spec metadata (launch_date).
      ...(product.created_at && {
        "article:published_time": new Date(product.created_at).toISOString(),
        "publish-date": new Date(product.created_at).toISOString(),
        "pubdate": new Date(product.created_at).toISOString(),
        "date": new Date(product.created_at).toISOString(),
      }),
      ...(product.updated_at && {
        "article:modified_time": new Date(product.updated_at).toISOString(),
        "last-modified": new Date(product.updated_at).toISOString(),
        "revised": new Date(product.updated_at).toISOString(),
        "og:updated_time": new Date(product.updated_at).toISOString(),
      }),
    }

    return {
      title: seoTitle,
      description: seoDescription,
      openGraph: {
        title: seoTitle,
        description: seoDescription,
        type: "website",
        url: canonical,
        images: images.slice(0, 4),
      },
      twitter: {
        card: "summary_large_image",
        title: seoTitle,
        description: seoDescription,
        images: images.slice(0, 1),
      },
      alternates: {
        canonical,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: {
          index: true,
          follow: true,
          "max-image-preview": "large",
          "max-snippet": -1,
        },
      },
      other: ogProduct,
    }
  }

  // 2. Try Brand Match
  const brandData = await getBrandByPath(segments).catch(() => null)
  if (brandData) {
    const { brand } = brandData
    const settings = await getSiteSettings()
    const siteName = settings.site_name || "Store"
    const title = brand.seo_title || brand.name
    const description =
      brand.seo_description ||
      brand.description ||
      `Browse all ${brand.name} products at ${siteName}.`
    const url = canonicalUrl(getBrandPath(brand, []))

    return {
      title: brand.seo_title || brand.name,
      description,
      openGraph: {
        title,
        description,
        type: "website",
        url,
        siteName,
        ...(brand.logo_url ? { images: [{ url: brand.logo_url }] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(brand.logo_url ? { images: [brand.logo_url] } : {}),
      },
      alternates: { canonical: url },
      robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, "max-image-preview": "large" },
      },
    }
  }

  // 3. Try Category Match
  try {
    const productCategory = await getCategoryByHandle(segments)
    if (!productCategory) notFound()
    const meta = (productCategory as any).metadata || {}
    const title = meta.meta_title?.trim() || productCategory.name
    const description =
      meta.meta_description?.trim() ||
      productCategory.description ||
      `Shop ${productCategory.name}.`
    const canonical = canonicalUrl(`/${segments.join("/")}`)
    const ogImage =
      (meta as any).og_image || (productCategory as any).metadata?.image || undefined

    return {
      title,
      description,
      openGraph: {
        title,
        description,
        url: canonical,
        type: "website",
        ...(ogImage ? { images: [ogImage] } : {}),
      },
      twitter: {
        card: "summary_large_image",
        title,
        description,
        ...(ogImage ? { images: [ogImage] } : {}),
      },
      alternates: {
        canonical,
      },
      robots: {
        index: true,
        follow: true,
        googleBot: { index: true, follow: true, "max-image-preview": "large" },
      },
    }
  } catch (error) {
    notFound()
  }
}

export default async function SlugPage(props: Props) {
  const params = await props.params
  const { slug: segments, countryCode } = params

  if (!segments || segments.length === 0) notFound()
  const lastSegment = segments[segments.length - 1]

  // Parallelize the product, brand, and category lookups to optimize TTFB
  const [pricedProduct, brandData, productCategory] = await Promise.all([
    listProducts({
      countryCode,
      queryParams: { handle: lastSegment, limit: 1 },
    }).then(({ response }) => response.products[0]).catch(() => null),
    getBrandByPath(segments).catch(() => null),
    getCategoryByHandle(segments).catch(() => null),
  ])

  if (pricedProduct) {
    // region + brand + brands are independent — one parallel batch instead
    // of two serialized awaits (shaves a backend roundtrip per page view).
    const [region, brand, brands] = await Promise.all([
      getRegion(countryCode),
      getBrandForProduct(pricedProduct.id).catch(() => null),
      listBrands().catch(() => []),
    ])
    if (!region) notFound()

    // All product images render server-side; the ?v_id variant selection
    // narrows the gallery CLIENT-side (an ISR page can't see the query).
    const images = pricedProduct.images ?? []
    const primaryCategory = pricedProduct.categories?.[0]

    const categoryChain = buildCategoryChain(primaryCategory)
    
    const brandChain = brand
      ? (brand.parent_id
          ? ([brands?.find((b) => b?.id === brand.parent_id), brand].filter(Boolean) as any[])
          : [brand])
      : []

    return (
      <>
        <BreadcrumbJsonLd
          countryCode={countryCode}
          items={[
            { name: "Home", href: "/" },
            ...categoryChain.map((c) => ({
              name: c.name,
              href: `/${buildCategoryPath(c)}`,
            })),
            ...brandChain.map((b) => ({
              name: b.name,
              href: `/${buildBrandPath(b, brands)}`,
            })),
            { name: pricedProduct.title },
          ]}
        />
        <ProductTemplate
          product={pricedProduct}
          region={region}
          countryCode={countryCode}
          images={images}
        />
      </>
    )
  }

  // 2. Try Brand Render
  if (brandData) {
    const { brand, chain, children, product_ids } = brandData
    const baseURL = canonicalUrl("/").replace(/\/$/, "")
    const path = segments.map(encodeURIComponent).join("/")

    const jsonLd: Record<string, any> = {
      "@context": "https://schema.org",
      "@type": "Brand",
      name: brand.name,
      url: `${baseURL}/${path}`,
      ...(brand.description ? { description: brand.description } : {}),
      ...(brand.logo_url ? { logo: brand.logo_url } : {}),
      ...(brand.website_url ? { sameAs: [brand.website_url] } : {}),
    }

    const breadcrumbs = [
      { label: "Home", href: "/" },
      { label: "Brands", href: "/brands" },
      ...chain.slice(0, -1).map((c) => ({
        label: c.name,
        href: `/${chain
          .slice(0, chain.findIndex((x) => x.id === c.id) + 1)
          .map((x) => x.handle)
          .join("/")}`,
      })),
      { label: brand.name },
    ]

    return (
      <>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <BreadcrumbJsonLd
          countryCode={countryCode}
          items={breadcrumbs.map((b) => ({ name: b.label, href: b.href }))}
        />

        <StoreTemplate
          title={brand.name}
          breadcrumbs={breadcrumbs}
          productsIds={product_ids}
          countryCode={countryCode}
        >
          {(brand.logo_url || brand.description || brand.website_url) && (
            <div className="flex flex-col md:flex-row items-start gap-4 md:gap-6 p-4 md:p-5 rounded-xl border border-line bg-surface/60">
              {brand.logo_url && (
                <div className="w-20 h-20 md:w-24 md:h-24 relative rounded-xl overflow-hidden bg-white flex-shrink-0 border border-line/60">
                  <Image
                    src={brand.logo_url}
                    alt={brand.name}
                    fill
                    className="object-contain p-2"
                    sizes="96px"
                  />
                </div>
              )}
              <div className="flex-1 min-w-0">
                {brand.description && (
                  <p className="text-sm md:text-[15px] leading-relaxed text-ink/75 max-w-3xl">
                    {brand.description}
                  </p>
                )}
                {brand.website_url && (
                  <a
                    href={brand.website_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 mt-2 text-[13px] font-medium text-primary hover:underline"
                  >
                    <i className="ph ph-globe text-[14px]" aria-hidden />
                    Visit official website
                  </a>
                )}
              </div>
            </div>
          )}

          {children.length > 0 && (
            <div className="mt-3 md:mt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-ink/55 mb-2">
                Browse {brand.name}
              </p>
              <div className="flex flex-wrap gap-2">
                {children.map((c) => (
                  <LocalizedClientLink
                    key={c.id}
                    href={`/${segments.join("/")}/${c.handle}`}
                    className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-line bg-bg text-[13px] font-medium text-ink hover:border-ink hover:bg-surface transition-colors"
                  >
                    {c.logo_url ? (
                      <span className="relative w-4 h-4 inline-block">
                        <Image
                          src={c.logo_url}
                          alt={c.name}
                          fill
                          sizes="16px"
                          className="object-contain"
                        />
                      </span>
                    ) : (
                      <span className="w-4 h-4 inline-flex items-center justify-center text-[10px] font-semibold rounded bg-surface text-ink/50">
                        {c.name.charAt(0).toUpperCase()}
                      </span>
                    )}
                    {c.name}
                  </LocalizedClientLink>
                ))}
              </div>
            </div>
          )}
        </StoreTemplate>
      </>
    )
  }

  // 3. Try Category Render
  if (productCategory) {
    const chain: any[] = []
    let cur: any = productCategory
    while (cur) {
      chain.unshift(cur)
      cur = cur.parent_category
    }

    return (
      <>
        <BreadcrumbJsonLd
          countryCode={countryCode}
          items={[
            { name: "Home", href: "/" },
            { name: "Shop", href: "/store" },
            ...chain.slice(0, -1).map((c) => ({
              name: c.name,
              href: `/${buildCategoryPath(c)}`,
            })),
            { name: productCategory.name },
          ]}
        />
        <CategoryTemplate
          category={productCategory}
          countryCode={countryCode}
        />
      </>
    )
  }

  notFound()
}
