import { formatSpecLabel, formatSpecValue } from "./format-spec"

/**
 * Group classifier for electronics specs.
 *
 * Each group has a list of EXACT keys and a list of fragment matches
 * (substring → group). When a spec key is encountered we check exact
 * matches first, then fragment matches. Anything that doesn't match
 * goes into the catch-all "General" group at the bottom.
 *
 * Adding a new key:
 *   - Prefer EXACT for short, unambiguous keys (`ram`, `gpu`).
 *   - Use FRAGMENT for families of keys (`camera_*` → Camera).
 *
 * Group order in the array below is the rendering order on the
 * spec sheet — designers can re-prioritise sections by reordering.
 */

export type SpecRow = { key: string; label: string; value: string }
export type SpecGroup = { name: string; icon: string; rows: SpecRow[] }

const GROUP_DEFS: { name: string; icon: string; exact: string[]; fragments: string[] }[] = [
  {
    name: "Overview & Status",
    icon: "ph-info",
    exact: [
      "release_date",
      "pta_approved",
      "sim_type",
      "5g_support",
      "sim",
      "network",
      "5g",
      "4g",
      "lte",
    ],
    fragments: ["release_date", "pta_approved", "sim_type", "5g_support"],
  },
  {
    name: "Memory & Storage",
    icon: "ph-database",
    exact: [
      "memory",
      "ram",
      "ram_gb",
      "ram_type",
      "storage",
      "storage_gb",
      "internal_storage",
      "expandable_storage",
      "rom",
      "ssd",
      "hdd",
    ],
    fragments: ["ram", "storage", "memory"],
  },
  {
    name: "Processor & Performance",
    icon: "ph-cpu",
    exact: [
      "chipset",
      "cpu",
      "gpu",
      "processor",
      "soc",
      "cores",
      "process",
      "architecture",
    ],
    fragments: ["processor", "chipset", "cpu", "gpu"],
  },
  {
    name: "Display Specifications",
    icon: "ph-monitor",
    exact: [
      "display_size",
      "screen_size",
      "display_technology",
      "panel_type",
      "display_resolution",
      "resolution",
      "display_protection",
      "screen_protection",
      "refresh_rate",
      "display",
    ],
    fragments: ["display", "screen", "refresh", "resolution", "panel"],
  },
  {
    name: "Camera Details",
    icon: "ph-camera",
    exact: [
      "camera_main",
      "main_camera_video",
      "camera_front",
      "new_field",
      "selfie_camera_video",
      "camera_features",
      "rear_camera",
      "front_camera",
      "main_camera",
      "selfie_camera",
      "ultrawide",
      "telephoto",
      "macro",
      "ois",
      "eis",
    ],
    fragments: ["camera", "lens", "aperture"],
  },
  {
    name: "Battery & Power",
    icon: "ph-battery-full",
    exact: [
      "battery_capacity",
      "charging_speed",
      "charging_speed_w",
      "wireless_charging",
      "battery",
      "battery_mah",
      "battery_life_hours",
      "fast_charging",
      "reverse_charging",
    ],
    fragments: ["battery", "charging"],
  },
  {
    name: "Build & Software",
    icon: "ph-ruler",
    exact: [
      "os",
      "operating_system",
      "ui",
      "skin",
      "dimensions",
      "weight",
      "weight_g",
      "sensors",
      "colors",
      "color",
      "colour",
      "build_material",
      "ip_rating",
      "water_resistance",
      "form_factor",
    ],
    fragments: ["dimension", "weight", "material", "os_", "sensors"],
  },
  {
    name: "Connectivity",
    icon: "ph-wifi-high",
    exact: [
      "wifi",
      "bluetooth",
      "nfc",
      "usb",
      "usb_type",
      "headphone_jack",
      "ports",
      "infrared",
      "gps",
    ],
    fragments: ["wifi", "bluetooth", "usb", "connectivity"],
  },
  {
    name: "Audio",
    icon: "ph-speaker-high",
    exact: ["speakers", "stereo_speakers", "audio_codec", "dolby", "audio"],
    fragments: ["speaker", "audio", "sound"],
  },
  {
    name: "Power",
    icon: "ph-lightning",
    exact: [
      "wattage",
      "watts",
      "voltage",
      "power_consumption",
      "power_rating",
      "energy_rating",
      "star_rating",
    ],
    fragments: ["watt", "voltage", "power"],
  },
  {
    name: "Capacity",
    icon: "ph-stack",
    exact: [
      "capacity",
      "capacity_l",
      "litres",
      "tonnes",
      "tons",
      "tonnage",
      "load_kg",
      "rated_capacity",
    ],
    fragments: ["capacity", "tonnage", "load"],
  },
  {
    name: "Cooling",
    icon: "ph-fan",
    exact: ["cooling_capacity", "cooling_type", "compressor", "refrigerant"],
    fragments: ["cooling", "compressor"],
  },
  {
    name: "Warranty & Support",
    icon: "ph-shield-check",
    exact: ["warranty", "warranty_months", "warranty_type"],
    fragments: ["warranty"],
  },
  {
    name: "General",
    icon: "ph-info",
    exact: [],
    fragments: [],
  },
]

function classify(key: string): string {
  const k = key.toLowerCase()
  for (const g of GROUP_DEFS) {
    if (g.exact.includes(k)) return g.name
  }
  for (const g of GROUP_DEFS) {
    if (g.fragments.some((f) => k.includes(f))) return g.name
  }
  return "General"
}

/**
 * Internal metadata keys that look like specs but shouldn't appear
 * in the spec sheet. Mirrors the blacklist used by the old
 * `ProductTabs` accordion so the two never disagree.
 */
const HIDDEN = new Set([
  "specs",
  "in_the_box",
  "trust_badges",
  "preorder_open",
  "launch_date",
  "preorder_message",
  "accessory_ids",
  "videos",
  "rich_description",
  "rich_description_en",
  "rich_description_ur",
  "meta_title",
  "meta_description",
  "content",
  "image",
  "image_alt",
])

/**
 * Convert a free-form `metadata.specs` object into ordered, grouped
 * spec rows ready for rendering. Empty values are dropped.
 *
 * Returns an empty array when there's nothing to display, so the
 * caller can `if (!groups.length) return null` and skip the section.
 */
export function buildSpecGroups(specs: any): SpecGroup[] {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return []

  // Bucket rows by group.
  const bucket: Record<string, SpecRow[]> = {}
  for (const [key, raw] of Object.entries(specs)) {
    if (HIDDEN.has(key.toLowerCase())) continue
    if (key.startsWith("_")) continue
    const value = formatSpecValue(key, raw)
    if (!value) continue
    const group = classify(key)
    if (!bucket[group]) bucket[group] = []
    bucket[group].push({ key, label: formatSpecLabel(key), value })
  }

  // Emit in canonical group order, dropping empty groups.
  const out: SpecGroup[] = []
  for (const g of GROUP_DEFS) {
    const rows = bucket[g.name]
    if (rows && rows.length) {
      // Sort rows inside the group to match the order of g.exact keys if they are in exact
      const sortedRows = [...rows].sort((a, b) => {
        const idxA = g.exact.indexOf(a.key.toLowerCase())
        const idxB = g.exact.indexOf(b.key.toLowerCase())
        const valA = idxA === -1 ? 999 : idxA
        const valB = idxB === -1 ? 999 : idxB
        return valA - valB
      })
      out.push({ name: g.name, icon: g.icon, rows: sortedRows })
    }
  }
  return out
}

/**
 * Build a FLAT list of comparable spec rows for the /compare page,
 * keyed by canonical spec key so two products can be diffed
 * row-by-row even when their key order differs.
 */
export function buildSpecMap(specs: any): Record<string, SpecRow> {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return {}
  const out: Record<string, SpecRow> = {}
  for (const [key, raw] of Object.entries(specs)) {
    if (HIDDEN.has(key.toLowerCase())) continue
    if (key.startsWith("_")) continue
    const value = formatSpecValue(key, raw)
    if (!value) continue
    out[key.toLowerCase()] = { key, label: formatSpecLabel(key), value }
  }
  return out
}
