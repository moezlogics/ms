export function getGuestId(): string {
  if (typeof window === "undefined") return ""
  let id = localStorage.getItem("medusa_guest_id")
  if (!id) {
    id = "guest_" + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
    localStorage.setItem("medusa_guest_id", id)
  }
  return id
}

export type GuestProfile = {
  name: string
  phone: string
  email: string
}

export function getGuestProfile(): GuestProfile {
  if (typeof window === "undefined") return { name: "", phone: "", email: "" }
  try {
    const p = localStorage.getItem("medusa_guest_profile")
    return p ? JSON.parse(p) : { name: "", phone: "", email: "" }
  } catch {
    return { name: "", phone: "", email: "" }
  }
}

export function saveGuestProfile(profile: GuestProfile) {
  if (typeof window === "undefined") return
  localStorage.setItem("medusa_guest_profile", JSON.stringify(profile))
}

export function getGuestOrders(): string[] {
  if (typeof window === "undefined") return []
  try {
    const o = localStorage.getItem("medusa_guest_orders")
    return o ? JSON.parse(o) : []
  } catch {
    return []
  }
}

export function addGuestOrder(orderId: string) {
  if (typeof window === "undefined") return
  try {
    const o = getGuestOrders()
    if (!o.includes(orderId)) {
      o.push(orderId)
      localStorage.setItem("medusa_guest_orders", JSON.stringify(o))
    }
  } catch {}
}
