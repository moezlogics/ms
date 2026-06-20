import { defineRouteConfig } from "@medusajs/admin-sdk"
import { SwatchSolid } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  toast,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { fetchSettings, saveSettings } from "../../lib/settings-sdk"
import { A, adminSection, adminStickyHeader, adminSectionTitle, adminDescription } from "../../lib/admin-theme"
import {
  THEME_PRESETS,
  THEME_KEYS,
  RADIUS_OPTIONS,
  CONTAINER_OPTIONS,
  FONT_OPTIONS,
  DEFAULT_PRESET,
  presetToSettings,
  type ThemePreset,
} from "../../lib/theme-presets"

type ThemeState = Record<string, string>

/**
 * Font preview map — mirrors the storefront's `FONT_STACKS` and
 * `GOOGLE_FONT_HREFS` so the admin LivePreview shows the chosen
 * typeface without waiting for a storefront refresh. Keep these
 * three lists (here, theme.ts FONT_STACKS, theme-presets.ts
 * FONT_OPTIONS) in sync when adding a font.
 */
const SYS_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif'
const SERIF_STACK = 'Georgia, "Times New Roman", Times, serif'

const FONT_PREVIEW: Record<string, { family: string; href: string | null }> = {
  instrument: { family: `"Instrument Sans", ${SYS_STACK}`, href: null },
  system: { family: SYS_STACK, href: null },

  inter: {
    family: `Inter, ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap",
  },
  "dm-sans": {
    family: `"DM Sans", ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700&display=swap",
  },
  "plus-jakarta": {
    family: `"Plus Jakarta Sans", ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
  },
  outfit: {
    family: `Outfit, ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700&display=swap",
  },
  sora: {
    family: `Sora, ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap",
  },

  manrope: {
    family: `Manrope, ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&display=swap",
  },
  poppins: {
    family: `"Poppins", ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700;800;900&display=swap",
  },
  nunito: {
    family: `Nunito, ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Nunito:wght@400;500;600;700&display=swap",
  },
  quicksand: {
    family: `Quicksand, ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap",
  },

  "ibm-plex": {
    family: `"IBM Plex Sans", ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap",
  },
  roboto: {
    family: `Roboto, ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap",
  },
  "work-sans": {
    family: `"Work Sans", ${SYS_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Work+Sans:wght@400;500;600;700&display=swap",
  },

  playfair: {
    family: `"Playfair Display", ${SERIF_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;600;700&display=swap",
  },
  cormorant: {
    family: `"Cormorant Garamond", ${SERIF_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&display=swap",
  },
  lora: {
    family: `Lora, ${SERIF_STACK}`,
    href: "https://fonts.googleapis.com/css2?family=Lora:wght@400;500;600;700&display=swap",
  },
}

/**
 * Idempotent loader — appends a `<link>` to <head> the first time we
 * see a Google Font URL and is a no-op for any subsequent call. Used
 * by the LivePreview so the admin sees the chosen typeface without
 * having to refresh the page.
 */
function ensureFontLoaded(href: string | null) {
  if (!href || typeof document === "undefined") return
  const id = `theme-font-${href}`
  if (document.getElementById(id)) return
  const link = document.createElement("link")
  link.id = id
  link.rel = "stylesheet"
  link.href = href
  document.head.appendChild(link)
}

type ColourGroup = "Brand" | "Surfaces" | "Text" | "Header" | "Status"

const COLOR_FIELDS: Array<{
  key: string
  label: string
  group: ColourGroup
  hint?: string
}> = [
  { key: "theme_primary", label: "Primary", group: "Brand", hint: "Main brand colour — buttons, links, active states" },
  { key: "theme_primary_fg", label: "On Primary (text)", group: "Brand", hint: "Text colour on primary backgrounds" },
  { key: "theme_accent", label: "Accent", group: "Brand", hint: "Hover states, badges, highlights" },
  { key: "theme_accent_fg", label: "On Accent (text)", group: "Brand", hint: "Text colour on accent backgrounds" },
  { key: "theme_bg", label: "Page background", group: "Surfaces" },
  { key: "theme_surface", label: "Surface (cards)", group: "Surfaces" },
  { key: "theme_surface_alt", label: "Surface alt", group: "Surfaces", hint: "Striped rows, subtle fills" },
  { key: "theme_border", label: "Border / line", group: "Surfaces" },
  { key: "theme_card_bg", label: "Card background", group: "Surfaces", hint: "Custom background for product cards" },
  { key: "theme_card_border", label: "Card border", group: "Surfaces", hint: "Custom outline for product cards" },
  { key: "theme_footer_bg", label: "Footer background", group: "Surfaces", hint: "Custom background for footer" },
  { key: "theme_footer_border", label: "Footer border", group: "Surfaces", hint: "Divider line and top border for footer" },
  { key: "theme_mobile_footer_border", label: "Mobile footer border color", group: "Surfaces", hint: "Top border color of the bottom nav footer on mobile viewports." },
  { key: "theme_text", label: "Text — main", group: "Text" },
  { key: "theme_text_muted", label: "Text — muted", group: "Text", hint: "Captions, meta, helper text" },
  { key: "theme_footer_fg", label: "Footer text & links", group: "Text", hint: "Text and link colour inside the footer" },
  { key: "theme_price_color", label: "Price color", group: "Text", hint: "Used for product prices on cards and details pages." },
  // Header — kept separate so admins can run a dark header on a light
  // page (or vice versa) without losing icon/text contrast.
  { key: "theme_header_bg", label: "Header background", group: "Header", hint: "Header bar colour. Go dark here to invert the top bar." },
  { key: "theme_header_fg", label: "Header text & icons", group: "Header", hint: "Logo text, nav links, cart/search/account icons. MUST contrast header background." },
  { key: "theme_header_fg_muted", label: "Header — muted text", group: "Header", hint: "Secondary nav text, helper labels in the header." },
  { key: "theme_header_hover_bg", label: "Header — hover surface", group: "Header", hint: "Background that fills behind icons on hover. Usually a hair lighter (dark) or darker (light) than the header bg." },
  { key: "theme_header_border", label: "Header — bottom border", group: "Header", hint: "Hairline beneath the header." },
  { key: "theme_header_accent", label: "Header — accent", group: "Header", hint: "Hover underline + icon hover colour + the accent strip." },
  { key: "theme_header_top_border", label: "Header top border", group: "Header", hint: "Strip on the very top of the header bar." },
  { key: "theme_browser_bar", label: "Browser address bar", group: "Header", hint: "Colour shown in the mobile browser top bar (Chrome/Edge/Samsung/Firefox on Android). Leave blank to inherit from the header background. iOS Safari only honours this inside an installed PWA." },
  { key: "theme_success", label: "Success", group: "Status" },
  { key: "theme_warning", label: "Warning", group: "Status" },
  { key: "theme_danger", label: "Danger / error", group: "Status" },
  { key: "theme_info", label: "Info", group: "Status" },
]

const groupOrder: Array<ColourGroup> = [
  "Brand",
  "Surfaces",
  "Text",
  "Header",
  "Status",
]

const isHex = (v: string) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v.trim())

const Section = ({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children: React.ReactNode
}) => (
  <div style={adminSection}>
    <div style={{ marginBottom: 16 }}>
      <h3 style={adminSectionTitle}>{title}</h3>
      {description && (
        <p style={adminDescription}>
          {description}
        </p>
      )}
    </div>
    {children}
  </div>
)

const ColorField = ({
  label,
  value,
  onChange,
  hint,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  hint?: string
}) => {
  const safeValue = isHex(value) ? value : "#000000"
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <Label>{label}</Label>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <div
          style={{
            position: "relative",
            width: 40,
            height: 40,
            borderRadius: 8,
            border: A.border,
            background: safeValue,
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <input
            type="color"
            value={safeValue}
            onChange={(e) => onChange(e.target.value.toUpperCase())}
            style={{
              position: "absolute",
              inset: 0,
              opacity: 0,
              cursor: "pointer",
              width: "100%",
              height: "100%",
            }}
            aria-label={`${label} colour picker`}
          />
        </div>
        <Input
          value={value}
          onChange={(e: any) => onChange(e.target.value)}
          placeholder="#000000"
          style={{ fontFamily: "monospace", fontSize: 13, background: A.bgField, color: A.fg }}
        />
      </div>
      {hint && (
        <p style={{ fontSize: 11, color: A.fgMuted, margin: 0 }}>{hint}</p>
      )}
    </div>
  )
}

const PresetCard = ({
  preset,
  active,
  onApply,
}: {
  preset: ThemePreset
  active: boolean
  onApply: () => void
}) => (
  <button
    type="button"
    onClick={onApply}
    style={{
      textAlign: "left",
      border: active ? "2px solid " + A.fg : A.border,
      borderRadius: 12,
      padding: 14,
      background: A.bgCard,
      cursor: "pointer",
      transition: "all 150ms",
      boxShadow: active
        ? "0 4px 12px rgba(0,0,0,0.2)"
        : "0 1px 2px rgba(0,0,0,0.1)",
    }}
  >
    <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
      {preset.swatch.map((c, i) => (
        <div
          key={i}
          style={{
            width: 28,
            height: 28,
            borderRadius: 6,
            background: c,
            border: "1px solid rgba(0,0,0,0.08)",
          }}
        />
      ))}
    </div>
    <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 2 }}>
      {preset.name}
      {active && (
        <span
          style={{
            marginLeft: 6,
            fontSize: 10,
            background: "#111",
            color: "#fff",
            padding: "2px 6px",
            borderRadius: 4,
            fontWeight: 700,
            letterSpacing: 0.5,
          }}
        >
          ACTIVE
        </span>
      )}
    </div>
    <p style={{ fontSize: 12, color: "#6b7280", margin: 0, lineHeight: 1.4 }}>
      {preset.description}
    </p>
  </button>
)

const INDIVIDUAL_RADIUS_OPTIONS = [
  { value: "default", label: "Inherit from Global" },
  { value: "sharp-0", label: "Sharp (0px)" },
  { value: "sm", label: "Sharp (2px / 4px)" },
  { value: "md", label: "Soft (8px)" },
  { value: "lg", label: "Rounded (12px)" },
  { value: "xl", label: "Pillowy (20px)" },
  { value: "full", label: "Pill (9999px)" },
]

const LivePreview = ({ tokens }: { tokens: ThemeState }) => {
  const safe = (k: string, fallback: string) =>
    isHex(tokens[k] || "") ? tokens[k] : fallback

  // Resolve admin-selected typeface + radius scale and lazy-load the
  // matching Google Font (no-op for system / Instrument Sans). The
  // preview wrapper below applies these so the operator sees the
  // chosen font and corner radius live.
  const fontKey = tokens.theme_font || "instrument"
  const fontEntry = FONT_PREVIEW[fontKey] || FONT_PREVIEW.instrument
  useEffect(() => {
    ensureFontLoaded(fontEntry.href)
  }, [fontEntry.href])

  const globalRadius = tokens.theme_radius || "md"

  const resolveRadius = (val: string | undefined, globalVal: string) => {
    const rKey = !val || val === "default" ? globalVal : val
    const radiusBase: Record<string, string> = {
      "sharp-0": "0px",
      sm: "4px",
      md: "8px",
      lg: "12px",
      xl: "20px",
      full: "9999px",
    }
    return radiusBase[rKey] || radiusBase.md
  }

  const previewRadius = resolveRadius("default", globalRadius)
  const cardRadius = resolveRadius(tokens.theme_radius_card, globalRadius)
  const btnRadius = resolveRadius(tokens.theme_radius_btn, globalRadius)
  const searchRadius = resolveRadius(tokens.theme_radius_search, globalRadius)
  const inputRadius = resolveRadius(tokens.theme_radius_input, globalRadius)
  const sidebarRadius = resolveRadius(tokens.theme_radius_sidebar, globalRadius)
  const mobileFooterRadius = resolveRadius(tokens.theme_radius_mobile_footer, globalRadius)

  // Header tokens fall back to page tokens if unset (mirrors storefront)
  const headerBg = safe("theme_header_bg", safe("theme_bg", "#FFFFFF"))
  const headerFg = safe("theme_header_fg", safe("theme_text", "#111111"))
  const headerFgMuted = safe(
    "theme_header_fg_muted",
    safe("theme_text_muted", "#737373")
  )
  const headerHover = safe("theme_header_hover_bg", safe("theme_surface", "#F5F5F5"))
  const headerBorder = safe(
    "theme_header_border",
    safe("theme_border", "#E5E5E5")
  )
  const headerAccent = safe(
    "theme_header_accent",
    safe("theme_primary", "#111111")
  )
  const headerTopBorder = safe("theme_header_top_border", headerAccent)
  const accentBase = safe("theme_accent", "#D2EF9A")

  const cardBg = safe("theme_card_bg", safe("theme_surface", "#F5F5F5"))
  const cardBorder = safe("theme_card_border", safe("theme_border", "#E5E5E5"))
  const priceColor = safe("theme_price_color", safe("theme_primary", "#111111"))

  const footerBg = safe("theme_footer_bg", safe("theme_surface", "#F5F5F5"))
  const footerBorder = safe("theme_footer_border", safe("theme_border", "#E5E5E5"))
  const mobileFooterBorder = safe("theme_mobile_footer_border", footerBorder)
  const footerFg = safe("theme_footer_fg", safe("theme_text_muted", "#737373"))

  return (
    <div
      style={{
        background: safe("theme_bg", "#FFFFFF"),
        border: `1px solid ${safe("theme_border", "#E5E5E5")}`,
        borderRadius: previewRadius,
        padding: 0,
        color: safe("theme_text", "#111111"),
        overflow: "hidden",
        // Drives the font for everything inside this preview card so
        // the operator sees a 1:1 representation of the storefront
        // typography choice without leaving the admin.
        fontFamily: fontEntry.family,
      }}
    >
      {/* Header preview — shows exactly what the storefront top bar will
          look like with the current header_* tokens. */}
      <div>
        <div
          style={{
            height: 2,
            background: headerTopBorder,
          }}
        />
        <div
          style={{
            background: headerBg,
            borderBottom: `1px solid ${headerBorder}`,
            color: headerFg,
            padding: "12px 16px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
          }}
        >
          <span style={{ fontWeight: 700, fontSize: 15 }}>YourBrand</span>
          <div style={{ display: "flex", gap: 16, alignItems: "center", fontSize: 12 }}>
            <span style={{ color: headerFg, fontWeight: 500 }}>Home</span>
            <span style={{ color: headerFgMuted, fontWeight: 500 }}>Shop</span>
            <span style={{ color: headerFgMuted, fontWeight: 500 }}>Blog</span>
          </div>
          <div style={{ display: "flex", gap: 6 }}>
            {["⌕", "♡", "⌂"].map((icon, i) => (
              <span
                key={i}
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: 999,
                  background: i === 0 ? headerHover : "transparent",
                  color: i === 0 ? headerAccent : headerFg,
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 14,
                }}
                title={i === 0 ? "Hovered icon (uses Header hover surface + accent)" : "Icon (uses Header text colour)"}
              >
                {icon}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: 24 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 700,
            letterSpacing: 1,
            color: safe("theme_text_muted", "#737373"),
            marginBottom: 12,
          }}
        >
          LIVE PREVIEW
        </div>
        <h2 style={{ margin: "0 0 6px", fontSize: 26, fontWeight: 600 }}>
          Beautiful headings
        </h2>
        <p
          style={{
            margin: "0 0 16px",
            color: safe("theme_text_muted", "#737373"),
            fontSize: 14,
          }}
        >
          Body copy will inherit your text colour automatically.
        </p>
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
          <span
            style={{
              background: safe("theme_primary", "#111111"),
              color: safe("theme_primary_fg", "#FFFFFF"),
              padding: "10px 18px",
              borderRadius: btnRadius,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Primary button
          </span>
          <span
            style={{
              background: safe("theme_accent", "#D2EF9A"),
              color: safe("theme_accent_fg", "#1F1F1F"),
              padding: "10px 18px",
              borderRadius: btnRadius,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Accent button
          </span>
          <span
            style={{
              background: "transparent",
              color: safe("theme_text", "#111"),
              border: `1px solid ${safe("theme_border", "#E5E5E5")}`,
              padding: "10px 18px",
              borderRadius: btnRadius,
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Outline
          </span>
        </div>
        <div
          style={{
            background: cardBg,
            border: `1px solid ${cardBorder}`,
            padding: 14,
            borderRadius: cardRadius,
            fontSize: 13,
          }}
        >
          Surface card — used for product tiles, cart items, etc.
          <div style={{ marginTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Sample Product</span>
            <span style={{
              fontSize: 13,
              fontWeight: 700,
              color: priceColor,
            }}>$199.00</span>
          </div>
        </div>
        
        {/* Mock Search and Input */}
        <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap", alignItems: "center" }}>
          <div style={{
            display: "flex",
            alignItems: "center",
            background: safe("theme_surface", "#F5F5F5"),
            border: `1px solid ${safe("theme_border", "#E5E5E5")}`,
            borderRadius: searchRadius,
            padding: "8px 12px",
            fontSize: 12,
            flex: 1,
            minWidth: 140,
            color: safe("theme_text_muted", "#737373"),
          }}>
            <span style={{ marginRight: 6 }}>⌕</span> Search products...
          </div>
          <div style={{
            background: safe("theme_bg", "#FFFFFF"),
            border: `1px solid ${safe("theme_border", "#E5E5E5")}`,
            borderRadius: inputRadius,
            padding: "8px 10px",
            fontSize: 12,
            flex: 1,
            minWidth: 100,
            color: safe("theme_text", "#111111"),
          }}>
            Email address
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
          {[
            ["theme_success", "Success"],
            ["theme_warning", "Warning"],
            ["theme_danger", "Danger"],
            ["theme_info", "Info"],
          ].map(([k, l]) => (
            <span
              key={k}
              style={{
                background: safe(k, "#999"),
                color: "#fff",
                padding: "4px 10px",
                borderRadius: 999,
                fontSize: 11,
                fontWeight: 600,
              }}
            >
              {l}
            </span>
          ))}
        </div>
      </div>

      {/* Mock Footer */}
      <div
        style={{
          background: footerBg,
          borderTop: `1px solid ${mobileFooterBorder}`,
          padding: "12px 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 11,
          color: footerFg,
          marginTop: 16,
        }}
      >
        <span>© 2026 YourBrand</span>
        <div style={{ display: "flex", gap: 12 }}>
          <span>Privacy</span>
          <span>Terms</span>
        </div>
      </div>
    </div>
  )
}

const Page = () => {
  const [theme, setTheme] = useState<ThemeState>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchSettings()
      .then((s) => {
        const initial: ThemeState = {}
        for (const k of THEME_KEYS) {
          initial[k] = s[k] || ""
        }
        // First-time seed → load default preset
        if (!initial.theme_primary) {
          Object.assign(initial, presetToSettings(DEFAULT_PRESET))
        }
        setTheme(initial)
      })
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const set = (k: string, v: string) =>
    setTheme((prev) => ({ ...prev, [k]: v }))

  const applyPreset = (p: ThemePreset) => {
    setTheme((prev) => ({ ...prev, ...presetToSettings(p) }))
    toast.success(`Applied "${p.name}" — remember to Save`)
  }

  const onSave = async () => {
    setSaving(true)
    try {
      await saveSettings(theme)
      toast.success("Theme saved — refresh storefront to see changes")
    } catch (e) {
      toast.error("Save failed: " + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const grouped = useMemo(() => {
    const g: Record<string, typeof COLOR_FIELDS> = {}
    for (const f of COLOR_FIELDS) {
      g[f.group] = g[f.group] || []
      g[f.group].push(f)
    }
    return g
  }, [])

  if (loading) {
    return (
      <Container className="p-6">
        <p>Loading theme...</p>
      </Container>
    )
  }

  return (
    <Container className="p-6">
      <div
        style={adminStickyHeader}
      >
        <div>
          <Heading>Theme &amp; Appearance</Heading>
          <p style={adminDescription}>
            Pick a preset or fine-tune every colour. Changes apply across the
            entire storefront.
          </p>
        </div>
        <Button variant="primary" onClick={onSave} disabled={saving}>
          {saving ? "Saving..." : "Save Theme"}
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 20,
          alignItems: "start",
        }}
      >
        <div>
          <Section
            title="Choose a preset"
            description="Click any palette to load it. You can still tweak individual colours below."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {THEME_PRESETS.map((p) => (
                <PresetCard
                  key={p.id}
                  preset={p}
                  active={theme.theme_preset === p.id}
                  onApply={() => applyPreset(p)}
                />
              ))}
            </div>
          </Section>

          {groupOrder.map((g) => (
            <Section key={g} title={g + " colours"}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                  gap: 14,
                }}
              >
                {grouped[g]?.map((f) => (
                  <ColorField
                    key={f.key}
                    label={f.label}
                    value={theme[f.key] || "#000000"}
                    onChange={(v) => {
                      set(f.key, v)
                      // Clear preset binding once a colour is hand-edited
                      set("theme_preset", "")
                    }}
                    hint={f.hint}
                  />
                ))}
              </div>
            </Section>
          ))}

          <Section
            title="Layout &amp; typography"
            description="Affects buttons, cards, container width and base font across the storefront."
          >
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))",
                gap: 14,
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Border radius scale (Global)</Label>
                <select
                  value={theme.theme_radius || "md"}
                  onChange={(e) => set("theme_radius", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    border: A.border,
                    borderRadius: 6,
                    fontSize: 14,
                    background: A.bgField,
                    color: A.fg,
                  }}
                >
                  {RADIUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Container width</Label>
                <select
                  value={theme.theme_container || "default"}
                  onChange={(e) => set("theme_container", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    border: A.border,
                    borderRadius: 6,
                    fontSize: 14,
                    background: A.bgField,
                    color: A.fg,
                  }}
                >
                  {CONTAINER_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Font family</Label>
                <select
                  value={theme.theme_font || "instrument"}
                  onChange={(e) => set("theme_font", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    border: A.border,
                    borderRadius: 6,
                    fontSize: 14,
                    background: A.bgField,
                    color: A.fg,
                  }}
                >
                  {FONT_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Product Card border radius</Label>
                <select
                  value={theme.theme_radius_card || "default"}
                  onChange={(e) => set("theme_radius_card", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    border: A.border,
                    borderRadius: 6,
                    fontSize: 14,
                    background: A.bgField,
                    color: A.fg,
                  }}
                >
                  {INDIVIDUAL_RADIUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Button border radius</Label>
                <select
                  value={theme.theme_radius_btn || "default"}
                  onChange={(e) => set("theme_radius_btn", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    border: A.border,
                    borderRadius: 6,
                    fontSize: 14,
                    background: A.bgField,
                    color: A.fg,
                  }}
                >
                  {INDIVIDUAL_RADIUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Search Bar border radius</Label>
                <select
                  value={theme.theme_radius_search || "default"}
                  onChange={(e) => set("theme_radius_search", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    border: A.border,
                    borderRadius: 6,
                    fontSize: 14,
                    background: A.bgField,
                    color: A.fg,
                  }}
                >
                  {INDIVIDUAL_RADIUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Input border radius</Label>
                <select
                  value={theme.theme_radius_input || "default"}
                  onChange={(e) => set("theme_radius_input", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    border: A.border,
                    borderRadius: 6,
                    fontSize: 14,
                    background: A.bgField,
                    color: A.fg,
                  }}
                >
                  {INDIVIDUAL_RADIUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Brands Sidebar border radius</Label>
                <select
                  value={theme.theme_radius_sidebar || "default"}
                  onChange={(e) => set("theme_radius_sidebar", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    border: A.border,
                    borderRadius: 6,
                    fontSize: 14,
                    background: A.bgField,
                    color: A.fg,
                  }}
                >
                  {INDIVIDUAL_RADIUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <Label>Mobile Footer Bar border radius</Label>
                <select
                  value={theme.theme_radius_mobile_footer || "default"}
                  onChange={(e) => set("theme_radius_mobile_footer", e.target.value)}
                  style={{
                    padding: "8px 10px",
                    border: A.border,
                    borderRadius: 6,
                    fontSize: 14,
                    background: A.bgField,
                    color: A.fg,
                  }}
                >
                  {INDIVIDUAL_RADIUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </Section>
        </div>

        {/* Sticky preview panel */}
        <div style={{ position: "sticky", top: 80 }}>
          <LivePreview tokens={theme} />
          <div
            style={{
              marginTop: 12,
              padding: 12,
              border: "1px dashed #e5e7eb",
              borderRadius: 8,
              fontSize: 12,
              color: "#6b7280",
              lineHeight: 1.5,
            }}
          >
            <strong style={{ color: "#111" }}>Tip:</strong> The storefront
            caches settings for 60 seconds. After saving, hard-reload the
            storefront once to see new colours immediately.
          </div>
        </div>
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Theme & Appearance",
  icon: SwatchSolid,
})

export default Page
