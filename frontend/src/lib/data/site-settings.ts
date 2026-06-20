import "server-only"
import { cache } from "react"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL || "http://localhost:3072"

export type SiteSettings = {
  site_name?: string
  site_tagline?: string
  site_logo_url?: string
  site_logo_width_mobile?: string
  site_logo_width_desktop?: string
  site_favicon_url?: string

  seo_home_title?: string
  seo_home_description?: string
  seo_home_keywords?: string
  seo_default_og_image?: string

  announcement_bar_text?: string
  announcement_bar_enabled?: string
  // Optional admin-overridable colors for the announcement bar.
  // When unset, the bar falls back to theme primary / primary-fg.
  announcement_bar_bg?: string
  announcement_bar_fg?: string
  // Marquee scroll speed in pixels-per-second (numeric string). Higher
  // = faster ticker. Empty / non-numeric → component default (60).
  announcement_bar_speed?: string

  contact_email?: string
  contact_phone?: string
  contact_address?: string

  // ── Business / LocalBusiness profile (drives JSON-LD + AI prompt) ──
  // `business_type` selects the storefront vertical:
  //   "grocery"  → GroceryStore schema, grocery-flavoured chatbot
  //   "pharmacy" → Pharmacy schema (medicalSpecialty)
  //   "general"  → generic Store schema
  // Default = "grocery". Back-compat: a non-empty `pharmacy_license_number`
  // (legacy) implicitly resolves to "pharmacy".
  business_type?: string
  business_country?: string
  business_locality?: string
  business_region?: string
  business_postal_code?: string
  business_license_number?: string
  business_opening_hours?: string
  business_price_range?: string

  // Legacy pharmacy fields — kept for read-time back-compat with existing
  // installs. New deployments should populate `business_*` instead.
  pharmacy_license_number?: string
  pharmacy_country?: string
  pharmacy_locality?: string
  pharmacy_region?: string
  pharmacy_postal_code?: string
  pharmacy_opening_hours?: string

  social_facebook?: string
  social_instagram?: string
  social_twitter?: string
  social_youtube?: string
  social_pinterest?: string
  social_tiktok?: string

  footer_copyright?: string

  google_analytics_id?: string
  // Meta (Facebook) Pixel — when set, fbq is initialized site-wide and
  // the existing GA event helpers also forward to Meta standard events.
  meta_pixel_id?: string
  // Arbitrary HTML injected into <head> on every page (verification meta
  // tags, AdSense, custom analytics snippets, etc.). Admin-only field.
  head_code?: string

  // Storefront appearance
  product_card_aspect?: string
  /**
   * Admin-selected product card design variant. The storefront reads this
   * value and renders one of the pre-built `ProductPreview` variants site-wide
   * (shop grid, featured rails, related products, search results).
   * Falls back to `"minimal"` when unset or unknown.
   */
  product_card_variant?: string

  // Theme & Appearance (managed from /admin/theme)
  theme_preset?: string
  theme_primary?: string
  theme_primary_fg?: string
  theme_accent?: string
  theme_accent_fg?: string
  theme_bg?: string
  theme_surface?: string
  theme_surface_alt?: string
  theme_text?: string
  theme_text_muted?: string
  theme_border?: string
  theme_success?: string
  theme_warning?: string
  theme_danger?: string
  theme_info?: string
  theme_header_bg?: string
  theme_header_fg?: string
  theme_header_fg_muted?: string
  theme_header_hover_bg?: string
  theme_header_border?: string
  theme_header_accent?: string
  // Mobile browser address-bar color (Chrome/Edge/Samsung/Firefox on
  // Android colour the URL bar with this; iOS Safari only honours it
  // inside an installed PWA). Falls back to header_bg.
  theme_browser_bar?: string
  theme_radius?: string
  theme_container?: string
  theme_font?: string
  theme_header_top_border?: string
  theme_footer_bg?: string
  theme_footer_fg?: string
  theme_footer_border?: string
  theme_card_bg?: string
  theme_card_border?: string
  theme_price_color?: string
  theme_radius_card?: string
  theme_radius_btn?: string
  theme_radius_search?: string
  theme_radius_input?: string
  theme_radius_sidebar?: string
  theme_radius_mobile_footer?: string
  theme_mobile_footer_border?: string

  // Feature toggles (admin-managed)
  whatsapp_number?: string
  whatsapp_widget_enabled?: string
  whatsapp_buy_now_enabled?: string
  whatsapp_chatbot_enabled?: string
  cart_drawer_enabled?: string
  cart_drawer_cross_sell_enabled?: string
  cart_drawer_cross_sell_count?: string
  sticky_pdp_bar_enabled?: string
  recent_purchases_ticker_enabled?: string
  recent_purchases_ticker_interval?: string

  // Static pages content
  page_about_title?: string
  page_about_content?: string
  page_privacy_title?: string
  page_privacy_content?: string
  page_disclaimer_title?: string
  page_disclaimer_content?: string
  page_terms_title?: string
  page_terms_content?: string
  page_refund_title?: string
  page_refund_content?: string
  page_home_content?: string

  [key: string]: string | undefined
}

/**
 * Whitelist of Tailwind-safe aspect-ratio classes we allow operators to pick.
 * Tailwind's JIT compiler needs each class to appear as a literal string
 * somewhere in source, so we keep the list here (mirrored in the admin UI)
 * and read it whenever we need to map a setting to a className.
 */
export const PRODUCT_CARD_ASPECT_CLASSES: Record<string, string> = {
  "1/1": "aspect-[1/1]",
  "6/7": "aspect-[6/7]",
  "4/5": "aspect-[4/5]",
  "3/4": "aspect-[3/4]",
  "2/3": "aspect-[2/3]",
  "11/14": "aspect-[11/14]",
  "9/16": "aspect-[9/16]",
}

/**
 * Resolve the configured product card aspect ratio into a Tailwind class.
 * Falls back to Anvogue's default 3/4 portrait if the admin value is
 * missing, malformed, or not in our whitelist.
 */
export function resolveProductCardAspectClass(
  s: Pick<SiteSettings, "product_card_aspect">
): string {
  const raw = s.product_card_aspect?.trim()
  if (raw && PRODUCT_CARD_ASPECT_CLASSES[raw]) {
    return PRODUCT_CARD_ASPECT_CLASSES[raw]
  }
  return PRODUCT_CARD_ASPECT_CLASSES["3/4"]
}

const EMPTY: SiteSettings = {}

/**
 * Fetch all site settings from the public store endpoint.
 * ISR-cached for 60 seconds (matches backend Cache-Control).
 * Server-only: runs on the server so the backend URL is never exposed.
 */
export const getSiteSettings = cache(async function getSiteSettings(): Promise<SiteSettings> {
  try {
    const res = await fetch(`${BACKEND_URL}/store/site-settings`, {
      headers: {
        "x-publishable-api-key": process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || "",
      },
      next: { revalidate: 60, tags: ["site-settings"] },
      cache: "force-cache",
      // EVERY page render awaits this. Without a timeout a hung backend
      // held whole pages hostage (skeleton for 30-40s → client-side
      // exception). 8s cap → fall back to default branding instead.
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) {
      console.error("[SiteSettings] Fetch failed:", res.status)
      return EMPTY
    }

    const data = await res.json()
    return (data.settings || {}) as SiteSettings
  } catch (e) {
    console.error("[SiteSettings] Fetch error:", e)
    return EMPTY
  }
})

/**
 * Helper: returns true if announcement bar is enabled AND has text.
 */
export function isAnnouncementBarVisible(s: SiteSettings): boolean {
  return s.announcement_bar_enabled === "true" && !!s.announcement_bar_text?.trim()
}
