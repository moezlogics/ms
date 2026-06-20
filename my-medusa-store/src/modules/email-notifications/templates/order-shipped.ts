import { baseLayout, type EmailTheme } from "./base"

/**
 * Order Shipped — Customer notification.
 * Sent when a fulfillment is created for an order.
 */
export function buildOrderShippedEmail(data: Record<string, unknown>): {
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

  const shipping = order?.shipping_address || {}
  const customerName = [shipping.first_name, shipping.last_name]
    .filter(Boolean)
    .join(" ") || "Customer"

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#dbeafe;border-radius:50%;padding:12px;margin-bottom:12px;">
        <span style="font-size:28px;">📦</span>
      </div>
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a1a;">Your Order Has Shipped!</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">Great news — your order is on its way.</p>
    </div>

    <div style="background:#f0f9ff;border-radius:10px;padding:20px;margin-bottom:24px;border:1px solid #bae6fd;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Order Number</td>
          <td style="text-align:right;font-size:14px;font-weight:700;color:#1a1a1a;">#${orderId}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Status</td>
          <td style="text-align:right;font-size:14px;font-weight:600;color:#2563eb;">Shipped</td>
        </tr>
      </table>
    </div>

    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0 0 16px;">
      Hi ${customerName},<br/><br/>
      Your order <strong>#${orderId}</strong> has been packed and shipped. You should receive it soon.
    </p>

    <p style="font-size:14px;color:#374151;line-height:1.6;margin:0;">
      If you have any questions about your delivery, feel free to contact us by replying to this email or visiting our contact page.
    </p>
  `

  return {
    subject: `📦 Order #${orderId} Shipped — ${storeName}`,
    html: baseLayout({ storeName, logoUrl, copyright, theme, body }),
  }
}
