import { baseLayout, formatMoney, type EmailTheme } from "./base"

/**
 * Order Placed — Admin notification email.
 * Alerts the admin when a new order comes in.
 */
export function buildOrderPlacedAdminEmail(data: Record<string, unknown>): {
  subject: string
  html: string
} {
  const order = data.order as any
  const storeName =
    (data.store_name as string) ||
    process.env.STORE_NAME ||
    process.env.MEDUSA_STORE_NAME ||
    "Welcome"
  const logoUrl = data.logo_url as string | undefined
  const copyright = data.copyright as string | undefined
  const theme = (data.theme as EmailTheme | undefined) || undefined

  const orderId = order?.display_id || order?.id || "N/A"
  const currency = order?.currency_code || "usd"
  const total = order?.total ?? 0
  const itemCount = (order?.items || []).length
  const customerEmail = order?.email || "N/A"
  const customerName = order?.shipping_address
    ? `${order.shipping_address.first_name || ""} ${order.shipping_address.last_name || ""}`.trim()
    : "Guest"

  const items = order?.items || []
  const itemSummary = items
    .map(
      (item: any) =>
        `<li style="margin:4px 0;font-size:13px;color:#374151;">${item.title || "Product"} × ${item.quantity || 1} — ${formatMoney((item.unit_price || 0) * (item.quantity || 1), currency)}</li>`
    )
    .join("")

  const body = `
    <div style="text-align:center;margin-bottom:24px;">
      <div style="display:inline-block;background:#fef3c7;border-radius:50%;padding:12px;margin-bottom:12px;">
        <span style="font-size:28px;">🛒</span>
      </div>
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a1a;">New Order Received!</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">A new order has been placed on your store.</p>
    </div>

    <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Order Number</td>
          <td style="text-align:right;font-size:14px;font-weight:700;color:#1a1a1a;">#${orderId}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Customer</td>
          <td style="text-align:right;font-size:14px;color:#1a1a1a;">${customerName}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Email</td>
          <td style="text-align:right;font-size:14px;color:#1a1a1a;">${customerEmail}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Items</td>
          <td style="text-align:right;font-size:14px;color:#1a1a1a;">${itemCount} item${itemCount !== 1 ? "s" : ""}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;border-top:1px solid #e5e7eb;padding-top:10px;">Total</td>
          <td style="text-align:right;font-size:18px;font-weight:700;color:#1a1a1a;border-top:1px solid #e5e7eb;padding-top:10px;">${formatMoney(total, currency)}</td>
        </tr>
      </table>
    </div>

    <h2 style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1a1a1a;">Order Items</h2>
    <ul style="padding-left:20px;margin:0 0 20px;">${itemSummary}</ul>

    <div style="text-align:center;">
      <p style="margin:0;font-size:13px;color:#6b7280;">
        Log in to the Medusa Admin to manage this order.
      </p>
    </div>
  `

  return {
    subject: `🛒 New Order #${orderId} — ${formatMoney(total, currency)} from ${customerName}`,
    html: baseLayout({ storeName, logoUrl, copyright, theme, body }),
  }
}
