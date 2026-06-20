import { baseLayout, type EmailTheme } from "./base"

/**
 * Contact Form Received — Admin alert email.
 * Sent when someone submits the contact form on the storefront.
 */
export function buildContactReceivedEmail(data: Record<string, unknown>): {
  subject: string
  html: string
} {
  const storeName =
    (data.store_name as string) ||
    process.env.STORE_NAME ||
    process.env.MEDUSA_STORE_NAME ||
    "Welcome"
  const logoUrl = data.logo_url as string | undefined
  const copyright = data.copyright as string | undefined
  const theme = (data.theme as EmailTheme | undefined) || undefined

  const name = (data.name as string) || "Unknown"
  const email = (data.email as string) || "N/A"
  const phone = (data.phone as string) || "—"
  const subject = (data.subject as string) || "No Subject"
  const message = (data.message as string) || ""

  const body = `
    <div style="text-align:center;margin-bottom:28px;">
      <div style="display:inline-block;background:#ede9fe;border-radius:50%;padding:12px;margin-bottom:12px;">
        <span style="font-size:28px;">✉️</span>
      </div>
      <h1 style="margin:0;font-size:24px;font-weight:700;color:#1a1a1a;">New Contact Message</h1>
      <p style="margin:8px 0 0;font-size:14px;color:#6b7280;">A visitor has sent a message via the contact form.</p>
    </div>

    <div style="background:#f9fafb;border-radius:10px;padding:20px;margin-bottom:24px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;width:100px;">Name</td>
          <td style="padding:6px 0;font-size:14px;font-weight:600;color:#1a1a1a;">${name}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Email</td>
          <td style="padding:6px 0;font-size:14px;color:#1a1a1a;">
            <a href="mailto:${email}" style="color:#2563eb;text-decoration:none;">${email}</a>
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Phone</td>
          <td style="padding:6px 0;font-size:14px;color:#1a1a1a;">${phone}</td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#6b7280;">Subject</td>
          <td style="padding:6px 0;font-size:14px;color:#1a1a1a;">${subject}</td>
        </tr>
      </table>
    </div>

    <h2 style="margin:0 0 8px;font-size:15px;font-weight:600;color:#1a1a1a;">Message</h2>
    <div style="background:#ffffff;border:1px solid #e5e7eb;border-radius:10px;padding:16px;">
      <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;white-space:pre-line;">${message}</p>
    </div>

    <div style="text-align:center;margin-top:24px;">
      <p style="font-size:13px;color:#9ca3af;margin:0;">
        Reply directly to <a href="mailto:${email}" style="color:#2563eb;">${email}</a> to respond.
      </p>
    </div>
  `

  return {
    subject: `✉️ New Contact: "${subject}" from ${name}`,
    html: baseLayout({ storeName, logoUrl, copyright, theme, body }),
  }
}
