import React, { Suspense } from "react"

import ImageGallery from "@modules/products/components/image-gallery"
import ProductActions from "@modules/products/components/product-actions"
import ProductOnboardingCta from "@modules/products/components/product-onboarding-cta"
import ProductTabs from "@modules/products/components/product-tabs"
import ProductPreview from "@modules/products/components/product-preview"
import ProductInfo from "@modules/products/templates/product-info"
import { listProducts } from "@lib/data/products"
import { getSimilarBudgetProducts, getSimilarSpecsProducts, getSameBrandProducts } from "@lib/util/product"
import { notFound } from "next/navigation"
import { HttpTypes } from "@medusajs/types"
import { getBaseURL } from "@lib/util/env"
import { getProductReviewStats, getProductReviewsForJsonLd } from "@lib/data/reviews"
import { getBrandForProduct, getBrandByHandle } from "@lib/data/brands"
import { buildAltMap } from "@lib/data/cdn-meta"
import { buildSpecMap } from "@lib/util/spec-groups"
import { getPreorderState } from "@lib/util/preorder"
import { getProductPrice } from "@lib/util/get-product-price"
import { getProductPath } from "@lib/util/product"

import FrequentlyBoughtTogether from "@modules/products/components/frequently-bought-together"
import ProductActionsWrapper from "./product-actions-wrapper"
import ProductReviews from "@modules/products/components/product-reviews"
import ProductDescriptionTabs from "@modules/products/components/product-description-tabs"
import ProductViewTracker from "@modules/analytics/product-view-tracker"
import BundleCard from "@modules/products/components/bundle-card"
import PreorderBanner from "@modules/products/components/preorder-banner"
import { getBundlesForProduct } from "@lib/data/bundles"
import { getFirstResolvedTemplate } from "@lib/data/spec-templates"
import { getSiteSettings, resolveProductCardAspectClass } from "@lib/data/site-settings"

type ProductTemplateProps = {
  product: HttpTypes.StoreProduct
  region: HttpTypes.StoreRegion
  countryCode: string
  images: HttpTypes.StoreProductImage[]
}

function resolveAvailability(product: HttpTypes.StoreProduct): string {
  // Pre-order takes precedence — once the admin flips
  // `metadata.preorder_open` on (and `launch_date` is in the future),
  // surface a PreOrder availability to Google instead of OutOfStock.
  const pre = getPreorderState(product.metadata)
  if (pre.isPreorder) return "https://schema.org/PreOrder"

  const variants = product.variants ?? []
  const anyAvailable = variants.some((v) => {
    if ((v as any).allow_backorder) return true
    if ((v as any).manage_inventory === false) return true
    return (
      typeof (v as any).inventory_quantity === "number" &&
      (v as any).inventory_quantity > 0
    )
  })
  return anyAvailable
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock"
}

/**
 * Parse video entries from product.metadata.videos.
 *
 * Supports two formats:
 *   1. Array of objects: [{ url: "https://...", poster: "https://..." }]
 *   2. Array of strings: ["https://cdn.example.com/video.mp4"]
 *   3. Comma-separated string: "https://a.mp4, https://b.mp4"
 */
function parseProductVideos(
  raw: any
): { url: string; poster?: string }[] | undefined {
  if (!raw) return undefined

  // Already an array
  if (Array.isArray(raw)) {
    return raw
      .map((item: any) => {
        if (typeof item === "string" && item.trim()) {
          return { url: item.trim() }
        }
        if (item && typeof item === "object" && item.url) {
          return { url: item.url, poster: item.poster || undefined }
        }
        return null
      })
      .filter(Boolean) as { url: string; poster?: string }[]
  }

  // JSON string
  if (typeof raw === "string") {
    const trimmed = raw.trim()
    // Try JSON parse
    if (trimmed.startsWith("[")) {
      try {
        return parseProductVideos(JSON.parse(trimmed))
      } catch {}
    }
    // Comma-separated URLs
    return trimmed
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean)
      .map((url) => ({ url }))
  }

  return undefined
}

const ProductTemplate = async ({
  product,
  region,
  countryCode,
  images,
}: ProductTemplateProps) => {
  if (!product || !product.id) {
    return notFound()
  }

  const firstVariantPrice =
    product.variants?.[0]?.calculated_price?.calculated_amount
  const currency =
    product.variants?.[0]?.calculated_price?.currency_code ||
    region.currency_code

  const primaryCategory = product.categories?.[0]

  const [stats, brand, reviews, bundles, altMap, specTemplateResult, settings, allProductsResult] =
    await Promise.all([
      getProductReviewStats(product.id).catch(() => null),
      getBrandForProduct(product.id).catch(() => null),
      getProductReviewsForJsonLd(product.id, 10).catch(() => []),
      getBundlesForProduct(
        product.id,
        currency || region.currency_code,
        region.id
      ).catch(() => []),
      // Resolve CDN-generated alt text for every product image so each
      // gallery <img> carries a real description instead of "Product image 1"
      buildAltMap(
        (images || []).filter((i) => !!i?.url) as Array<{ url: string }>,
        product.title || "Product image"
      ).catch(() => ({} as Record<string, string>)),
      // Resolve the spec template for the product's first category
      // that has one (walking parent chains server-side). Falls back
      // to `null` when no category in the product's category list
      // has a template configured — the storefront then uses the
      // heuristic spec grouping (back-compat with legacy products).
      getFirstResolvedTemplate(
        (product.categories || []).map((c: any) => c?.id)
      ).catch(() => ({ template: null, source_name: null })),
      getSiteSettings().catch(() => ({})),
      listProducts({
        queryParams: {
          limit: 24,
          ...(primaryCategory?.id ? { category_id: [primaryCategory.id] } : {}),
        } as any,
        countryCode,
      }).catch(() => ({ response: { products: [] } })),
    ])

  const aspectRatioClass = resolveProductCardAspectClass(settings || {})

  let allProducts: any[] = allProductsResult.response.products || []

  // Fallback: if category has very few products, fetch from general store to ensure recommendations are rendered (cap at 24 to keep TTFB fast)
  if (allProducts.length < 5) {
    const backupResult = await listProducts({
      queryParams: { limit: 24 } as any,
      countryCode,
    }).catch(() => ({ response: { products: [] } }))
    const backupProducts = backupResult.response.products || []
    const seen = new Set(allProducts.map((p) => p.id))
    for (const p of backupProducts) {
      if (!seen.has(p.id)) {
        allProducts.push(p)
      }
    }
  }

  const similarBudget = getSimilarBudgetProducts(product, allProducts, 4)
  const similarSpecs = getSimilarSpecsProducts(product, allProducts, 4)

  const brandHandle = brand?.handle || product.metadata?.brand
  let brandProducts: any[] = []
  if (brandHandle) {
    try {
      const brandData = await getBrandByHandle(brandHandle).catch(() => null)
      if (brandData && brandData.product_ids?.length > 0) {
        const targetIds = brandData.product_ids.filter((id) => id !== product.id).slice(0, 4)
        if (targetIds.length > 0) {
          const brandProductsResult = await listProducts({
            queryParams: {
              id: targetIds,
              limit: targetIds.length,
            } as any,
            countryCode,
          }).catch(() => null)
          brandProducts = brandProductsResult?.response?.products || []
        }
      }
    } catch (e) {
      console.error("Failed to fetch brand products dynamically:", e)
    }
  }

  const sameBrand = brandProducts.length > 0
    ? brandProducts
    : getSameBrandProducts(product, allProducts, brandHandle, 4)

  const renderInlineSection = (title: string, productsList: any[]) => {
    if (!productsList || productsList.length === 0) return null

    return (
      <div className="flex flex-col gap-1.5 md:gap-3 my-1.5 md:my-4 related-products-section">
        <div className="flex items-center gap-2 border-b border-line pb-1 md:pb-1.5">
          <h4 className="text-[12.5px] md:text-[13px] font-extrabold text-primary uppercase tracking-wider">
            {title}
          </h4>
        </div>
        <ul className="grid grid-cols-4 gap-2 md:gap-4">
          {productsList.map((p) => (
            <li key={p.id}>
              <ProductPreview region={region} product={p} aspectClass={aspectRatioClass} />
            </li>
          ))}
        </ul>
      </div>
    )
  }

  // First variant carries the canonical SKU / barcode / dimensions.
  // Medusa exposes weight (g), length / width / height (cm) natively
  // on variants — we map them into the GS1-style schema fields.
  const v0: any = product.variants?.[0] || {}
  const meta: any = product.metadata || {}

  // GTIN / MPN — Merchant Center scoring depends heavily on these.
  // Accept them from metadata (`gtin`, `gtin13`, `mpn`) and fall back
  // to the variant `barcode` field for the GTIN (most common in our
  // admin workflow).
  const gtin: string | undefined =
    meta.gtin13 || meta.gtin || v0.barcode || undefined
  const mpn: string | undefined = meta.mpn || meta.model || undefined

  // Schema.org dimensions use QuantitativeValue with unitCode UN/CEFACT
  // codes: KGM = kg, CMT = cm. Convert grams→kg for weight.
  const dim = (raw: any, unitCode: string) => {
    const n = typeof raw === "number" ? raw : parseFloat(raw)
    if (!Number.isFinite(n) || n <= 0) return undefined
    return { "@type": "QuantitativeValue", value: n, unitCode }
  }
  const weight = v0.weight ? dim(v0.weight / 1000, "KGM") : undefined
  const width = dim(v0.width, "CMT")
  const height = dim(v0.height, "CMT")
  const depth = dim(v0.length, "CMT")

  // Optional warranty (months) — expressed as WarrantyPromise.
  const warrantyMonths = (() => {
    const m =
      meta.warranty_months ??
      (typeof meta.specs?.warranty_months !== "undefined"
        ? meta.specs.warranty_months
        : undefined)
    const n = typeof m === "number" ? m : parseInt(String(m || ""), 10)
    return Number.isFinite(n) && n > 0 ? n : undefined
  })()

  const productUrl = `${getBaseURL()}/${countryCode}${getProductPath(product, brand)}`
  const sellerRef = { "@id": `${getBaseURL()}/#organization` }

  // Try to find a valid price from the cheapest variant or metadata specs.
  const cheapestPriceObj = getProductPrice({ product }).cheapestPrice
  const cheapestPriceAmount = cheapestPriceObj?.calculated_price_number

  const metadataPriceRaw = (product.metadata as any)?.specs?.price_rs
  const parsedMetadataPrice = (() => {
    if (!metadataPriceRaw) return undefined
    // Extract numbers from string, e.g., "Rs. 85,000" -> 85000
    const num = parseFloat(String(metadataPriceRaw).replace(/[^0-9.]/g, ""))
    return Number.isFinite(num) && num > 0 ? num : undefined
  })()

  const resolvedPrice = firstVariantPrice || cheapestPriceAmount || parsedMetadataPrice

  // Offer block — enriched with seller, priceValidUntil, return
  // policy, and shipping details so Merchant Center can render the
  // product without a feed.
  const priceValidUntil = (() => {
    // Use launch_date when in pre-order; otherwise project a 1-year
    // window from today so Google doesn't flag the price as stale.
    const pre = getPreorderState(product.metadata)
    if (pre.isPreorder && pre.launchDate) return pre.launchDate.toISOString()
    const d = new Date()
    d.setFullYear(d.getFullYear() + 1)
    return d.toISOString().slice(0, 10)
  })()

  const offer: Record<string, any> | undefined = resolvedPrice
    ? {
        "@type": "Offer",
        priceCurrency: (currency || "usd").toUpperCase(),
        price: resolvedPrice,
        url: productUrl,
        availability: resolveAvailability(product),
        itemCondition: "https://schema.org/NewCondition",
        priceValidUntil,
        seller: sellerRef,
        // 7-day easy returns — mirrors the TrustBadges promise.
        hasMerchantReturnPolicy: {
          "@type": "MerchantReturnPolicy",
          applicableCountry: "PK",
          returnPolicyCategory:
            "https://schema.org/MerchantReturnFiniteReturnWindow",
          merchantReturnDays: 7,
          returnMethod: "https://schema.org/ReturnByMail",
          returnFees: "https://schema.org/FreeReturn",
        },
        // Free shipping over Rs. 3,000 — mirrors the active TrustBadge.
        shippingDetails: {
          "@type": "OfferShippingDetails",
          shippingRate: {
            "@type": "MonetaryAmount",
            value: 0,
            currency: (currency || "PKR").toUpperCase(),
          },
          shippingDestination: {
            "@type": "DefinedRegion",
            addressCountry: "PK",
          },
          deliveryTime: {
            "@type": "ShippingDeliveryTime",
            handlingTime: {
              "@type": "QuantitativeValue",
              minValue: 0,
              maxValue: 1,
              unitCode: "DAY",
            },
            transitTime: {
              "@type": "QuantitativeValue",
              minValue: 2,
              maxValue: 5,
              unitCode: "DAY",
            },
          },
        },
      }
    : undefined

  const ldjson: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.title,
    description: product.description || product.subtitle || undefined,
    image: images?.map((i) => i.url).filter(Boolean) || [],
    sku: v0.sku || undefined,
    ...(gtin && { gtin13: gtin, gtin }),
    ...(mpn && { mpn }),
    ...(meta.model && { model: meta.model }),
    ...(meta.color && { color: meta.color }),
    ...(meta.material && { material: meta.material }),
    ...(weight && { weight }),
    ...(width && { width }),
    ...(height && { height }),
    ...(depth && { depth }),
    ...(meta.google_product_category && {
      category: meta.google_product_category,
    }),
    ...(warrantyMonths && {
      hasWarrantyPromise: {
        "@type": "WarrantyPromise",
        durationOfWarranty: {
          "@type": "QuantitativeValue",
          value: warrantyMonths,
          unitCode: "MON",
        },
        warrantyScope: "https://schema.org/PartsAndLaborWarranty",
      },
    }),
    brand: brand
      ? { "@type": "Brand", name: brand.name }
      : product.collection?.title
      ? { "@type": "Brand", name: product.collection.title }
      : undefined,
    offers: offer,
  }

  // additionalProperty — surfaces structured specs to Google Shopping
  // and Merchant Listings, which display them as bullet rows on the
  // search result snippet. Maps directly from metadata.specs.
  const specMap = buildSpecMap((product.metadata as any)?.specs)
  const specEntries = Object.values(specMap)
  if (specEntries.length > 0) {
    ldjson.additionalProperty = specEntries.map((s) => ({
      "@type": "PropertyValue",
      name: s.label,
      value: s.value,
    }))
  }

  // Pre-order release date — Google honours `releaseDate` for
  // PreOrder availability so the badge can show "Available from".
  // `priceValidUntil` was already aligned to the launch date above.
  const preorder = getPreorderState(product.metadata)
  if (preorder.isPreorder && preorder.launchDate) {
    ldjson.releaseDate = preorder.launchDate.toISOString()
  }

  // Ratings/reviews are emitted ONLY when they are REAL. Google's rich-
  // result requirement ("offers, review, OR aggregateRating") is already
  // satisfied by `offers` above, so we do NOT fabricate a rating/review
  // when none exist — fake/self-serving reviews violate Google's policy
  // and risk a structured-data manual action.
  if (stats && stats.reviewCount > 0) {
    ldjson.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: stats.averageRating.toFixed(1),
      reviewCount: stats.reviewCount,
      bestRating: "5",
      worstRating: "1",
    }
  }

  // Per-review entries for rich snippets — only when real reviews exist.
  if (reviews && reviews.length > 0) {
    ldjson.review = reviews.map((r) => {
      const customerName = r.customer?.first_name
        ? `${r.customer.first_name} ${r.customer.last_name || ""}`.trim()
        : null
      const authorName = customerName || r.guest_name || "Anonymous"
      return {
        "@type": "Review",
        reviewRating: {
          "@type": "Rating",
          ratingValue: r.rating,
          bestRating: "5",
          worstRating: "1",
        },
        author: { "@type": "Person", name: authorName },
        reviewBody: r.content,
        datePublished: r.created_at,
      }
    })
  }

  return (
    <>
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(ldjson) }}
      />

      <ProductViewTracker
        productId={product.id}
        productTitle={product.title || ""}
        category={product.categories?.[0]?.name}
        price={firstVariantPrice ?? undefined}
        currency={currency}
      />

      {/* Top breadcrumb — always rendered above the gallery so the user
          sees the path even before the page settles. */}
      <div className="container-anvogue pt-2 md:pt-4">
        <ProductInfo product={product} mode="top" />
      </div>

      <div
        className="container-anvogue pt-1 pb-4 md:py-4"
        data-testid="product-container"
      >
        {/* Mobile Layout (lg:hidden) */}
        <div className="lg:hidden">
          {/* Title Row */}
          <div className="mb-1.5">
            <ProductInfo product={product} mode="title-only" />
          </div>

          {/* 50/50 Side-by-Side Gallery & Specs */}
          <div className="grid grid-cols-2 gap-1.5 mb-2 items-start">
            <div className="min-w-0">
              <ImageGallery
                images={images}
                videos={parseProductVideos((product.metadata as any)?.videos)}
                altMap={altMap}
                altFallback={product.title || "Product image"}
                aspectRatioClass={aspectRatioClass}
              />
              <ProductInfo product={product} mode="brand-only" />
            </div>
            <div className="min-w-0 flex flex-col gap-2">
              <ProductInfo product={product} mode="specs-only" />
            </div>
          </div>

          {/* Mobile Actions Stack */}
          <div className="flex flex-col gap-3.5 mb-6">
            <PreorderBanner metadata={product.metadata} />
            <ProductOnboardingCta />
            <Suspense
              fallback={
                <ProductActions
                  disabled={true}
                  product={product}
                  region={region}
                />
              }
            >
              <ProductActionsWrapper id={product.id} region={region} />
            </Suspense>
            {bundles && bundles.length > 0 && (
              <BundleCard bundles={bundles} />
            )}
            <ProductTabs product={product} />
          </div>
        </div>

        {/* Desktop Layout (hidden lg:grid) */}
        <div className="hidden lg:grid lg:grid-cols-2 gap-3 lg:gap-4">
          {/* Gallery — left column */}
          <div className="w-full">
            <ImageGallery
              images={images}
              videos={parseProductVideos((product.metadata as any)?.videos)}
              altMap={altMap}
              altFallback={product.title || "Product image"}
              aspectRatioClass={aspectRatioClass}
            />
          </div>

          {/* Info / actions — right column */}
          <div className="w-full">
            <div className="flex flex-col gap-3.5 lg:sticky lg:top-20 self-start">
              {/* Desktop only: title + featured specs in right column */}
              <ProductInfo product={product} mode="main" />

              {/* Pre-order banner — self-renders nothing unless
                  metadata.preorder_open is set and launch_date is in
                  the future. Placed above the CTA so the countdown
                  reads naturally before the price/buttons. */}
              <PreorderBanner metadata={product.metadata} />

              <ProductOnboardingCta />

              <Suspense
                fallback={
                  <ProductActions
                    disabled={true}
                    product={product}
                    region={region}
                  />
                }
              >
                <ProductActionsWrapper id={product.id} region={region} />
              </Suspense>

              {bundles && bundles.length > 0 && (
                <BundleCard bundles={bundles} />
              )}

              <ProductTabs product={product} />
            </div>
          </div>
        </div>
      </div>

      {/* Description + Reviews — tabbed layout (English / اردو / Reviews) */}
      <div id="reviews" className="container-anvogue my-6 md:my-10 scroll-mt-20">
        <ProductDescriptionTabs
          richDescription={(product.metadata as any)?.rich_description || null}
          richDescriptionEn={(product.metadata as any)?.rich_description_en || null}
          richDescriptionUr={(product.metadata as any)?.rich_description_ur || null}
          plainDescription={product.description || product.subtitle || null}
          specs={{
            ...(product.metadata as any)?.specs,
            price_rs: (product.metadata as any)?.specs?.price_rs || getProductPrice({ product }).cheapestPrice?.calculated_price || undefined
          }}
          inTheBox={(product.metadata as any)?.in_the_box}
          reviewCount={stats?.reviewCount}
          template={specTemplateResult?.template ?? null}
          reviewsSlot={
            <ProductReviews productId={product.id} productTitle={product.title} />
          }
          similarBudgetSlot={renderInlineSection("Similar Price", similarBudget)}
          similarSpecsSlot={renderInlineSection("Similar Specs", similarSpecs)}
          sameBrandSlot={renderInlineSection(`More from ${brand?.name || "Brand"}`, sameBrand)}
        />
      </div>

      {/* Frequently Bought Together */}
      <Suspense fallback={null}>
        <FrequentlyBoughtTogether product={product} countryCode={countryCode} />
      </Suspense>
    </>
  )
}

export default ProductTemplate
