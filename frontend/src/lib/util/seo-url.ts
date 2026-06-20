import type { Metadata } from "next"
import { getBaseURL } from "./env"

/**
 * Canonical URL builder.
 *
 * The storefront middleware rewrites every public path internally to
 * `/<countryCode>/...` (e.g. `/products/foo` → `/pk/products/foo`) so
 * the user-visible URL stays clean. That means `params.countryCode`
 * inside server components is always `pk` even though the browser
 * never sees that prefix — and any `<link rel="canonical">` we emit
 * MUST mirror the public URL, not the internal rewrite target.
 *
 * Always run user-facing paths through `canonicalUrl()` instead of
 * concatenating `params.countryCode` manually.
 */

/**
 * Returns an absolute canonical URL for a user-facing path.
 * Examples:
 *   canonicalUrl("/products/panadol-extra")
 *     → "https://www.mobilestore.pk/products/panadol-extra"
 *   canonicalUrl("/")  → "https://www.mobilestore.pk"
 */
export function canonicalUrl(path: string = "/"): string {
  const base = getBaseURL().replace(/\/+$/, "")
  if (!path || path === "/") return base
  const cleaned = path.startsWith("/") ? path : `/${path}`
  return `${base}${cleaned}`
}

/**
 * Strips a leading country-code segment from an internal path so that
 * sitemap and canonical generators emit user-facing URLs.
 *   stripCountry("/pk/products/foo") → "/products/foo"
 *   stripCountry("/products/foo")    → "/products/foo"
 */
export function stripCountry(path: string): string {
  return path.replace(/^\/[a-z]{2}(?=\/|$)/i, "") || "/"
}

/**
 * Standard `robots` directive for pages we want indexed and ranked by
 * Google. Mirrors the block we use on product/category/collection
 * detail pages so every public page emits identical signals.
 */
export const ROBOTS_INDEX: Metadata["robots"] = {
  index: true,
  follow: true,
  googleBot: {
    index: true,
    follow: true,
    "max-image-preview": "large",
    "max-snippet": -1,
  },
}

/**
 * `robots` directive for private/transactional pages (cart, checkout,
 * account, order confirmations, transfer accept/decline, etc.). Keeps
 * Google away from anything user-specific or short-lived while still
 * letting it follow outbound links so navigation isn't a dead-end.
 */
export const ROBOTS_NOINDEX: Metadata["robots"] = {
  index: false,
  follow: false,
  nocache: true,
  googleBot: {
    index: false,
    follow: false,
    noimageindex: true,
  },
}

export type PublicSeoInput = {
  /** Public path WITHOUT the country prefix. Example: `/store`, `/about`. */
  path: string
  title: string
  description?: string
  /** Absolute URL of the OG image. Falls back to site default when omitted. */
  image?: string
  /** Defaults to "website". Use "article" for blog posts, etc. */
  ogType?: "website" | "article"
  siteName?: string
  /** Optional keyword list — comma-separated string or array. */
  keywords?: string | string[]
}

/**
 * Builds the standard public-facing metadata block (canonical + OG +
 * Twitter + indexable robots) so every static / list page ships the
 * same SEO signals without copy-pasting 30 lines per file.
 *
 * Usage:
 *   return publicSeo({ path: "/about", title: "About Us", description })
 */
export function publicSeo({
  path,
  title,
  description,
  image,
  ogType = "website",
  siteName,
  keywords,
}: PublicSeoInput): Metadata {
  const url = canonicalUrl(path)
  const meta: Metadata = {
    title,
    alternates: { canonical: url },
    robots: ROBOTS_INDEX,
    openGraph: {
      title,
      description,
      url,
      type: ogType,
      ...(siteName ? { siteName } : {}),
      ...(image ? { images: [{ url: image }] } : {}),
    },
    twitter: {
      card: image ? "summary_large_image" : "summary",
      title,
      description,
      ...(image ? { images: [image] } : {}),
    },
  }
  if (description) meta.description = description
  if (keywords) {
    meta.keywords = Array.isArray(keywords)
      ? keywords
      : keywords
          .split(",")
          .map((k) => k.trim())
          .filter(Boolean)
  }
  return meta
}
