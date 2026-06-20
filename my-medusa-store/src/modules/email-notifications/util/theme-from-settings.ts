import type { EmailTheme } from "../templates/base"

/**
 * Pull the email-relevant theme tokens out of a site_settings dict.
 *
 * Storefront stores the same palette under `theme_*` keys (see
 * `src/admin/lib/theme-presets.ts` + the storefront's
 * `lib/util/theme.ts`). We map the admin's choices onto the email
 * template's lightweight `EmailTheme` so every transactional message
 * — OTPs, order receipts, abandoned-cart nudges, contact alerts —
 * automatically uses the storefront's live colour scheme.
 *
 * Hex strings are validated lightly (`#` + 3 or 6 hex chars). Anything
 * malformed is dropped, letting baseLayout fall back to its defaults.
 */
const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

function pick(s: Record<string, any>, key: string): string | undefined {
  const v = (s?.[key] || "").toString().trim()
  return v && HEX_RE.test(v) ? v : undefined
}

export function buildEmailThemeFromSettings(
  settings: Record<string, any> | undefined | null
): EmailTheme {
  const s = settings || {}
  return {
    headerBg: pick(s, "theme_header_bg"),
    headerFg: pick(s, "theme_header_fg"),
    primary: pick(s, "theme_primary"),
    primaryFg: pick(s, "theme_primary_fg"),
    accent: pick(s, "theme_accent"),
    bodyBg: pick(s, "theme_bg"),
  }
}
