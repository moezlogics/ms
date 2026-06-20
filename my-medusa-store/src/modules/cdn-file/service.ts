import { AbstractFileProviderService } from "@medusajs/framework/utils"
import { ProviderUploadFileDTO, ProviderFileResultDTO, ProviderGetFileDTO, ProviderDeleteFileDTO } from "@medusajs/framework/types"

type Options = {
  url: string
  key: string
}

/**
 * Metadata cache — CDN upload returns alt/title/caption but Medusa's
 * ProviderFileResultDTO only carries url+key. We stash the extra bits
 * keyed by url so custom admin routes can look them up later.
 */
type CdnMeta = {
  alt: string | null
  title: string | null
  caption: string | null
  width: number | null
  height: number | null
  thumbUrl: string | null
  filename: string
  createdAt: number
}

const META_KEY = "__cdnFileMetaCache__"
const g = globalThis as any
if (!g[META_KEY]) g[META_KEY] = new Map<string, CdnMeta>()
const metaCache: Map<string, CdnMeta> = g[META_KEY]

function rememberMeta(url: string, meta: CdnMeta) {
  metaCache.set(url, meta)
  if (metaCache.size > 500) {
    const firstKey = metaCache.keys().next().value
    if (firstKey) metaCache.delete(firstKey)
  }
}

export function getCdnMeta(url: string): CdnMeta | undefined {
  return metaCache.get(url)
}

/**
 * Sanitize filename into an SEO slug — same logic as the CDN server.
 * Used to generate the slug sent alongside the upload.
 */
function toSlug(raw: string): string {
  return raw
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 80) || "upload"
}

/**
 * Fetch with retry — retries once on network/5xx errors.
 */
async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string
): Promise<Response> {
  try {
    const res = await fetch(url, init)
    if (res.ok || res.status < 500) return res
    // 5xx error — retry once
    console.warn(`[CDN Provider] ${label}: got ${res.status}, retrying...`)
  } catch (err: any) {
    console.warn(`[CDN Provider] ${label}: network error, retrying...`, err?.message)
  }

  // Wait a moment then retry
  await new Promise((r) => setTimeout(r, 1000))
  return fetch(url, init)
}

export default class CdnFileProviderService extends AbstractFileProviderService {
  static identifier = "cdn"
  protected options_: Options

  constructor(container: any, options: Options) {
    super()
    this.options_ = options
  }

  async upload(file: ProviderUploadFileDTO): Promise<ProviderFileResultDTO> {
    const { filename, content, mimeType } = file

    const buffer = Buffer.from(content, "base64")
    const blob = new Blob([buffer], { type: mimeType })
    const slug = toSlug(filename)

    const formData = new FormData()
    formData.append("files", blob, filename)
    // Pass both slug and original filename → CDN uses for WordPress-style naming
    formData.append("slug", slug)
    formData.append("originalFilename", filename)

    console.log(`[CDN Provider] Uploading: "${filename}" (${(buffer.length / 1024).toFixed(1)}KB) → ${this.options_.url}`)

    const response = await fetchWithRetry(
      `${this.options_.url}/api/media/upload`,
      {
        method: "POST",
        headers: {
          "x-cdn-key": this.options_.key || "",
        },
        body: formData as any,
      },
      `upload "${filename}"`
    )

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[CDN Provider] ❌ Upload failed: ${response.status} ${response.statusText}`, errorText)
      throw new Error(`Failed to upload to CDN: ${response.statusText} - ${errorText}`)
    }

    const { data } = await response.json()

    console.log(`[CDN Provider] ✅ Uploaded: ${data.url} | alt: "${data.alt}" | title: "${data.title}"`)

    rememberMeta(data.url, {
      alt: data.alt ?? null,
      title: data.title ?? null,
      caption: data.caption ?? null,
      width: data.width ?? null,
      height: data.height ?? null,
      thumbUrl: data.thumbUrl ?? null,
      filename: data.filename,
      createdAt: Date.now(),
    })

    return {
      url: data.url,
      key: data.filename,
    }
  }

  async delete(fileData: ProviderDeleteFileDTO | ProviderDeleteFileDTO[]): Promise<void> {
    const fileArray = Array.isArray(fileData) ? fileData : [fileData]

    for (const file of fileArray) {
      if (!file.fileKey) continue

      console.log(`[CDN Provider] Deleting: ${file.fileKey}`)

      try {
        const response = await fetchWithRetry(
          `${this.options_.url}/api/media/delete`,
          {
            method: "DELETE",
            headers: {
              "Content-Type": "application/json",
              "x-cdn-key": this.options_.key || "",
            },
            body: JSON.stringify({ filename: file.fileKey }),
          },
          `delete "${file.fileKey}"`
        )

        if (!response.ok) {
          console.error(`[CDN Provider] ❌ Delete failed: ${response.statusText}`)
        } else {
          console.log(`[CDN Provider] 🗑️ Deleted: ${file.fileKey}`)
        }
      } catch (err: any) {
        console.error(`[CDN Provider] ❌ Delete error:`, err?.message)
      }
    }
  }

  async getPresignedDownloadUrl(fileData: ProviderGetFileDTO): Promise<string> {
    return `${this.options_.url}/uploads/${fileData.fileKey}`
  }

  async getDownloadStream(_fileData: ProviderGetFileDTO): Promise<any> {
    throw new Error("Method getDownloadStream not implemented.")
  }

  async getAsBuffer(_fileData: ProviderGetFileDTO): Promise<Buffer> {
    throw new Error("Method getAsBuffer not implemented.")
  }

  async getUploadStream(_fileData: any): Promise<any> {
    throw new Error("Method getUploadStream not implemented.")
  }
}
