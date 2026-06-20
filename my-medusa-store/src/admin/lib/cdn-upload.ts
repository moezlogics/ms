/**
 * CDN Upload Utility — Single source of truth for all admin panel uploads.
 *
 * Every image/video upload from the admin panel (banners, blog, site-settings,
 * products, categories, etc.) goes through this module. It always uploads
 * directly to the self-hosted CDN server and returns the full URL + SEO metadata.
 *
 * The CDN server handles:
 *   - WebP conversion via Sharp
 *   - Thumbnail generation (400px)
 *   - WordPress-style date-based filenames (2026/04/product-name-abc123.webp)
 *   - Auto alt/title/caption via GPT-4o-mini vision
 *   - Immutable caching headers
 */

export type CdnUploadResult = {
  url: string
  thumbUrl: string | null
  alt: string | null
  title: string | null
  caption: string | null
  width: number | null
  height: number | null
  filename: string | null
}

/** CDN config — reads from global window vars set by admin panel build */
function getCdnConfig() {
  return {
    url: (window as any).__CDN_URL__ || "http://localhost:8041",
    apiKey:
      (window as any).__CDN_API_KEY__ ||
      "ecomm-cdn-secret-key-change-in-production",
  }
}

/**
 * Upload a file (image or video) to the self-hosted CDN.
 *
 * @param file - The File object to upload
 * @param slug - Optional SEO slug override (if not provided, original filename is used)
 * @returns CDN upload result with URL and SEO metadata
 * @throws Error if both CDN and Medusa fallback uploads fail
 */
export async function cdnUpload(
  file: File,
  slug?: string
): Promise<CdnUploadResult> {
  const { url: cdnUrl, apiKey } = getCdnConfig()

  // ── Try direct CDN upload first ──
  try {
    const fd = new FormData()
    fd.append("image", file)
    fd.append("originalFilename", file.name)
    if (slug) fd.append("slug", slug)

    const res = await fetch(`${cdnUrl}/api/media/upload`, {
      method: "POST",
      headers: { "x-cdn-key": apiKey },
      body: fd,
    })

    if (res.ok) {
      const json = await res.json()
      const d = json.data || {}
      return {
        url: d.url || "",
        thumbUrl: d.thumbUrl || null,
        alt: d.alt || null,
        title: d.title || null,
        caption: d.caption || null,
        width: d.width ?? null,
        height: d.height ?? null,
        filename: d.filename || null,
      }
    }

    // CDN returned an error — log it and fall through to Medusa
    const errText = await res.text()
    console.warn(`[CDN Upload] CDN returned ${res.status}:`, errText)
  } catch (err) {
    console.warn("[CDN Upload] Direct CDN upload failed, falling back to Medusa:", err)
  }

  // ── Fallback: Medusa's built-in /admin/uploads (still uses cdn-file provider) ──
  const fd = new FormData()
  fd.append("files", file)
  const res = await fetch("/admin/uploads", {
    method: "POST",
    credentials: "include",
    body: fd,
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  const uploaded = json.files?.[0] || json.uploads?.[0]
  return {
    url: uploaded?.url || uploaded?.file_url || "",
    thumbUrl: null,
    alt: null,
    title: null,
    caption: null,
    width: null,
    height: null,
    filename: null,
  }
}
