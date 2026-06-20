import { baseLayout, type EmailTheme } from "./base"

/**
 * Abandoned Cart Email Template
 *
 * Sent to customers who have items in their cart but haven't completed checkout.
 */
export function buildAbandonedCartEmail(data: Record<string, unknown>): {
  subject: string
  html: string
} {
  const firstName = (data.first_name as string) || "there"
  const items = (data.items as any[]) || []
  const cartUrl = (data.cart_url as string) || "#"
  const storeName =
    (data.store_name as string) ||
    process.env.STORE_NAME ||
    process.env.MEDUSA_STORE_NAME ||
    "Welcome"
  const logoUrl = data.logo_url as string | undefined
  const copyright = data.copyright as string | undefined
  const theme = (data.theme as EmailTheme | undefined) || undefined

  const itemsHtml = items
    .slice(0, 5)
    .map(
      (item: any) => `
    <tr>
      <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
        <table width="100%" cellpadding="0" cellspacing="0">
          <tr>
            <td width="60" style="vertical-align:top;">
              ${
                item.thumbnail
                  ? `<img src="${item.thumbnail}" alt="${item.title}" style="width:56px;height:56px;object-fit:cover;border-radius:8px;" />`
                  : `<div style="width:56px;height:56px;background:#f3f4f6;border-radius:8px;"></div>`
              }
            </td>
            <td style="padding-left:12px;vertical-align:top;">
              <p style="margin:0;font-size:14px;font-weight:600;color:#111827;">${item.title || "Product"}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">Qty: ${item.quantity || 1}</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  `
    )
    .join("")

  const body = `
    <h2 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;">
      You left something behind! 🛒
    </h2>
    <p style="margin:0 0 20px;font-size:15px;color:#4b5563;line-height:1.6;">
      Hi ${firstName}, it looks like you left some items in your cart. Don't worry — they're still waiting for you!
    </p>

    ${
      items.length > 0
        ? `
    <div style="background:#f9fafb;border-radius:12px;padding:16px;margin:20px 0;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${itemsHtml}
      </table>
      ${items.length > 5 ? `<p style="margin:12px 0 0;font-size:13px;color:#9ca3af;text-align:center;">and ${items.length - 5} more items...</p>` : ""}
    </div>
    `
        : ""
    }

    <div style="text-align:center;margin:24px 0;">
      <a href="${cartUrl}" style="display:inline-block;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);color:#ffffff;text-decoration:none;padding:14px 32px;border-radius:8px;font-weight:600;font-size:15px;">
        Complete Your Purchase →
      </a>
    </div>

    <p style="margin:24px 0 0;font-size:13px;color:#9ca3af;text-align:center;">
      Need help? Reply to this email and we'll be happy to assist.
    </p>
  `

  return {
    subject: `${firstName}, you forgot something! 🛒`,
    html: baseLayout({
      storeName,
      logoUrl,
      copyright,
      theme,
      body,
    }),
  }
}
