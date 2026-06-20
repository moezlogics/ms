export function formatMoney(amount: number | null | undefined, currency = "PKR"): string {
  // Medusa v2 stores money in MAJOR units (e.g. 1500 = Rs 1,500), NOT cents.
  // The storefront's convertToLocale() passes the amount straight to
  // Intl with no /100 — we match that so prices are correct.
  const val = Number(amount) || 0
  try {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: currency.toUpperCase(),
      maximumFractionDigits: 2,
    }).format(val)
  } catch {
    return `${currency.toUpperCase()} ${val.toLocaleString()}`
  }
}

export function statusClass(status: string): "green" | "orange" | "red" | "grey" | "blue" {
  switch ((status || "").toLowerCase()) {
    case "completed":
    case "fulfilled":
    case "paid":
    case "captured":
      return "green"
    case "pending":
    case "processing":
    case "awaiting":
    case "partially_fulfilled":
    case "partially_captured":
    case "authorized":
      return "orange"
    case "canceled":
    case "failed":
    case "not_paid":
    case "not_fulfilled":
    case "requires_action":
      return "red"
    case "shipped":
    case "partially_shipped":
      return "blue"
    default:
      return "grey"
  }
}

export function timeAgo(iso: string): string {
  if (!iso) return ""
  const d = new Date(iso).getTime()
  const s = Math.floor((Date.now() - d) / 1000)
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return new Date(iso).toLocaleDateString()
}
