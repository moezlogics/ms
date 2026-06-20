import { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"

/**
 * Robots policy.
 *
 * Blocks customer/transactional routes (account, cart, checkout,
 * search query pages, order confirmation, auth) from search engines — none
 * of those benefit from indexing and many contain personal data. Everything
 * else is crawlable, and we advertise the sitemap for proactive discovery.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseURL()

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Public URLs never include the country-code prefix (middleware
        // rewrites internally to /pk/...), so disallow rules are written
        // against the user-facing paths. Glob form `/*/foo` previously
        // matched the rewrite target only — a no-op for crawlers.
        disallow: [
          "/account",
          "/account/*",
          "/cart",
          "/checkout",
          "/checkout/*",
          "/order/*",
          "/search",
          "/auth/*",
          "/api/*",
          // The compare flow is shopper-state-dependent and the URLs
          // carry an arbitrary list of product handles — every visit
          // is unique, so let Google ignore it entirely.
          "/compare",
          "/compare*",
          // Variant-id query string is a faceted duplicate of the
          // canonical product URL — block to consolidate signal.
          "/products/*?v_id=*",
          "/products/*?*v_id=*",
          // Category/listing facet duplicates. The canonical category
          // URL is the bare path; every sort/page combination is the
          // same set of products in a different order, which Google
          // would otherwise treat as thin near-duplicate pages.
          "/*?sortBy=*",
          "/*?*sortBy=*",
          "/*?page=*",
          "/*?*page=*",
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
