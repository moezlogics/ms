export type AdminBrand = {
  id: string
  name: string
  handle: string
  logo_url: string | null
  description: string | null
  website_url: string | null
  seo_title: string | null
  seo_description: string | null
  sort_order: number
  is_active: boolean
  /** null for top-level brands; otherwise points at parent brand.id */
  parent_id: string | null
  created_at?: string
  updated_at?: string
}

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`)
  return res.json()
}

export async function listBrands(): Promise<AdminBrand[]> {
  const res = await fetch("/admin/brands", { credentials: "include" })
  const json = await handle<{ brands: AdminBrand[] }>(res)
  return json.brands || []
}

export async function createBrand(
  data: Partial<AdminBrand>
): Promise<AdminBrand> {
  const res = await fetch("/admin/brands", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = await handle<{ brand: AdminBrand }>(res)
  return json.brand
}

export async function updateBrand(
  id: string,
  data: Partial<AdminBrand>
): Promise<AdminBrand> {
  const res = await fetch(`/admin/brands/${id}`, {
    method: "PATCH",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  })
  const json = await handle<{ brand: AdminBrand }>(res)
  return json.brand
}

export async function deleteBrand(id: string): Promise<void> {
  const res = await fetch(`/admin/brands/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
  await handle(res)
}

export async function getProductBrand(
  productId: string
): Promise<AdminBrand | null> {
  const res = await fetch(
    `/admin/brands/product-link?product_id=${productId}`,
    { credentials: "include" }
  )
  const json = await handle<{ brand: AdminBrand | null }>(res)
  return json.brand
}

export async function setProductBrand(
  productId: string,
  brandId: string
): Promise<void> {
  const res = await fetch("/admin/brands/product-link", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product_id: productId, brand_id: brandId }),
  })
  await handle(res)
}

export async function removeProductBrand(productId: string): Promise<void> {
  const res = await fetch(
    `/admin/brands/product-link?product_id=${productId}`,
    { method: "DELETE", credentials: "include" }
  )
  await handle(res)
}
