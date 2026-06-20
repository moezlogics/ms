/**
 * Spec value formatter.
 *
 * Admins enter raw values into `product.metadata.specs` (e.g. 5000,
 * "8GB", "6.7"). To render a clean, consistent spec sheet the
 * storefront converts these into nicely-formatted strings — adding
 * units, thousands separators, and casing where appropriate.
 *
 * The formatter is purely heuristic and idempotent: passing an
 * already-formatted value through it leaves the value unchanged.
 *
 * Add a new key to `UNIT_MAP` whenever a new electronics-specific
 * field starts appearing across the catalogue.
 */

/**
 * Map of metadata keys → unit + numeric formatting hints.
 *
 *  - `unit`           appended to the value with a non-breaking space.
 *  - `numeric: true`  forces numeric parsing & thousands separators.
 *  - `decimals`       fixed decimal places (default: integer).
 */
type UnitHint = {
  unit?: string
  numeric?: boolean
  decimals?: number
  /** Lower-case key fragments that match this hint. */
  match?: string[]
}

const UNIT_MAP: Record<string, UnitHint> = {
  // Battery
  battery_mah: { unit: "mAh", numeric: true },
  battery: { unit: "mAh", numeric: true, match: ["battery_capacity"] },
  charging_speed_w: { unit: "W", numeric: true },
  wattage: { unit: "W", numeric: true },
  power_consumption: { unit: "W", numeric: true },
  watts: { unit: "W", numeric: true },

  // Display
  refresh_rate: { unit: "Hz", numeric: true },
  brightness_nits: { unit: "nits", numeric: true },
  ppi: { unit: "ppi", numeric: true },
  screen_size: { unit: '"', numeric: true, decimals: 1 },
  display_size: { unit: '"', numeric: true, decimals: 1 },

  // Memory / Storage
  ram: { unit: "GB", numeric: true },
  ram_gb: { unit: "GB", numeric: true },
  storage: { unit: "GB", numeric: true },
  storage_gb: { unit: "GB", numeric: true },
  internal_storage: { unit: "GB", numeric: true },

  // Physical
  weight_g: { unit: "g", numeric: true },
  weight: { unit: "g", numeric: true },

  // Capacity (appliances)
  capacity_l: { unit: "L", numeric: true },
  capacity: { unit: "L", numeric: true, match: ["fridge_capacity"] },
  load_kg: { unit: "kg", numeric: true },
  tonnage: { unit: "Ton", numeric: true, decimals: 1 },
  cooling_capacity: { unit: "BTU", numeric: true },

  // Warranty
  warranty_months: { unit: "months", numeric: true },
}

const FALLBACK_KEYS: { hint: UnitHint; suffixes: string[] }[] = [
  { hint: { unit: "mAh", numeric: true }, suffixes: ["_mah"] },
  { hint: { unit: "W", numeric: true }, suffixes: ["_w", "_watts"] },
  { hint: { unit: "GB", numeric: true }, suffixes: ["_gb"] },
  { hint: { unit: "TB", numeric: true }, suffixes: ["_tb"] },
  { hint: { unit: "MB", numeric: true }, suffixes: ["_mb"] },
  { hint: { unit: "Hz", numeric: true }, suffixes: ["_hz"] },
  { hint: { unit: "kg", numeric: true }, suffixes: ["_kg"] },
  { hint: { unit: "g", numeric: true }, suffixes: ["_g"] },
  { hint: { unit: "L", numeric: true }, suffixes: ["_l", "_litre", "_liter"] },
  { hint: { unit: "MP", numeric: true }, suffixes: ["_mp"] },
  { hint: { unit: "ms", numeric: true }, suffixes: ["_ms"] },
  { hint: { unit: "%", numeric: true }, suffixes: ["_percent", "_pct"] },
]

function findHint(key: string): UnitHint | null {
  const k = key.toLowerCase()
  if (UNIT_MAP[k]) return UNIT_MAP[k]
  for (const fb of FALLBACK_KEYS) {
    if (fb.suffixes.some((s) => k.endsWith(s))) return fb.hint
  }
  return null
}

/**
 * Convert a snake_case / kebab-case metadata key into a display
 * label. `battery_mah` → "Battery", `screen_to_body_ratio` → "Screen
 * to Body Ratio". Unit suffixes (`_mah`, `_gb`, `_w`) are stripped
 * because the unit is rendered alongside the value separately.
 */
export function formatSpecLabel(key: string): string {
  const stripped = key
    .replace(/_(mah|gb|tb|mb|w|hz|kg|g|l|mp|ms|percent|pct|months)$/i, "")
    .replace(/[_-]+/g, " ")
    .trim()
  return stripped
    .split(" ")
    .filter(Boolean)
    .map((w) => (w.length <= 3 ? w.toUpperCase() : w[0].toUpperCase() + w.slice(1)))
    .join(" ")
}

/**
 * Format a spec value with unit awareness.
 *
 * - Numbers gain thousands separators and (when configured) a unit
 *   suffix: `5000` + `battery_mah` → `5,000 mAh`.
 * - Strings already containing a unit pass through unchanged so
 *   admins can override the heuristic by typing the unit themselves
 *   (e.g. "5000mAh", "Quad-band 5G").
 * - Booleans render as ✓ / ✗ for terse spec rows.
 * - Arrays render as comma-joined strings.
 * - `null` / `undefined` / empty string return `null` so the caller
 *   can choose to skip the row entirely.
 */
export function formatSpecValue(key: string, raw: any): string | null {
  if (raw === null || raw === undefined) return null
  if (typeof raw === "boolean") return raw ? "Yes" : "No"
  if (Array.isArray(raw)) {
    const parts = raw.map((v) => formatSpecValue(key, v)).filter(Boolean)
    return parts.length ? parts.join(", ") : null
  }
  if (typeof raw === "object") {
    // Bail on unexpected nested objects — the admin should flatten
    // the data. Returning `null` causes the row to be skipped.
    return null
  }

  const str = String(raw).trim()
  if (!str) return null

  if (key === "release_date") {
    const parts = str.split("-")
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10)
      const month = parseInt(parts[1], 10) - 1
      const day = parseInt(parts[2], 10)
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        const dateValue = new Date(year, month, day)
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        if (dateValue > today) {
          return `${str} (Upcoming)`
        }
      }
    }
  }

  const hint = findHint(key)
  if (!hint) return str

  // Detect "already-formatted": if the value already contains the
  // expected unit (case-insensitive), don't re-append it.
  if (hint.unit && str.toLowerCase().includes(hint.unit.toLowerCase())) {
    return str
  }

  if (hint.numeric) {
    const num = Number(str.replace(/[, ]/g, ""))
    if (!Number.isFinite(num)) return str
    const formatted = num.toLocaleString("en-US", {
      minimumFractionDigits: hint.decimals ?? 0,
      maximumFractionDigits: hint.decimals ?? 0,
    })
    return hint.unit ? `${formatted} ${hint.unit}` : formatted
  }

  return hint.unit ? `${str} ${hint.unit}` : str
}
