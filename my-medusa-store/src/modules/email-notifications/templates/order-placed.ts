import { baseLayout, formatMoney, type EmailTheme } from "./base"

/**
 * Order Placed — Customer confirmation email.
 * Sent when a new order is placed.
 */
export function buildOrderPlacedEmail(data: Record<string, unknown>): {
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
  const items = order?.items || []
  const total = order?.total ?? 0
  const subtotal = order?.subtotal ?? 0
  const shippingTotal = order?.shipping_total ?? 0
  const taxTotal = order?.tax_total ?? 0

  const shipping = order?.shipping_address || {}
  const addressLines = [
    shipping.first_name && shipping.last_name
      ? `${shipping.first_name} ${shipping.last_name}`
      : "",
    shipping.address_1 || "",
    shipping.address_2 || "",
    [shipping.city, shipping.province, shipping.postal_code]
      .filter(Boolean)
      .join(", "),
    shipping.country_code?.toUpperCase() || "",
  ]
    .filter(Boolean)
    .join("<br/>")

  const itemRows = items
    .map(
      (item: any) => `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <div style="display:flex;align-items:center;gap:12px;">
            ${
              item.thumbnail
                ? `<img src="${item.thumbnail}" alt="${item.title}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;border:1px solid #e5e7eb;" />`
                : ""
            }
            <div>
              <p style="margin:0;font-size:14px;font-weight:600;color:#1a1a1a;">${item.title || "Product"}</p>
              ${item.variant?.title ? `<p style="margin:2px 0 0;font-size:12px;color:#6b7280;">${item.variant.title}</p>` : ""}
              <p style="margin:2px 0 0;font-size:12px;color:#9ca3af;">Qty: ${item.quantity || 1}</p>
            </div>
          </div>
        </td>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;text-align:right;font-size:14px;font-weight:600;color:#1a1a1a;">
          ${formatMoney((item.unit_price || 0) * (item.quantity || 1), currency)}
        </td>
      </tr>`
    )
    .join("")

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#ecfdf5;border-radius:50%;padding:12px;margin-bottom:12px;">
        <span style="font-size:28px;">✓</span>
      </div>
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a1a;">Order Confirmed!</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Thank you for your order. We'll send you a shipping confirmation once it ships.</p>
    </div>

    <div style="background:#f9fafb;border-radius:10px;padding:16px 20px;margin-bottom:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="font-size:13px;color:#6b7280;">Order Number</td>
          <td style="text-align:right;font-size:14px;font-weight:700;color:#1a1a1a;">#${orderId}</td>
        </tr>
      </table>
    </div>

    <h2 style="margin:0 0 12px;font-size:16px;font-weight:600;color:#1a1a1a;">Items Ordered</h2>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${itemRows}
    </table>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#6b7280;">Subtotal</td>
        <td style="text-align:right;font-size:13px;color:#1a1a1a;">${formatMoney(subtotal, currency)}</td>
      </tr>
      <tr>
        <td style="padding:4px 0;font-size:13px;color:#6b7280;">Shipping</td>
        <td style="text-align:right;font-size:13px;color:#1a1a1a;">${formatMoney(shippingTotal, currency)}</td>
      </tr>
      ${
        taxTotal > 0
          ? `<tr>
              <td style="padding:4px 0;font-size:13px;color:#6b7280;">Tax</td>
              <td style="text-align:right;font-size:13px;color:#1a1a1a;">${formatMoney(taxTotal, currency)}</td>
            </tr>`
          : ""
      }
      <tr>
        <td style="padding:12px 0 0;font-size:16px;font-weight:700;color:#1a1a1a;border-top:2px solid #1a1a1a;">Total</td>
        <td style="padding:12px 0 0;text-align:right;font-size:16px;font-weight:700;color:#1a1a1a;border-top:2px solid #1a1a1a;">${formatMoney(total, currency)}</td>
      </tr>
    </table>

    ${
      addressLines
        ? `
    <div style="margin-top:28px;">
      <h2 style="margin:0 0 8px;font-size:16px;font-weight:600;color:#1a1a1a;">Shipping Address</h2>
      <p style="margin:0;font-size:13px;color:#6b7280;line-height:1.6;">${addressLines}</p>
    </div>`
        : ""
    }
  `

  return {
    subject: `Order #${orderId} Confirmed — ${storeName}`,
    html: baseLayout({ storeName, logoUrl, copyright, theme, body }),
  }
}
