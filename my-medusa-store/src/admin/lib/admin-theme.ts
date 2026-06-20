/**
 * Admin Dark-Mode Tokens
 *
 * Medusa Admin uses CSS variables from @medusajs/ui that adapt to
 * light/dark mode automatically. These token references ensure our
 * custom admin pages respect the admin's active theme.
 *
 * Usage:  style={{ background: A.bg, color: A.fg, border: A.border }}
 */
export const A = {
  /* ─── Backgrounds ─── */
  bg:        "var(--bg-base, #1C1C1C)",
  bgSubtle:  "var(--bg-subtle, #161616)",
  bgCard:    "var(--bg-component, #232323)",
  bgField:   "var(--bg-field, #2A2A2A)",
  bgHover:   "var(--bg-base-hover, #2A2A2A)",

  /* ─── Foreground / Text ─── */
  fg:        "var(--fg-base, #E0E0E0)",
  fgSubtle:  "var(--fg-subtle, #A1A1A1)",
  fgMuted:   "var(--fg-muted, #6B6B6B)",

  /* ─── Borders ─── */
  borderVal: "var(--border-base, #333333)",
  border:    "1px solid var(--border-base, #333333)",

  /* ─── Status ─── */
  success:   "#22c55e",
  warning:   "#eab308",
  danger:    "#ef4444",
  info:      "#3b82f6",

  /* ─── Interactive ─── */
  interactive: "var(--fg-interactive, #818cf8)",
}

/**
 * Common inline styles reused across admin sections.
 */
export const adminSection = {
  border: A.border,
  borderRadius: 8,
  padding: 20,
  marginBottom: 20,
  background: A.bgCard,
} as const

export const adminStickyHeader = {
  display: "flex" as const,
  alignItems: "center" as const,
  justifyContent: "space-between" as const,
  marginBottom: 20,
  position: "sticky" as const,
  top: 0,
  background: A.bgSubtle,
  zIndex: 10,
  padding: "12px 0",
}

export const adminSectionTitle = {
  fontSize: 16,
  fontWeight: 600,
  margin: 0,
  color: A.fg,
}

export const adminDescription = {
  fontSize: 13,
  color: A.fgSubtle,
  margin: "4px 0 0",
}

export const adminHelpText = {
  fontSize: 11,
  color: A.fgMuted,
  marginTop: 4,
}
