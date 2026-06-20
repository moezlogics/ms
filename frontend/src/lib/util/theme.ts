import type { SiteSettings } from "@lib/data/site-settings"

/**
 * Theme runtime — converts site-settings theme_* keys into a CSS variable
 * map that gets injected as a <style> block in the root layout.
 *
 * Strategy:
 *   - Each colour is stored as a hex (#RRGGBB) in site-settings
 *   - We expose them as `--color-primary: 31 31 31` (R G B triplet, no commas)
 *     so Tailwind's `bg-primary/10` opacity modifier works out of the box
 *     when colors in tailwind.config.js use:
 *       primary: 'rgb(var(--color-primary) / <alpha-value>)'
 *
 * Defaults match the existing Anvogue palette so an unconfigured store
 * looks identical to today (zero-regression).
 */

export type ThemeRuntime = {
  /** CSS string that goes inside a `<style>` tag — sets all theme variables */
  cssVarsBlock: string
  /** Inline style object for `<html style={...}>` — same vars as fallback */
  inlineStyle: Record<string, string>
  /** Resolved font family stack key (used to swap fonts) */
  fontKey: string
  /** Resolved container width key */
  containerKey: string
  /** Resolved radius scale key */
  radiusKey: string
}

const DEFAULTS = {
  primary: "#1F1F1F",
  primary_fg: "#FFFFFF",
  accent: "#D2EF9A",
  accent_fg: "#1F1F1F",
  bg: "#FFFFFF",
  surface: "#F7F7F7",
  surface_alt: "#FAFAFA",
  text: "#1F1F1F",
  text_muted: "#696C70",
  border: "#E9E9E9",
  success: "#3DAB25",
  warning: "#ECB018",
  danger: "#DB4444",
  info: "#8684D4",
  // Header — fall back to page colours so the header looks identical
  // to the rest of the storefront when the admin hasn't customised it.
  header_bg: "#FFFFFF",
  header_fg: "#1F1F1F",
  header_fg_muted: "#696C70",
  header_hover_bg: "#F7F7F7",
  header_border: "#E9E9E9",
  header_accent: "#1F1F1F",
  radius: "md",
  container: "default",
  font: "instrument",
  header_top_border: "",
  footer_bg: "",
  footer_fg: "",
  footer_border: "",
  card_bg: "",
  card_border: "",
  price_color: "",
  radius_card: "default",
  radius_btn: "default",
  radius_search: "default",
  radius_input: "default",
  radius_sidebar: "default",
  radius_mobile_footer: "default",
  mobile_footer_border: "",
}

const HEX_RE = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/

/** "#RRGGBB" → "R G B" (space-separated for Tailwind alpha modifier) */
export function hexToRgbTriplet(hex: string): string {
  if (!HEX_RE.test(hex)) return "0 0 0"
  let h = hex.replace("#", "")
  if (h.length === 3) {
    h = h.split("").map((c) => c + c).join("")
  }
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `${r} ${g} ${b}`
}

const RADIUS_SCALE: Record<string, { sm: string; base: string; lg: string; xl: string }> = {
  "sharp-0": { sm: "0px", base: "0px", lg: "0px", xl: "0px" },
  sm: { sm: "2px", base: "4px", lg: "6px", xl: "8px" },
  md: { sm: "4px", base: "8px", lg: "12px", xl: "16px" }, // default
  lg: { sm: "6px", base: "12px", lg: "16px", xl: "20px" },
  xl: { sm: "8px", base: "16px", lg: "20px", xl: "28px" },
}

const CONTAINER_WIDTH: Record<string, string> = {
  narrow: "1200px",
  default: "1322px",
  wide: "1440px",
  full: "100%",
}

/**
 * Curated font catalogue — exposed in the admin Theme & Appearance
 * dropdown so operators can pick a typeface that fits their category
 * (grocery / pharmacy / fashion / luxury / electronics / generic).
 *
 * Each entry is a fully-qualified `font-family` stack so the storefront
 * can render with sensible system fallbacks while a Google Font request
 * is still in flight. The first family name MUST match the Google Font
 * spelling because `getFontHref()` reuses the key to build the URL.
 *
 * Adding a new font: add it here AND in `getFontHref()` AND in the
 * `FONT_OPTIONS` array exported from
 * `my-medusa-store/src/admin/lib/theme-presets.ts`.
 */
const SYSTEM_FALLBACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const SERIF_FALLBACK =
  'Georgia, "Times New Roman", Times, serif'

const FONT_STACKS: Record<string, string> = {
  // ---- Default (next/font, ships with the build) ----
  instrument: `var(--font-instrument-sans), "Instrument Sans", ${SYSTEM_FALLBACK}`,

  // ---- Modern, neutral sans — great for fashion / electronics / generic ----
  inter: `Inter, ${SYSTEM_FALLBACK}`,
  "dm-sans": `"DM Sans", ${SYSTEM_FALLBACK}`,
  "plus-jakarta": `"Plus Jakarta Sans", ${SYSTEM_FALLBACK}`,
  outfit: `Outfit, ${SYSTEM_FALLBACK}`,
  sora: `Sora, ${SYSTEM_FALLBACK}`,

  // ---- Friendly / rounded — great for grocery, kids, food, lifestyle ----
  manrope: `Manrope, ${SYSTEM_FALLBACK}`,
  poppins: `"Poppins", ${SYSTEM_FALLBACK}`,
  nunito: `Nunito, ${SYSTEM_FALLBACK}`,
  quicksand: `Quicksand, ${SYSTEM_FALLBACK}`,

  // ---- Professional / technical — pharmacy, medical, B2B, electronics ----
  "ibm-plex": `"IBM Plex Sans", ${SYSTEM_FALLBACK}`,
  roboto: `Roboto, ${SYSTEM_FALLBACK}`,
  "work-sans": `"Work Sans", ${SYSTEM_FALLBACK}`,

  // ---- Editorial / luxury — fashion, beauty, premium, jewellery ----
  playfair: `"Playfair Display", ${SERIF_FALLBACK}`,
  cormorant: `"Cormorant Garamond", ${SERIF_FALLBACK}`,
  lora: `Lora, ${SERIF_FALLBACK}`,

  // ---- System default — fastest possible load, zero network cost ----
  system: SYSTEM_FALLBACK,
}

function pick(s: SiteSettings, key: keyof typeof DEFAULTS): string {
  const raw = (s[`theme_${key}`] as string | undefined)?.trim()
  if (key === "radius" || key === "container" || key === "font") {
    return raw || DEFAULTS[key]
  }
  return raw && HEX_RE.test(raw) ? raw : DEFAULTS[key]
}

/**
 * Like `pick` but falls back to a runtime-computed default rather than
 * the static DEFAULTS table. Used for header_* tokens which inherit
 * from the resolved global tokens (e.g. header_bg falls back to bg).
 */
function pickWithFallback(
  s: SiteSettings,
  key: string,
  fallback: string
): string {
  const raw = (s[`theme_${key}`] as string | undefined)?.trim()
  return raw && HEX_RE.test(raw) ? raw : fallback
}

/**
 * Relative luminance per WCAG. 0 = black, 1 = white. Used to pick a
 * contrast colour (text/icons on the header bar) when the admin has
 * overridden the header background but left the foreground blank.
 */
function luminance(hex: string): number {
  if (!HEX_RE.test(hex)) return 1
  let h = hex.replace("#", "")
  if (h.length === 3) h = h.split("").map((c) => c + c).join("")
  const toLin = (c: number) => {
    const s = c / 255
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
  }
  const r = toLin(parseInt(h.slice(0, 2), 16))
  const g = toLin(parseInt(h.slice(2, 4), 16))
  const b = toLin(parseInt(h.slice(4, 6), 16))
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/**
 * Pick a foreground colour that's guaranteed to contrast with `bg`.
 * Lightens to near-white on dark backgrounds, darkens to near-black on
 * light backgrounds. Used as the *contrast-aware* fallback for
 * `theme_header_fg` so the header never goes invisible just because
 * the admin set a dark bg but didn't pick a matching fg.
 */
function autoContrast(bg: string, lightFg: string, darkFg: string): string {
  return luminance(bg) < 0.5 ? lightFg : darkFg
}

export function buildTheme(s: SiteSettings): ThemeRuntime {
  const primary = pick(s, "primary")
  const primary_fg = pick(s, "primary_fg")
  const accent = pick(s, "accent")
  const accent_fg = pick(s, "accent_fg")
  const bg = pick(s, "bg")
  const surface = pick(s, "surface")
  const surface_alt = pick(s, "surface_alt")
  const text = pick(s, "text")
  const text_muted = pick(s, "text_muted")
  const border = pick(s, "border")
  const success = pick(s, "success")
  const warning = pick(s, "warning")
  const danger = pick(s, "danger")
  const info = pick(s, "info")

  // Header colours — when the admin overrides only `header_bg` (e.g.
  // picks a dark colour for a light theme) the foreground tokens get
  // CONTRAST-AWARE fallbacks instead of inheriting the page text colour.
  // Otherwise dark-on-dark or light-on-light icons go invisible — that's
  // exactly the bug that hid the cart / search / nav after the build.
  const header_bg = pickWithFallback(s, "header_bg", bg)
  const isDarkHeader = luminance(header_bg) < 0.5
  // If page text already contrasts with the header bg, keep using it
  // (preserves the admin's brand text colour). Otherwise auto-flip.
  const textContrastsHeader =
    isDarkHeader === luminance(text) > 0.5
  const fgDefault = textContrastsHeader
    ? text
    : autoContrast(header_bg, "#FFFFFF", "#1F1F1F")
  const fgMutedDefault = textContrastsHeader
    ? text_muted
    : autoContrast(header_bg, "#CBD5E1", "#6B7280")
  const hoverDefault = autoContrast(header_bg, "#1F2937", surface)
  const borderDefault = autoContrast(header_bg, "#27272F", border)

  const header_fg = pickWithFallback(s, "header_fg", fgDefault)
  const header_fg_muted = pickWithFallback(s, "header_fg_muted", fgMutedDefault)
  const header_hover_bg = pickWithFallback(s, "header_hover_bg", hoverDefault)
  const header_border = pickWithFallback(s, "header_border", borderDefault)
  const header_accent = pickWithFallback(s, "header_accent", primary)

  const header_top_border = pickWithFallback(s, "header_top_border", header_accent)
  const footer_bg = pickWithFallback(s, "footer_bg", bg)
  const footer_fg = pickWithFallback(s, "footer_fg", text_muted)
  const footer_border = pickWithFallback(s, "footer_border", border)
  const card_bg = pickWithFallback(s, "card_bg", surface)
  const card_border = pickWithFallback(s, "card_border", border)
  const price_color = pickWithFallback(s, "price_color", primary)

  const radiusKey = pick(s, "radius")
  const containerKey = pick(s, "container")
  const fontKey = pick(s, "font")

  const radius = RADIUS_SCALE[radiusKey] || RADIUS_SCALE.md
  const containerW = CONTAINER_WIDTH[containerKey] || CONTAINER_WIDTH.default
  const fontStack = FONT_STACKS[fontKey] || FONT_STACKS.instrument

  // Resolve individual radii helper function
  const resolveIndividualRadius = (
    choice: string | undefined,
    defaultField: "sm" | "base" | "lg" | "xl",
    defaultChoice: string = "default_scale"
  ): string => {
    const effectiveChoice = !choice || choice === "default" ? defaultChoice : choice

    if (effectiveChoice === "sharp-0") return "0px"
    if (effectiveChoice === "full") return "9999px"

    if (effectiveChoice === "default_scale") {
      const scale = RADIUS_SCALE[radiusKey] || RADIUS_SCALE.md
      return scale[defaultField]
    }

    // Specific scale selected
    const scale = RADIUS_SCALE[effectiveChoice] || RADIUS_SCALE[radiusKey] || RADIUS_SCALE.md
    return scale[defaultField]
  }

  const radiusCard = resolveIndividualRadius(s.theme_radius_card, "lg")
  const radiusBtn = resolveIndividualRadius(s.theme_radius_btn, "lg")
  const radiusSearch = resolveIndividualRadius(s.theme_radius_search, "xl", "full")
  const radiusInput = resolveIndividualRadius(s.theme_radius_input, "base")
  const radiusSidebar = resolveIndividualRadius(s.theme_radius_sidebar, "lg")
  const radiusMobileFooter = resolveIndividualRadius(s.theme_radius_mobile_footer, "xl")
  const mobileFooterBorder = pickWithFallback(s, "mobile_footer_border", border)

  // RGB triplet form for Tailwind opacity modifiers
  const map: Record<string, string> = {
    "--color-primary": hexToRgbTriplet(primary),
    "--color-primary-fg": hexToRgbTriplet(primary_fg),
    "--color-accent": hexToRgbTriplet(accent),
    "--color-accent-fg": hexToRgbTriplet(accent_fg),
    "--color-bg": hexToRgbTriplet(bg),
    "--color-surface": hexToRgbTriplet(surface),
    "--color-surface-alt": hexToRgbTriplet(surface_alt),
    "--color-text": hexToRgbTriplet(text),
    "--color-text-muted": hexToRgbTriplet(text_muted),
    "--color-border": hexToRgbTriplet(border),
    "--color-success": hexToRgbTriplet(success),
    "--color-warning": hexToRgbTriplet(warning),
    "--color-danger": hexToRgbTriplet(danger),
    "--color-info": hexToRgbTriplet(info),

    // Header tokens — separate from the page so admins can run a
    // dark header on a light page (or vice versa) without breaking
    // contrast on cart / search / nav icons.
    "--color-header-bg": hexToRgbTriplet(header_bg),
    "--color-header-fg": hexToRgbTriplet(header_fg),
    "--color-header-fg-muted": hexToRgbTriplet(header_fg_muted),
    "--color-header-hover-bg": hexToRgbTriplet(header_hover_bg),
    "--color-header-border": hexToRgbTriplet(header_border),
    "--color-header-accent": hexToRgbTriplet(header_accent),

    // Advanced color overrides
    "--color-header-top-border": hexToRgbTriplet(header_top_border),
    "--color-footer-bg": hexToRgbTriplet(footer_bg),
    "--color-footer-fg": hexToRgbTriplet(footer_fg),
    "--color-footer-border": hexToRgbTriplet(footer_border),
    "--color-card-bg": hexToRgbTriplet(card_bg),
    "--color-card-border": hexToRgbTriplet(card_border),
    "--color-price": hexToRgbTriplet(price_color),
    "--color-mobile-footer-border": hexToRgbTriplet(mobileFooterBorder),

    // Hex form (for places that need a direct color value, e.g. SVGs)
    "--hex-primary": primary,
    "--hex-primary-fg": primary_fg,
    "--hex-accent": accent,
    "--hex-accent-fg": accent_fg,
    "--hex-bg": bg,
    "--hex-surface": surface,
    "--hex-surface-alt": surface_alt,
    "--hex-text": text,
    "--hex-text-muted": text_muted,
    "--hex-border": border,
    "--hex-success": success,
    "--hex-warning": warning,
    "--hex-danger": danger,
    "--hex-info": info,
    "--hex-header-bg": header_bg,
    "--hex-header-fg": header_fg,
    "--hex-header-accent": header_accent,
    "--hex-header-top-border": header_top_border,
    "--hex-footer-bg": footer_bg,
    "--hex-footer-fg": footer_fg,
    "--hex-footer-border": footer_border,
    "--hex-card-bg": card_bg,
    "--hex-card-border": card_border,
    "--hex-price": price_color,
    "--hex-mobile-footer-border": mobileFooterBorder,

    // Legacy Anvogue tokens — aliased so existing components keep working
    "--green": accent,
    "--black": primary,
    "--secondary": text_muted,
    "--secondary2": text_muted,
    "--white": bg,
    "--surface": surface,
    "--red": danger,
    "--purple": info,
    "--success": success,
    "--yellow": warning,
    "--pink": danger,
    "--line": border,

    // Layout
    "--radius-sm": radius.sm,
    "--radius-base": radius.base,
    "--radius-lg": radius.lg,
    "--radius-xl": radius.xl,
    "--radius-card": radiusCard,
    "--radius-btn": radiusBtn,
    "--radius-search": radiusSearch,
    "--radius-input": radiusInput,
    "--radius-sidebar": radiusSidebar,
    "--radius-mobile-footer": radiusMobileFooter,
    "--container-width": containerW,
    "--font-stack": fontStack,
  }

  // Build CSS string for <style> injection (works without JS)
  const cssVarsBlock =
    ":root {\n" +
    Object.entries(map)
      .map(([k, v]) => `  ${k}: ${v};`)
      .join("\n") +
    "\n}\n"

  return {
    cssVarsBlock,
    inlineStyle: map,
    fontKey,
    containerKey,
    radiusKey,
  }
}

/**
 * Google Fonts URL for non-default font choices.
 *
 * Returns `null` for `"instrument"` (already shipped via next/font in
 * the layout) and `"system"` (no network font needed). All other keys
 * map to a `display=swap` Google Fonts CSS request so the storefront
 * renders immediately with the system fallback and swaps in the chosen
 * typeface as soon as it arrives — same UX strategy Shopify uses.
 *
 * Weights chosen on a per-font basis: a tight 400/500/600/700 set for
 * sans typefaces (covers body, button, heading) and 400/600/700 for
 * serif display faces where italic/extra weights aren't used.
 */
const GOOGLE_FONT_HREFS: Record<string, string> = {
  // Modern sans
  inter:
    "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  "dm-sans":
    "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
  "plus-jakarta":
    "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
  outfit:
    "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
  sora:
    "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap",

  // Friendly / rounded
  manrope:
    "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap",
  poppins:
    "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap",
  nunito:
    "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap",
  quicksand:
    "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap",

  // Professional / technical
  "ibm-plex":
    "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
  roboto:
    "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  "work-sans":
    "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap",

  // Editorial / luxury
  playfair:
    "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap",
  cormorant:
    "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap",
  lora:
    "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap",
}

export function getFontHref(fontKey: string): string | null {
  return GOOGLE_FONT_HREFS[fontKey] || null
}
