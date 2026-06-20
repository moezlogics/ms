import { cdnUpload } from "./cdn-upload"
import type { CdnUploadResult } from "./cdn-upload"

export type UploadedImage = CdnUploadResult

export async function fetchSettings(): Promise<Record<string, string>> {
  const res = await fetch("/admin/site-settings", { credentials: "include" })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.settings || {}
}

export async function saveSettings(
  data: Record<string, any>
): Promise<Record<string, string>> {
  const res = await fetch("/admin/site-settings", {
    method: "PUT",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ settings: data }),
  })
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return json.settings || {}
}

/**
 * Upload a file (logo, favicon, banner, etc). Uses the consolidated CDN
 * upload utility which handles direct CDN upload + Medusa fallback.
 */
export async function uploadFile(file: File): Promise<UploadedImage> {
  return cdnUpload(file)
}
