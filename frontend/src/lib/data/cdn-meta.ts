import "server-only"
import { cache } from "react"

/**
 * CDN media metadata resolver.
 *
 * Every image uploaded to the CDN gets an AI-generated alt text
 * (GPT-4o mini vision) plus a humanised title and caption. The CDN
 * persists this beside each file as a `<filename>.meta.json` sidecar.
 *
 * This helper resolves that metadata for any CDN URL so the storefront
 * can plug a real `alt={...}` into every <img>, instead of falling
 * back to "Product image 1".
 *
 * - Server-only (calls the CDN with cache).
 * - Batches multiple URLs into a single request.
 * - 5-minute revalidation matches the CDN's Cache-Control.
 * - Returns {} on failure so render paths never break.
 */

const CDN_PUBLIC_URL = process.env.CDN_PUBLIC_URL || process.env.NEXT_PUBLIC_CDN_URL || ""
// Same-box internal base for the meta API call. The CDN runs on this very
// server — calling it via the public URL loops every PDP render out
// through Cloudflare+TLS+internet (same bug class MEDUSA_BACKEND_URL had).
// Set CDN_INTERNAL_URL=http://127.0.0.1:<cdn-port> in .env; falls back to
// the public URL when unset. URL *filtering* still uses the public prefix
// (image URLs stored in the DB are public).
const CDN_FETCH_BASE = process.env.CDN_INTERNAL_URL || CDN_PUBLIC_URL

export type CdnImageMeta = {
  alt: string | null
  title: string | null
  caption: string | null
  type?: "image" | "video"
  width?: number | null
  height?: number | null
  originalFilename?: string | null
}

/** Extract the relative path under `/uploads/` from a full CDN URL. */
function urlToPath(url: string): string | null {
  if (!url) return null
  const m = url.match(/\/uploads\/(.+?)(?:\?.*)?$/)
  return m ? m[1] : null
}

/**
 * Resolve metadata for many CDN URLs in a single round-trip.
 * Returned map is keyed by the ORIGINAL url string (so the caller
 * doesn't need to know about path extraction).
 */
export const resolveCdnMetaBatch = cache(
  async (urls: string[]): Promise<Record<string, CdnImageMeta | null>> => {
    if (!CDN_PUBLIC_URL || !urls.length) return {}

    // Filter to URLs that actually live on our CDN
    const cdnUrls = urls.filter((u) => u && u.startsWith(CDN_PUBLIC_URL))
    if (!cdnUrls.length) return {}

    const paths = cdnUrls
      .map((u) => urlToPath(u))
      .filter((p): p is string => !!p)

    if (!paths.length) return {}

    try {
      const url = `${CDN_FETCH_BASE}/api/media/meta?paths=${encodeURIComponent(
        paths.join(",")
      )}`
      const res = await fetch(url, {
        next: { revalidate: 300, tags: ["cdn-meta"] },
        cache: "force-cache",
        // Alt text is nice-to-have — never let a slow CDN hold the PDP
        // render hostage. 3s cap → fall back to product-title alts.
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) return {}

      const data = await res.json()
      const byPath = (data?.data || {}) as Record<string, CdnImageMeta | null>

      // Re-key by the original URL so callers don't deal with paths
      const out: Record<string, CdnImageMeta | null> = {}
      for (const u of cdnUrls) {
        const p = urlToPath(u)
        if (p && p in byPath) out[u] = byPath[p]
      }
      return out
    } catch {
      return {}
    }
  }
)

/**
 * Build a `{url -> alt}` map for an array of image-like records, with
 * a fallback string applied when the CDN has no alt for a URL (or the
 * URL isn't on our CDN). Use this in server components where you need
 * a quick lookup keyed by image URL.
 */
export async function buildAltMap(
  images: Array<{ url: string }>,
  fallback: string
): Promise<Record<string, string>> {
  const urls = images.map((i) => i.url).filter(Boolean)
  const meta = await resolveCdnMetaBatch(urls)
  const map: Record<string, string> = {}
  for (const i of images) {
    const alt = meta[i.url]?.alt
    map[i.url] = (alt && alt.trim()) || fallback
  }
  return map
}
