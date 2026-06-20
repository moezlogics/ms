/**
 * Theme palette consumed by every email template.
 *
 * Mirrors the site-settings theme tokens the storefront already uses
 * — `theme_header_bg` for the email header, `theme_primary` /
 * `theme_accent` for accent strips, OTP code box, CTA buttons, etc.
 * The order/contact/abandoned subscribers + OTP route resolve these
 * from the site_settings module on every send so the email always
 * reflects the admin's current palette without a redeploy.
 */
export type EmailTheme = {
  /** Background of the dark band at the top of the email. */
  headerBg?: string
  /** Logo / store-name text colour on top of headerBg. */
  headerFg?: string
  /** Primary brand colour — accent strips, primary CTA fills. */
  primary?: string
  /** Text on top of `primary` (button labels). */
  primaryFg?: string
  /** Secondary brand colour — gradient companion to primary. */
  accent?: string
  /** Body / page background. Usually a near-white. */
  bodyBg?: string
}

const FALLBACK_THEME: Required<EmailTheme> = {
  headerBg: "#1a1a1a",
  headerFg: "#ffffff",
  primary: "#1f1f1f",
  primaryFg: "#ffffff",
  accent: "#d2ef9a",
  bodyBg: "#ffffff",
}

export function resolveTheme(t?: EmailTheme): Required<EmailTheme> {
  return {
    headerBg: t?.headerBg || FALLBACK_THEME.headerBg,
    headerFg: t?.headerFg || FALLBACK_THEME.headerFg,
    primary: t?.primary || FALLBACK_THEME.primary,
    primaryFg: t?.primaryFg || FALLBACK_THEME.primaryFg,
    accent: t?.accent || FALLBACK_THEME.accent,
    bodyBg: t?.bodyBg || FALLBACK_THEME.bodyBg,
  }
}

/**
 * Base HTML email layout — themed to match the storefront.
 *
 * Design:
 *   - Header band painted in `theme.headerBg` with logo/store name in
 *     `theme.headerFg` so a dark header keeps light text legible (and
 *     vice-versa).
 *   - Clean body with content slot.
 *   - 4-pixel accent strip between header and body painted with the
 *     site's `primary` so every email carries the brand stripe.
 *   - Light gray footer with copyright + auto-message disclaimer.
 *
 * All CSS is inlined for maximum email client compatibility.
 */
export function baseLayout(opts: {
  storeName: string
  logoUrl?: string
  copyright?: string
  body: string
  theme?: EmailTheme
}): string {
  const { storeName, logoUrl, copyright, body } = opts
  const t = resolveTheme(opts.theme)

  const year = new Date().getFullYear()
  const footerCopy = copyright || `© ${year} ${storeName}. All rights reserved.`

  const logoBlock = logoUrl
    ? `<img src="${logoUrl}" alt="${storeName}" style="height:32px;width:auto;object-fit:contain;" />`
    : `<span style="font-size:22px;font-weight:700;letter-spacing:-0.5px;color:${t.headerFg};">${storeName}</span>`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${storeName}</title>
</head>
<body style="margin:0;padding:0;background:#f4f4f5;font-family:'Helvetica Neue',Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
    <tr>
      <td align="center" style="padding:24px 16px;">
        <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;">

          <!-- Header -->
          <tr>
            <td style="background:${t.headerBg};padding:20px 32px;border-radius:12px 12px 0 0;text-align:center;">
              ${logoBlock}
            </td>
          </tr>

          <!-- Brand accent strip -->
          <tr>
            <td style="height:4px;line-height:4px;font-size:0;background:linear-gradient(90deg, ${t.primary} 0%, ${t.accent} 50%, ${t.primary} 100%);">&nbsp;</td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="background:${t.bodyBg};padding:32px;border-left:1px solid #e5e7eb;border-right:1px solid #e5e7eb;">
              ${body}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#fafafa;padding:24px 32px;border-radius:0 0 12px 12px;border:1px solid #e5e7eb;border-top:none;text-align:center;">
              <p style="margin:0;font-size:12px;color:#9ca3af;line-height:1.6;">
                ${footerCopy}
              </p>
              <p style="margin:8px 0 0;font-size:11px;color:#d1d5db;">
                This is an automated message. Please do not reply directly.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

/** Format currency amount for email display */
export function formatMoney(amount: number, currencyCode: string): string {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currencyCode.toUpperCase(),
    }).format(amount)
  } catch {
    return `${currencyCode.toUpperCase()} ${amount.toFixed(2)}`
  }
}

/** Format date for email display */
export function formatDate(dateStr: string): string {
  try {
    return new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })
  } catch {
    return dateStr
  }
}
