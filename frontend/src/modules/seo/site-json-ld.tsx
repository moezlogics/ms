import { getBaseURL } from "@lib/util/env"
import { SiteSettings } from "@lib/data/site-settings"

/**
 * Site-wide WebSite + Organization JSON-LD.
 *
 * Two pieces of schema that should appear ONCE per page (in the
 * head), separate from the per-page Product / LocalBusiness blobs:
 *
 *   1. WebSite — declares the canonical URL and registers a
 *      `SearchAction` so Google can render the sitelinks search box
 *      directly on the brand SERP. Worth roughly 5-15% extra CTR for
 *      navigational searches and zero cost to ship.
 *
 *   2. Organization — gives Google a clean logo + sameAs (social)
 *      block to surface in the Knowledge Panel. We already emit
 *      LocalBusiness via `BusinessJsonLd`, but a dedicated
 *      Organization node is the recommended source for the logo
 *      property because LocalBusiness logos are sometimes ignored
 *      in favour of "real" company info.
 *
 * Both nodes are emitted inside a single `@graph` so Google parses
 * them as one document and can wire `Organization.url` ↔
 * `WebSite.publisher` together.
 */
export default function SiteJsonLd({ settings }: { settings: SiteSettings }) {
  const baseUrl = getBaseURL()
  const siteName = settings.site_name?.trim()
  if (!siteName) return null

  const logo = settings.site_logo_url?.trim()
  const description =
    settings.seo_home_description?.trim() || settings.site_tagline?.trim()

  const sameAs: string[] = [
    settings.social_facebook,
    settings.social_instagram,
    settings.social_twitter,
    settings.social_youtube,
    settings.social_tiktok,
    settings.social_pinterest,
  ]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s))

  const orgId = `${baseUrl}/#organization`
  const websiteId = `${baseUrl}/#website`

  const organization: Record<string, any> = {
    "@type": "Organization",
    "@id": orgId,
    name: siteName,
    url: baseUrl,
    ...(description && { description }),
    ...(logo && {
      logo: { "@type": "ImageObject", url: logo, caption: siteName },
    }),
    ...(sameAs.length && { sameAs }),
  }

  const website: Record<string, any> = {
    "@type": "WebSite",
    "@id": websiteId,
    url: baseUrl,
    name: siteName,
    ...(description && { description }),
    publisher: { "@id": orgId },
    // SearchAction — drives the sitelinks search box on the SERP.
    // The target URL must point at our internal /search route with
    // the verbatim query embedded; Google substitutes `{search_term_string}`
    // at runtime when the shopper submits the box.
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${baseUrl}/search?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
    inLanguage: ["en-PK", "ur-PK"],
  }

  const graph = {
    "@context": "https://schema.org",
    "@graph": [organization, website],
  }

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(graph) }}
    />
  )
}
