export type AdminBanner = {
  id: string
  title: string | null
  subtitle: string | null
  image_url: string
  image_url_mobile: string | null
  link_url: string | null
  cta_label: string | null
  text_position: string
  theme: string
  sort_order: number
  is_active: boolean
  created_at?: string
  updated_at?: string
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
  return res.json()
}

export async function listBanners(): Promise<AdminBanner[]> {
  const res = await fetch("/admin/banners", { credentials: "include" })
  const json = await handle<{ banners: AdminBanner[] }>(res)
  return json.banners || []
}

export async function createBanner(
  data: Partial<AdminBanner>
): Promise<AdminBanner> {
  const res = await fetch("/admin/banners", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = await handle<{ banner: AdminBanner }>(res)
  return json.banner
}

export async function updateBanner(
  id: string,
  data: Partial<AdminBanner>
): Promise<AdminBanner> {
  const res = await fetch(`/admin/banners/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = await handle<{ banner: AdminBanner }>(res)
  return json.banner
}

export async function deleteBanner(id: string): Promise<void> {
  const res = await fetch(`/admin/banners/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
  await handle(res)
}
