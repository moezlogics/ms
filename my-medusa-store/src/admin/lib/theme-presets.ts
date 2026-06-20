/**
 * Theme presets — selectable from the admin Theme & Appearance page.
 * Each preset writes a complete set of theme_* keys via bulkUpsert.
 *
 * Color tokens follow a semantic scheme so the storefront can map them
 * onto CSS custom properties without knowing the brand:
 *   primary       — brand colour, hero CTAs, links, active states
 *   primary_fg    — text colour that sits on primary backgrounds
 *   accent        — secondary brand colour, hover states, highlights
 *   accent_fg     — text colour on accent backgrounds
 *   bg            — page background
 *   surface       — cards, panels, raised surfaces
 *   surface_alt   — striped rows, subtle fills
 *   text          — primary text colour
 *   text_muted    — captions, helper text
 *   border        — hairlines and dividers
 *   success / warning / danger / info — semantic statuses
 *   header_bg     — header background (dark themes go dark here)
 *   header_fg     — primary header text + icon colour (must contrast header_bg)
 *   header_fg_muted — secondary nav text in header
 *   header_hover_bg — hover surface for nav icon buttons
 *   header_border — bottom border under header
 *   header_accent — colour for the accent strip + hover underline
 */

export type ThemeTokens = {
  primary: string
  primary_fg: string
  accent: string
  accent_fg: string
  bg: string
  surface: string
  surface_alt: string
  text: string
  text_muted: string
  border: string
  success: string
  warning: string
  danger: string
  info: string
  /** Header colours — derived from primary/bg/text by default but overridable */
  header_bg: string
  header_fg: string
  header_fg_muted: string
  header_hover_bg: string
  header_border: string
  header_accent: string
  /** Default radius scale base ("sm" | "md" | "lg" | "xl") */
  radius: string
  /** Container width: "narrow" | "default" | "wide" | "full" */
  container: string
  /** Font family stack key: "inter" | "instrument" | "manrope" | "poppins" | "system" */
  font: string
  header_top_border?: string
  footer_bg?: string
  footer_fg?: string
  footer_border?: string
  card_bg?: string
  card_border?: string
  price_color?: string
  radius_card?: string
  radius_btn?: string
  radius_search?: string
  radius_input?: string
  radius_sidebar?: string
  radius_mobile_footer?: string
  mobile_footer_border?: string
}

export type ThemePreset = {
  id: string
  name: string
  description: string
  /** Used for the small color-chip preview in the picker */
  swatch: [string, string, string]
  tokens: ThemeTokens
}

/**
 * Helper for presets that want a "light header" (header same as page bg).
 * Saves repetition — most light themes share these defaults.
 */
function lightHeader(opts: {
  bg: string
  text: string
  text_muted: string
  border: string
  accent: string
  hoverBg?: string
}): Pick<ThemeTokens, "header_bg" | "header_fg" | "header_fg_muted" | "header_hover_bg" | "header_border" | "header_accent"> {
  return {
    header_bg: opts.bg,
    header_fg: opts.text,
    header_fg_muted: opts.text_muted,
    header_hover_bg: opts.hoverBg || opts.border,
    header_border: opts.border,
    header_accent: opts.accent,
  }
}

/**
 * Dark-header counterpart — text/icons go light so they stay visible
 * against a dark header background. All colours stay hex; pick a hover
 * shade that's a hair lighter than the bg so it reads as a button hover.
 */
function darkHeader(opts: {
  bg: string
  fg?: string
  fgMuted?: string
  hoverBg?: string
  border?: string
  accent: string
}): Pick<ThemeTokens, "header_bg" | "header_fg" | "header_fg_muted" | "header_hover_bg" | "header_border" | "header_accent"> {
  return {
    header_bg: opts.bg,
    header_fg: opts.fg || "#FFFFFF",
    header_fg_muted: opts.fgMuted || "#CBD5E1",
    header_hover_bg: opts.hoverBg || "#1F2937",
    header_border: opts.border || "#1F2937",
    header_accent: opts.accent,
  }
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "anvogue-classic",
    name: "Anvogue Classic",
    description: "Original black + lime green — minimal fashion editorial",
    swatch: ["#1F1F1F", "#D2EF9A", "#F7F7F7"],
    tokens: {
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
      ...lightHeader({
        bg: "#FFFFFF",
        text: "#1F1F1F",
        text_muted: "#696C70",
        border: "#E9E9E9",
        accent: "#1F1F1F",
        hoverBg: "#F7F7F7",
      }),
      radius: "md",
      container: "default",
      font: "instrument",
    },
  },
  {
    id: "pharma-trust",
    name: "Pharma Trust",
    description: "Medical blue + teal — clinical, trustworthy, calming",
    swatch: ["#0B6BCB", "#06B6D4", "#F0F9FF"],
    tokens: {
      primary: "#0B6BCB",
      primary_fg: "#FFFFFF",
      accent: "#06B6D4",
      accent_fg: "#FFFFFF",
      bg: "#FFFFFF",
      surface: "#F0F9FF",
      surface_alt: "#F8FAFC",
      text: "#0F172A",
      text_muted: "#64748B",
      border: "#E2E8F0",
      success: "#16A34A",
      warning: "#F59E0B",
      danger: "#DC2626",
      info: "#2563EB",
      ...lightHeader({
        bg: "#FFFFFF",
        text: "#0F172A",
        text_muted: "#64748B",
        border: "#E2E8F0",
        accent: "#0B6BCB",
        hoverBg: "#F0F9FF",
      }),
      radius: "lg",
      container: "default",
      font: "inter",
    },
  },
  {
    id: "wellness-sage",
    name: "Wellness Sage",
    description: "Sage green + cream — natural, organic, wellness-focused",
    swatch: ["#2D5F4E", "#A7C4A0", "#FAF7F2"],
    tokens: {
      primary: "#2D5F4E",
      primary_fg: "#FFFFFF",
      accent: "#A7C4A0",
      accent_fg: "#1A3A2E",
      bg: "#FFFFFF",
      surface: "#FAF7F2",
      surface_alt: "#F4F1EC",
      text: "#1A3A2E",
      text_muted: "#5C6B66",
      border: "#E5E0D6",
      success: "#16A34A",
      warning: "#D97706",
      danger: "#B91C1C",
      info: "#0891B2",
      ...lightHeader({
        bg: "#FAF7F2",
        text: "#1A3A2E",
        text_muted: "#5C6B66",
        border: "#E5E0D6",
        accent: "#2D5F4E",
        hoverBg: "#F4F1EC",
      }),
      radius: "lg",
      container: "default",
      font: "manrope",
    },
  },
  {
    id: "midnight-luxe",
    name: "Midnight Luxe",
    description: "Deep navy + gold — premium luxury, dark header",
    swatch: ["#0F172A", "#D4AF37", "#F8FAFC"],
    tokens: {
      primary: "#0F172A",
      primary_fg: "#FFFFFF",
      accent: "#D4AF37",
      accent_fg: "#0F172A",
      bg: "#FFFFFF",
      surface: "#F8FAFC",
      surface_alt: "#F1F5F9",
      text: "#0F172A",
      text_muted: "#64748B",
      border: "#E2E8F0",
      success: "#15803D",
      warning: "#CA8A04",
      danger: "#B91C1C",
      info: "#1D4ED8",
      ...darkHeader({
        bg: "#0F172A",
        fg: "#FFFFFF",
        fgMuted: "#CBD5E1",
        hoverBg: "#1E293B",
        border: "#3D2F0E",
        accent: "#D4AF37",
      }),
      radius: "md",
      container: "wide",
      font: "instrument",
    },
  },
  {
    id: "rose-modern",
    name: "Rose Modern",
    description: "Rose pink + charcoal — modern feminine commerce",
    swatch: ["#1F1F1F", "#EC4899", "#FDF2F8"],
    tokens: {
      primary: "#1F1F1F",
      primary_fg: "#FFFFFF",
      accent: "#EC4899",
      accent_fg: "#FFFFFF",
      bg: "#FFFFFF",
      surface: "#FDF2F8",
      surface_alt: "#FAF5F8",
      text: "#1F1F1F",
      text_muted: "#6B7280",
      border: "#F3E8EE",
      success: "#16A34A",
      warning: "#F59E0B",
      danger: "#E11D48",
      info: "#9333EA",
      ...lightHeader({
        bg: "#FFFFFF",
        text: "#1F1F1F",
        text_muted: "#6B7280",
        border: "#F3E8EE",
        accent: "#EC4899",
        hoverBg: "#FDF2F8",
      }),
      radius: "xl",
      container: "default",
      font: "poppins",
    },
  },
  {
    id: "ocean-mint",
    name: "Ocean Mint",
    description: "Deep teal + mint — fresh, modern, beauty/skincare",
    swatch: ["#0F766E", "#5EEAD4", "#F0FDFA"],
    tokens: {
      primary: "#0F766E",
      primary_fg: "#FFFFFF",
      accent: "#5EEAD4",
      accent_fg: "#0F3F3A",
      bg: "#FFFFFF",
      surface: "#F0FDFA",
      surface_alt: "#F5FBFA",
      text: "#0F3F3A",
      text_muted: "#5B7976",
      border: "#D1F5EE",
      success: "#15803D",
      warning: "#D97706",
      danger: "#B91C1C",
      info: "#0E7490",
      ...lightHeader({
        bg: "#FFFFFF",
        text: "#0F3F3A",
        text_muted: "#5B7976",
        border: "#D1F5EE",
        accent: "#0F766E",
        hoverBg: "#F0FDFA",
      }),
      radius: "lg",
      container: "default",
      font: "manrope",
    },
  },
  {
    id: "sunset-warm",
    name: "Sunset Warm",
    description: "Burnt orange + deep brown — warm, food/lifestyle",
    swatch: ["#7C2D12", "#FB923C", "#FFF7ED"],
    tokens: {
      primary: "#7C2D12",
      primary_fg: "#FFFFFF",
      accent: "#FB923C",
      accent_fg: "#431407",
      bg: "#FFFFFF",
      surface: "#FFF7ED",
      surface_alt: "#FFFAF3",
      text: "#431407",
      text_muted: "#78716C",
      border: "#FED7AA",
      success: "#15803D",
      warning: "#CA8A04",
      danger: "#B91C1C",
      info: "#1D4ED8",
      ...lightHeader({
        bg: "#FFF7ED",
        text: "#431407",
        text_muted: "#78716C",
        border: "#FED7AA",
        accent: "#7C2D12",
        hoverBg: "#FFE4C7",
      }),
      radius: "md",
      container: "default",
      font: "poppins",
    },
  },
  {
    id: "monochrome",
    name: "Pure Monochrome",
    description: "Black & white only — ultra-minimal, editorial",
    swatch: ["#000000", "#FFFFFF", "#F5F5F5"],
    tokens: {
      primary: "#000000",
      primary_fg: "#FFFFFF",
      accent: "#FFFFFF",
      accent_fg: "#000000",
      bg: "#FFFFFF",
      surface: "#F5F5F5",
      surface_alt: "#FAFAFA",
      text: "#000000",
      text_muted: "#737373",
      border: "#E5E5E5",
      success: "#16A34A",
      warning: "#F59E0B",
      danger: "#DC2626",
      info: "#2563EB",
      ...lightHeader({
        bg: "#FFFFFF",
        text: "#000000",
        text_muted: "#737373",
        border: "#E5E5E5",
        accent: "#000000",
        hoverBg: "#F5F5F5",
      }),
      radius: "sm",
      container: "default",
      font: "inter",
    },
  },

  /* ───────────── New creative presets ───────────── */

  {
    id: "dark-velvet",
    name: "Dark Velvet",
    description: "All-dark mode — black surfaces with violet pop. Reduces eye strain.",
    swatch: ["#0B0B10", "#A855F7", "#1A1A22"],
    tokens: {
      primary: "#A855F7",
      primary_fg: "#FFFFFF",
      accent: "#22D3EE",
      accent_fg: "#0B0B10",
      bg: "#0B0B10",
      surface: "#1A1A22",
      surface_alt: "#13131B",
      text: "#F4F4F5",
      text_muted: "#9CA3AF",
      border: "#27272F",
      success: "#22C55E",
      warning: "#F59E0B",
      danger: "#F87171",
      info: "#60A5FA",
      ...darkHeader({
        bg: "#0B0B10",
        fg: "#F4F4F5",
        fgMuted: "#9CA3AF",
        hoverBg: "#2A1B4A",
        border: "#27272F",
        accent: "#A855F7",
      }),
      radius: "lg",
      container: "default",
      font: "inter",
    },
  },
  {
    id: "neon-tokyo",
    name: "Neon Tokyo",
    description: "Cyberpunk dark — magenta + cyan on near-black. Bold tech storefronts.",
    swatch: ["#0D0221", "#FF2A6D", "#05D9E8"],
    tokens: {
      primary: "#FF2A6D",
      primary_fg: "#FFFFFF",
      accent: "#05D9E8",
      accent_fg: "#0D0221",
      bg: "#0D0221",
      surface: "#1A0B36",
      surface_alt: "#15082B",
      text: "#F5F0FF",
      text_muted: "#9D8DC8",
      border: "#2D1B4E",
      success: "#7CFFA0",
      warning: "#FFD23F",
      danger: "#FF4365",
      info: "#05D9E8",
      ...darkHeader({
        bg: "#0D0221",
        fg: "#F5F0FF",
        fgMuted: "#9D8DC8",
        hoverBg: "#2D0F4D",
        border: "#1B3F45",
        accent: "#05D9E8",
      }),
      radius: "sm",
      container: "wide",
      font: "inter",
    },
  },
  {
    id: "arctic-frost",
    name: "Arctic Frost",
    description: "Icy blue-grey + steel — cool, clean, technical product feel",
    swatch: ["#1E3A5F", "#7BB3D9", "#F0F4F8"],
    tokens: {
      primary: "#1E3A5F",
      primary_fg: "#FFFFFF",
      accent: "#7BB3D9",
      accent_fg: "#0F1F2E",
      bg: "#FFFFFF",
      surface: "#F0F4F8",
      surface_alt: "#F7F9FB",
      text: "#0F1F2E",
      text_muted: "#5A6E7F",
      border: "#D9E2EB",
      success: "#16A34A",
      warning: "#D97706",
      danger: "#DC2626",
      info: "#2563EB",
      ...lightHeader({
        bg: "#FFFFFF",
        text: "#0F1F2E",
        text_muted: "#5A6E7F",
        border: "#D9E2EB",
        accent: "#1E3A5F",
        hoverBg: "#F0F4F8",
      }),
      radius: "md",
      container: "default",
      font: "inter",
    },
  },
  {
    id: "coral-sunrise",
    name: "Coral Sunrise",
    description: "Coral + cream + soft peach — playful lifestyle, gen-Z friendly",
    swatch: ["#E94F37", "#FFB997", "#FFF8F1"],
    tokens: {
      primary: "#E94F37",
      primary_fg: "#FFFFFF",
      accent: "#FFB997",
      accent_fg: "#5A1F0F",
      bg: "#FFFFFF",
      surface: "#FFF8F1",
      surface_alt: "#FFFBF5",
      text: "#2B1A14",
      text_muted: "#896A5C",
      border: "#FBE6D7",
      success: "#16A34A",
      warning: "#F59E0B",
      danger: "#B91C1C",
      info: "#0EA5E9",
      ...lightHeader({
        bg: "#FFFFFF",
        text: "#2B1A14",
        text_muted: "#896A5C",
        border: "#FBE6D7",
        accent: "#E94F37",
        hoverBg: "#FFF1E5",
      }),
      radius: "xl",
      container: "default",
      font: "poppins",
    },
  },
  {
    id: "forest-slate",
    name: "Forest Slate",
    description: "Deep forest green + slate — outdoor, sustainable, premium",
    swatch: ["#1B4332", "#52796F", "#F4F1ED"],
    tokens: {
      primary: "#1B4332",
      primary_fg: "#FFFFFF",
      accent: "#52796F",
      accent_fg: "#FFFFFF",
      bg: "#FFFFFF",
      surface: "#F4F1ED",
      surface_alt: "#FAF8F5",
      text: "#1B2A24",
      text_muted: "#6B7B73",
      border: "#DDD8D0",
      success: "#16A34A",
      warning: "#CA8A04",
      danger: "#B91C1C",
      info: "#0E7490",
      ...darkHeader({
        bg: "#1B4332",
        fg: "#FFFFFF",
        fgMuted: "#C8D6CC",
        hoverBg: "#2A5C46",
        border: "#2A5C46",
        accent: "#A7C4A0",
      }),
      radius: "lg",
      container: "default",
      font: "manrope",
    },
  },
  {
    id: "lavender-dream",
    name: "Lavender Dream",
    description: "Soft lavender + lilac — beauty, jewellery, dreamy boutique",
    swatch: ["#7C3AED", "#C4B5FD", "#F5F3FF"],
    tokens: {
      primary: "#7C3AED",
      primary_fg: "#FFFFFF",
      accent: "#C4B5FD",
      accent_fg: "#3C1F7A",
      bg: "#FFFFFF",
      surface: "#F5F3FF",
      surface_alt: "#FAFAFE",
      text: "#1E1B3A",
      text_muted: "#6B6486",
      border: "#E9E5F8",
      success: "#16A34A",
      warning: "#F59E0B",
      danger: "#E11D48",
      info: "#7C3AED",
      ...lightHeader({
        bg: "#FFFFFF",
        text: "#1E1B3A",
        text_muted: "#6B6486",
        border: "#E9E5F8",
        accent: "#7C3AED",
        hoverBg: "#F5F3FF",
      }),
      radius: "xl",
      container: "default",
      font: "poppins",
    },
  },
  {
    id: "crimson-noir",
    name: "Crimson Noir",
    description: "Deep crimson + black — bold, theatrical, fashion-forward",
    swatch: ["#0A0A0A", "#DC143C", "#1C1C1C"],
    tokens: {
      primary: "#DC143C",
      primary_fg: "#FFFFFF",
      accent: "#F4C430",
      accent_fg: "#0A0A0A",
      bg: "#FFFFFF",
      surface: "#FAFAFA",
      surface_alt: "#F5F5F5",
      text: "#0A0A0A",
      text_muted: "#525252",
      border: "#E5E5E5",
      success: "#16A34A",
      warning: "#F59E0B",
      danger: "#DC143C",
      info: "#1D4ED8",
      ...darkHeader({
        bg: "#0A0A0A",
        fg: "#FFFFFF",
        fgMuted: "#A3A3A3",
        hoverBg: "#2A0710",
        border: "#3D0A18",
        accent: "#DC143C",
      }),
      radius: "sm",
      container: "default",
      font: "instrument",
    },
  },
  {
    id: "mocha-cream",
    name: "Mocha Cream",
    description: "Warm coffee + cream — café, bakery, cozy lifestyle brand",
    swatch: ["#6F4E37", "#D7BFA0", "#FAF6F0"],
    tokens: {
      primary: "#6F4E37",
      primary_fg: "#FFFFFF",
      accent: "#D7BFA0",
      accent_fg: "#3D2817",
      bg: "#FFFFFF",
      surface: "#FAF6F0",
      surface_alt: "#FCFAF6",
      text: "#3D2817",
      text_muted: "#8C7261",
      border: "#EBE0CF",
      success: "#16A34A",
      warning: "#CA8A04",
      danger: "#B91C1C",
      info: "#0E7490",
      ...lightHeader({
        bg: "#FAF6F0",
        text: "#3D2817",
        text_muted: "#8C7261",
        border: "#EBE0CF",
        accent: "#6F4E37",
        hoverBg: "#F2EADC",
      }),
      radius: "lg",
      container: "default",
      font: "manrope",
    },
  },
  {
    id: "electric-dream",
    name: "Electric Dream",
    description: "Vivid yellow + black — high energy, snack/sneaker culture",
    swatch: ["#000000", "#FFEC00", "#FAFAFA"],
    tokens: {
      primary: "#000000",
      primary_fg: "#FFEC00",
      accent: "#FFEC00",
      accent_fg: "#000000",
      bg: "#FFFFFF",
      surface: "#FAFAFA",
      surface_alt: "#F5F5F5",
      text: "#000000",
      text_muted: "#525252",
      border: "#E5E5E5",
      success: "#22C55E",
      warning: "#F59E0B",
      danger: "#EF4444",
      info: "#3B82F6",
      ...darkHeader({
        bg: "#000000",
        fg: "#FFEC00",
        fgMuted: "#A3A3A3",
        hoverBg: "#2D2A00",
        border: "#403B00",
        accent: "#FFEC00",
      }),
      radius: "sm",
      container: "wide",
      font: "inter",
    },
  },
  {
    id: "terracotta-earth",
    name: "Terracotta Earth",
    description: "Terracotta + sand + olive — handcraft, ceramics, slow lifestyle",
    swatch: ["#9C4A1A", "#E8B98F", "#FBF5EE"],
    tokens: {
      primary: "#9C4A1A",
      primary_fg: "#FFFFFF",
      accent: "#E8B98F",
      accent_fg: "#52250A",
      bg: "#FFFFFF",
      surface: "#FBF5EE",
      surface_alt: "#FDF8F2",
      text: "#3F1E0B",
      text_muted: "#8B6A52",
      border: "#EFD9C2",
      success: "#16A34A",
      warning: "#D97706",
      danger: "#B91C1C",
      info: "#0E7490",
      ...lightHeader({
        bg: "#FBF5EE",
        text: "#3F1E0B",
        text_muted: "#8B6A52",
        border: "#EFD9C2",
        accent: "#9C4A1A",
        hoverBg: "#F4E5D2",
      }),
      radius: "lg",
      container: "default",
      font: "manrope",
    },
  },
  {
    id: "royal-plum",
    name: "Royal Plum",
    description: "Plum + gold accents on cream — perfumery, premium gifting",
    swatch: ["#581C87", "#EAB308", "#FAF5FF"],
    tokens: {
      primary: "#581C87",
      primary_fg: "#FFFFFF",
      accent: "#EAB308",
      accent_fg: "#3B1359",
      bg: "#FFFFFF",
      surface: "#FAF5FF",
      surface_alt: "#FCFAFF",
      text: "#1E0A2E",
      text_muted: "#6B5780",
      border: "#EAE0F5",
      success: "#15803D",
      warning: "#CA8A04",
      danger: "#B91C1C",
      info: "#7C3AED",
      ...darkHeader({
        bg: "#581C87",
        fg: "#FFFFFF",
        fgMuted: "#D8C7E8",
        hoverBg: "#6B259D",
        border: "#3D2F0E",
        accent: "#EAB308",
      }),
      radius: "lg",
      container: "default",
      font: "instrument",
    },
  },
  {
    id: "vintage-paper",
    name: "Vintage Paper",
    description: "Sepia + ink — bookstore, vinyl, heritage brand feel",
    swatch: ["#3A2E27", "#C19A6B", "#F4ECDB"],
    tokens: {
      primary: "#3A2E27",
      primary_fg: "#F4ECDB",
      accent: "#C19A6B",
      accent_fg: "#2A1F18",
      bg: "#F4ECDB",
      surface: "#FBF6E9",
      surface_alt: "#F8EFD9",
      text: "#2A1F18",
      text_muted: "#6F5B4A",
      border: "#DDCDAB",
      success: "#3DAB25",
      warning: "#CA8A04",
      danger: "#B91C1C",
      info: "#0E7490",
      ...lightHeader({
        bg: "#F4ECDB",
        text: "#2A1F18",
        text_muted: "#6F5B4A",
        border: "#DDCDAB",
        accent: "#3A2E27",
        hoverBg: "#EAE0C2",
      }),
      radius: "sm",
      container: "narrow",
      font: "instrument",
    },
  },
  {
    id: "ocean-deep",
    name: "Ocean Deep",
    description: "Deep blue dark mode + cyan accents — tech, gaming, SaaS",
    swatch: ["#0A192F", "#64FFDA", "#172A45"],
    tokens: {
      primary: "#64FFDA",
      primary_fg: "#0A192F",
      accent: "#FFB454",
      accent_fg: "#0A192F",
      bg: "#0A192F",
      surface: "#172A45",
      surface_alt: "#10213C",
      text: "#E6F1FF",
      text_muted: "#8892B0",
      border: "#233554",
      success: "#22C55E",
      warning: "#FFD23F",
      danger: "#FF4365",
      info: "#64FFDA",
      ...darkHeader({
        bg: "#0A192F",
        fg: "#E6F1FF",
        fgMuted: "#8892B0",
        hoverBg: "#172A45",
        border: "#233554",
        accent: "#64FFDA",
      }),
      radius: "md",
      container: "wide",
      font: "inter",
    },
  },
  {
    id: "blush-noir",
    name: "Blush Noir",
    description: "Soft blush + jet — boutique with a dark header",
    swatch: ["#111111", "#F5C2C7", "#FFF5F5"],
    tokens: {
      primary: "#111111",
      primary_fg: "#FFFFFF",
      accent: "#F5C2C7",
      accent_fg: "#5A1B1B",
      bg: "#FFFFFF",
      surface: "#FFF5F5",
      surface_alt: "#FFFAFA",
      text: "#111111",
      text_muted: "#737373",
      border: "#F4DEDF",
      success: "#16A34A",
      warning: "#F59E0B",
      danger: "#E11D48",
      info: "#9333EA",
      ...darkHeader({
        bg: "#111111",
        fg: "#FFFFFF",
        fgMuted: "#D4D4D4",
        hoverBg: "#3D2A2C",
        border: "#3D2A2C",
        accent: "#F5C2C7",
      }),
      radius: "xl",
      container: "default",
      font: "instrument",
    },
  },
]

/** Keys persisted to site-settings KV store (prefixed with theme_) */
export const THEME_KEYS = [
  "theme_preset",
  "theme_primary",
  "theme_primary_fg",
  "theme_accent",
  "theme_accent_fg",
  "theme_bg",
  "theme_surface",
  "theme_surface_alt",
  "theme_text",
  "theme_text_muted",
  "theme_border",
  "theme_success",
  "theme_warning",
  "theme_danger",
  "theme_info",
  "theme_header_bg",
  "theme_header_fg",
  "theme_header_fg_muted",
  "theme_header_hover_bg",
  "theme_header_border",
  "theme_header_accent",
  "theme_browser_bar",
  "theme_radius",
  "theme_container",
  "theme_font",
  "theme_header_top_border",
  "theme_footer_bg",
  "theme_footer_fg",
  "theme_footer_border",
  "theme_card_bg",
  "theme_card_border",
  "theme_price_color",
  "theme_radius_card",
  "theme_radius_btn",
  "theme_radius_search",
  "theme_radius_input",
  "theme_radius_sidebar",
  "theme_radius_mobile_footer",
  "theme_mobile_footer_border",
] as const

export type ThemeKey = (typeof THEME_KEYS)[number]

export const RADIUS_OPTIONS = [
  { value: "sharp-0", label: "Sharp (0px)" },
  { value: "sm", label: "Sharp (2px / 4px)" },
  { value: "md", label: "Soft (8px) — recommended" },
  { value: "lg", label: "Rounded (12px)" },
  { value: "xl", label: "Pillowy (20px)" },
]

export const CONTAINER_OPTIONS = [
  { value: "narrow", label: "Narrow (1200px)" },
  { value: "default", label: "Default (1322px)" },
  { value: "wide", label: "Wide (1440px)" },
  { value: "full", label: "Full width (with edge padding)" },
]

/**
 * Curated typeface catalogue surfaced in the admin Theme & Appearance
 * font dropdown. Grouped (category prefix in the label) so operators
 * can pick a face that fits the storefront's vertical:
 *
 *   • Default / system   — Instrument Sans (default), system stack
 *   • Modern sans        — neutral, professional, generic
 *   • Friendly / rounded — grocery, food, kids, lifestyle
 *   • Professional       — pharmacy, medical, B2B, electronics
 *   • Editorial / luxury — fashion, beauty, jewellery, premium
 *
 * Each `value` MUST match a key in `FONT_STACKS` and `GOOGLE_FONT_HREFS`
 * inside `my-medusa-store-storefront/src/lib/util/theme.ts`. Keep the
 * three lists in sync when adding a font.
 */
export const FONT_OPTIONS = [
  // Default / system
  { value: "instrument", label: "Instrument Sans (default)" },
  { value: "system", label: "System default \u2014 fastest load" },

  // Modern sans
  { value: "inter", label: "Modern \u2022 Inter \u2014 neutral, professional" },
  { value: "dm-sans", label: "Modern \u2022 DM Sans \u2014 clean, minimal" },
  { value: "plus-jakarta", label: "Modern \u2022 Plus Jakarta Sans \u2014 contemporary" },
  { value: "outfit", label: "Modern \u2022 Outfit \u2014 geometric, crisp" },
  { value: "sora", label: "Modern \u2022 Sora \u2014 tech-forward" },

  // Friendly / rounded
  { value: "manrope", label: "Friendly \u2022 Manrope \u2014 warm, geometric" },
  { value: "poppins", label: "Friendly \u2022 Poppins \u2014 rounded, approachable" },
  { value: "nunito", label: "Friendly \u2022 Nunito \u2014 soft, inviting" },
  { value: "quicksand", label: "Friendly \u2022 Quicksand \u2014 playful, light" },

  // Professional / technical
  { value: "ibm-plex", label: "Pro \u2022 IBM Plex Sans \u2014 trusted, technical" },
  { value: "roboto", label: "Pro \u2022 Roboto \u2014 universal, neutral" },
  { value: "work-sans", label: "Pro \u2022 Work Sans \u2014 utilitarian" },

  // Editorial / luxury
  { value: "playfair", label: "Luxury \u2022 Playfair Display \u2014 high-fashion serif" },
  { value: "cormorant", label: "Luxury \u2022 Cormorant Garamond \u2014 refined serif" },
  { value: "lora", label: "Luxury \u2022 Lora \u2014 readable, editorial serif" },
]

/** Convert preset to settings dict */
export function presetToSettings(
  preset: ThemePreset
): Record<string, string> {
  return {
    theme_preset: preset.id,
    theme_primary: preset.tokens.primary,
    theme_primary_fg: preset.tokens.primary_fg,
    theme_accent: preset.tokens.accent,
    theme_accent_fg: preset.tokens.accent_fg,
    theme_bg: preset.tokens.bg,
    theme_surface: preset.tokens.surface,
    theme_surface_alt: preset.tokens.surface_alt,
    theme_text: preset.tokens.text,
    theme_text_muted: preset.tokens.text_muted,
    theme_border: preset.tokens.border,
    theme_success: preset.tokens.success,
    theme_warning: preset.tokens.warning,
    theme_danger: preset.tokens.danger,
    theme_info: preset.tokens.info,
    theme_header_bg: preset.tokens.header_bg,
    theme_header_fg: preset.tokens.header_fg,
    theme_header_fg_muted: preset.tokens.header_fg_muted,
    theme_header_hover_bg: preset.tokens.header_hover_bg,
    theme_header_border: preset.tokens.header_border,
    theme_header_accent: preset.tokens.header_accent,
    theme_radius: preset.tokens.radius,
    theme_container: preset.tokens.container,
    theme_font: preset.tokens.font,
    theme_header_top_border: preset.tokens.header_top_border || "",
    theme_footer_bg: preset.tokens.footer_bg || "",
    theme_footer_fg: preset.tokens.footer_fg || "",
    theme_footer_border: preset.tokens.footer_border || "",
    theme_card_bg: preset.tokens.card_bg || "",
    theme_card_border: preset.tokens.card_border || "",
    theme_price_color: preset.tokens.price_color || "",
    theme_radius_card: preset.tokens.radius_card || "default",
    theme_radius_btn: preset.tokens.radius_btn || "default",
    theme_radius_search: preset.tokens.radius_search || "default",
    theme_radius_input: preset.tokens.radius_input || "default",
    theme_radius_sidebar: preset.tokens.radius_sidebar || "default",
    theme_radius_mobile_footer: preset.tokens.radius_mobile_footer || "default",
    theme_mobile_footer_border: preset.tokens.mobile_footer_border || "",
  }
}

/** Default theme = Anvogue Classic */
export const DEFAULT_PRESET = THEME_PRESETS[0]
