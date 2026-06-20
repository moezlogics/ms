import "server-only"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:3062"

export type Banner = {
  id: string
  title: string | null
  subtitle: string | null
  image_url: string
  image_url_mobile: string | null
  link_url: string | null
  cta_label: string | null
  sort_order: number
  is_active: boolean
}

/**
 * Fetch active homepage banners ordered by sort_order ASC.
 * Falls back to [] on any error so the homepage always renders.
 */
export async function listBanners(): Promise<Banner[]> {
  try {
    const res = await fetch(`${BACKEND_URL}/store/banners`, {
      headers: {
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
      // Short revalidate so admin edits propagate quickly without a rebuild.
      next: { revalidate: 60, tags: ["banners"] },
      cache: "force-cache",
    })
    if (!res.ok) return []
    const data = await res.json()
    return (data.banners || []) as Banner[]
  } catch (e) {
    console.error("[banners] list failed", e)
    return []
  }
}
