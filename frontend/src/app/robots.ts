import { MetadataRoute } from "next"
import { getBaseURL } from "@lib/util/env"

/**
 * AI Crawlers & Search Engines List.
 *
 * Explicitly define major AI agents for AEO (Answer Engine Optimization)
 * and GEO (Generative Engine Optimization) to ensure they can index
 * the storefront products, brand lists, and blog posts for LLM-based answers
 * and citations (e.g. SearchGPT, ChatGPT, Perplexity, Gemini, Claude).
 */
const AI_USER_AGENTS = [
  "*",
  "GPTBot",
  "OAI-SearchBot",
  "Claude-Web",
  "ClaudeBot",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "CohereBot",
  "ByteSpider",
]

/**
 * Robots policy.
 *
 * Blocks customer/transactional routes (account, cart, checkout,
 * search query pages, order confirmation, auth) from search engines and AI bots —
 * none of those benefit from indexing and many contain personal data. Everything
 * else is crawlable, and we advertise the sitemap for proactive discovery.
 */
export default function robots(): MetadataRoute.Robots {
  const baseUrl = getBaseURL()

  const disallowPaths = [
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
    // is unique, so let search engines ignore it entirely.
    "/compare",
    "/compare*",
    // Variant-id query string is a faceted duplicate of the
    // canonical product URL — block to consolidate signal.
    "/products/*?v_id=*",
    "/products/*?*v_id=*",
    // Category/listing facet duplicates. The canonical category
    // URL is the bare path; every sort/page combination is the
    // same set of products in a different order, which Google
    // and AI engines would otherwise treat as thin near-duplicate pages.
    "/*?sortBy=*",
    "/*?*sortBy=*",
    "/*?page=*",
    "/*?*page=*",
  ]

  const rules = AI_USER_AGENTS.map((agent) => ({
    userAgent: agent,
    allow: "/",
    disallow: disallowPaths,
  }))

  return {
    rules,
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  }
}
