import { Metadata } from "next"
import Image from "next/image"
import { listBrands } from "@lib/data/brands"
import { getSiteSettings } from "@lib/data/site-settings"
import { canonicalUrl, ROBOTS_INDEX } from "@lib/util/seo-url"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { buildBrandPath } from "@lib/util/brand-path"

type Props = { params: Promise<{ countryCode: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  await params
  const settings = await getSiteSettings()
  const siteName = settings.site_name || "Store"
  const title = "Brands"
  const description = `Browse all trusted brands at ${siteName}. Find products from the world's leading brands.`
  // Public URL is `/brands` — middleware injects `/<countryCode>` for
  // internal routing only. Canonical mirrors the user-visible URL.
  const url = canonicalUrl("/brands")

  return {
    title,
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
    robots: ROBOTS_INDEX,
  }
}

export default async function BrandsPage({ params }: Props) {
  await params
  const [brands, settings] = await Promise.all([
    listBrands(),
    getSiteSettings(),
  ])

  const siteName = settings.site_name || "Store"

  // Top-level brands only — sub-brands are reachable through their
  // parent (e.g. /brands/apple/mac), not duplicated at the root.
  // We also count direct children so the card can show "3 sub-brands"
  // and hint at the deeper navigation.
  const topBrands = (brands || []).filter((b) => !b.parent_id)
  const childCount = new Map<string, number>()
  for (const b of brands || []) {
    if (b.parent_id) {
      childCount.set(b.parent_id, (childCount.get(b.parent_id) || 0) + 1)
    }
  }

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `Brands — ${siteName}`,
    description: `Browse all trusted brands at ${siteName}.`,
    url: canonicalUrl("/brands"),
    mainEntity: {
      "@type": "ItemList",
      itemListElement: topBrands.map((brand, i) => ({
        "@type": "ListItem",
        position: i + 1,
        // buildBrandPath handles the sub-brand case correctly even
        // though we filtered to roots — defensive against future
        // changes to the filter above.
        url: canonicalUrl(`/${buildBrandPath(brand, brands) || brand.handle}`),
        name: brand.name,
      })),
    },
  }

  return (
    <div className="py-8 md:py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="container-anvogue">
        <div className="mb-8 md:mb-10 text-center">
          <h1 className="text-3xl md:text-5xl font-bold tracking-tight text-brand-black mb-3">
            Our Brands
          </h1>
          <p className="text-base text-gray-500 max-w-xl mx-auto">
            Discover products from the world&apos;s most trusted and innovative
            brands.
          </p>
        </div>

        {topBrands.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 md:gap-6">
            {topBrands.map((brand) => {
              const subs = childCount.get(brand.id) || 0
              const path = buildBrandPath(brand, brands) || brand.handle
              return (
                <LocalizedClientLink
                  key={brand.id}
                  href={`/${path}`}
                  className="group flex flex-col items-center justify-center p-6 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 hover:-translate-y-1 text-center"
                >
                  {brand.logo_url ? (
                    <div className="w-20 h-20 md:w-24 md:h-24 mb-4 relative rounded-full overflow-hidden border border-gray-50">
                      <Image
                        src={brand.logo_url}
                        alt={brand.name}
                        fill
                        className="object-contain p-2 group-hover:scale-110 transition-transform duration-500"
                        sizes="96px"
                      />
                    </div>
                  ) : (
                    <div className="w-20 h-20 md:w-24 md:h-24 mb-4 rounded-full bg-gray-50 flex items-center justify-center text-gray-300 group-hover:bg-[rgb(var(--color-primary))/10] group-hover:text-[rgb(var(--color-primary))] transition-colors duration-300">
                      <i className="ph-bold ph-tag text-3xl" />
                    </div>
                  )}
                  <span className="font-semibold text-brand-black group-hover:text-[rgb(var(--color-primary))] transition-colors">
                    {brand.name}
                  </span>
                  {subs > 0 && (
                    <span className="mt-1 text-[11px] text-gray-400 font-medium">
                      {subs} sub-brand{subs === 1 ? "" : "s"}
                    </span>
                  )}
                </LocalizedClientLink>
              )
            })}
          </div>
        ) : (
          <div className="text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
            <i className="ph-bold ph-tag text-4xl text-gray-400 mb-3" />
            <h2 className="text-lg font-semibold text-brand-black mb-1">
              No Brands Found
            </h2>
            <p className="text-gray-500 text-sm max-w-sm mx-auto">
              Brands will appear here once they are added from the admin panel.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
