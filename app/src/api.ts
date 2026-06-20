import { BACKEND_URL } from "./config"

const TOKEN_KEY = "orders_admin_jwt"

export const getToken = () => localStorage.getItem(TOKEN_KEY)
export const setToken = (t: string) => localStorage.setItem(TOKEN_KEY, t)
export const clearToken = () => localStorage.removeItem(TOKEN_KEY)

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/** Admin login — Medusa v2 emailpass. Returns the JWT and stores it. */
export async function login(email: string, password: string): Promise<string> {
  const res = await fetch(`${BACKEND_URL}/auth/user/emailpass`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || !data?.token) {
    throw new ApiError(res.status, data?.message || "Login failed. Check email/password.")
  }
  setToken(data.token)
  return data.token
}

/** Authenticated admin fetch. Adds Bearer token; throws on non-2xx. */
export async function adminFetch<T = any>(
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(init.headers as Record<string, string>),
  }
  if (token) headers["Authorization"] = `Bearer ${token}`

  const res = await fetch(`${BACKEND_URL}${path}`, { ...init, headers })

  if (res.status === 401) {
    clearToken()
    throw new ApiError(401, "Session expired. Please log in again.")
  }
  const text = await res.text()
  const data = text ? JSON.parse(text) : {}
  if (!res.ok) {
    throw new ApiError(res.status, data?.message || `Request failed (${res.status})`)
  }
  return data as T
}

// ---- Orders ----
export type OrderListItem = {
  id: string
  display_id: number
  status: string
  payment_status?: string
  fulfillment_status?: string
  total: number
  currency_code: string
  email?: string
  created_at: string
  shipping_address?: { first_name?: string; last_name?: string; city?: string }
  items?: { id: string }[]
}

export async function listOrders(offset = 0, limit = 20) {
  const fields =
    "id,display_id,status,payment_status,fulfillment_status,total,currency_code,email,created_at,*shipping_address,items.id"
  return adminFetch<{ orders: OrderListItem[]; count: number }>(
    `/admin/orders?limit=${limit}&offset=${offset}&order=-created_at&fields=${encodeURIComponent(
      fields
    )}`
  )
}

export async function getOrder(id: string) {
  // Conservative field set — only well-supported order fields/relations
  // so the request can't 400 on an unknown expansion. Delivery location
  // comes from order.metadata (copied from the cart by the order.placed
  // subscriber).
  const fields =
    "id,display_id,status,payment_status,fulfillment_status,total,subtotal,tax_total,shipping_total,discount_total,currency_code,email,created_at,metadata,*shipping_address,*items"
  return adminFetch<{ order: any }>(
    `/admin/orders/${id}?fields=${encodeURIComponent(fields)}`
  )
}

// ---- Status actions ----
export async function completeOrder(id: string) {
  return adminFetch(`/admin/orders/${id}/complete`, { method: "POST", body: "{}" })
}

export async function cancelOrder(id: string) {
  return adminFetch(`/admin/orders/${id}/cancel`, { method: "POST", body: "{}" })
}

/** Fulfill all unfulfilled items. */
export async function fulfillOrder(id: string, items: { id: string; quantity: number }[]) {
  return adminFetch(`/admin/orders/${id}/fulfillments`, {
    method: "POST",
    body: JSON.stringify({ items }),
  })
}

// ---- Dashboard ----
export async function getDashboard(period = "30d") {
  return adminFetch<any>(`/admin/dashboard-stats?period=${period}`)
}

// ---- Site settings (branding + theme) ----
export async function getSiteSettings() {
  return adminFetch<{ settings: Record<string, string> }>(`/admin/site-settings`)
}

// ---- Admin push ----
export async function getVapidKey() {
  return adminFetch<{ publicKey: string }>(`/admin/admin-push/vapid`)
}

export async function registerPush(sub: PushSubscription, label?: string) {
  const json = sub.toJSON()
  return adminFetch(`/admin/admin-push/subscribe`, {
    method: "POST",
    body: JSON.stringify({
      endpoint: json.endpoint,
      keys: json.keys,
      label,
    }),
  })
}

export async function unregisterPush(endpoint: string) {
  return adminFetch(`/admin/admin-push/subscribe`, {
    method: "DELETE",
    body: JSON.stringify({ endpoint }),
  })
}

export async function sendTestPush() {
  return adminFetch<{ ok: boolean; sent?: number; error?: string }>(
    `/admin/admin-push/test`,
    { method: "POST", body: "{}" }
  )
}
