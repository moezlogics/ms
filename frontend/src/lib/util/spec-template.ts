/**
 * Per-category spec template — the schema admin defines in the
 * Medusa admin UI for a product category, and which the storefront
 * uses to render structured Specifications and Compare tables.
 *
 * Stored on `category.metadata.spec_template` as a plain JSON object
 * so no DB migration is required and the value travels naturally with
 * Medusa's category APIs (Store + Admin).
 *
 * Inheritance: child categories inherit the nearest ancestor's
 * template, so a "Smartphones > Apple iPhones" sub-category usually
 * leaves its template empty and rides on the parent's.
 *
 * Back-compat: legacy products with no template still render via the
 * heuristic `buildSpecGroups` classifier in `./spec-groups.ts`.
 */

export type SpecFieldType = "text" | "number" | "select" | "boolean" | "date"

export type SpecTemplateField = {
  /** Canonical metadata key — written to `product.metadata.specs[key]`. */
  key: string
  /** Display label shown in admin form, on PDP spec sheet, and Compare. */
  label: string
  /** Optional unit suffix shown next to the value (e.g. "GB", "Hz", "mAh"). */
  unit?: string
  /** Form input type (admin widget renders accordingly). */
  type?: SpecFieldType
  /** Allowed values for `type: "select"`. */
  options?: string[]
  /** Placeholder text in the admin form. */
  placeholder?: string
  /**
   * When true, the value is mirrored to `product.metadata.key_specs`
   * and surfaces on product cards / chat bubbles as a headline bullet.
   */
  highlight?: boolean
  /**
   * When true, this field is rendered as a filter in the storefront sidebar.
   */
  is_filter?: boolean
}

export type SpecTemplateGroup = {
  /** Group heading, e.g. "Display", "Memory & Storage". */
  name: string
  /** Optional Phosphor icon name (with `ph-` prefix), e.g. "ph-monitor". */
  icon?: string
  fields: SpecTemplateField[]
}

export type SpecTemplate = {
  groups: SpecTemplateGroup[]
}

/** Runtime guard for untrusted JSON arriving from category metadata. */
export function isSpecTemplate(x: any): x is SpecTemplate {
  return (
    !!x &&
    typeof x === "object" &&
    Array.isArray(x.groups) &&
    x.groups.every(
      (g: any) =>
        g &&
        typeof g.name === "string" &&
        Array.isArray(g.fields) &&
        g.fields.every(
          (f: any) =>
            f && typeof f.key === "string" && typeof f.label === "string"
        )
    )
  )
}

/** Flatten a template to the ordered list of canonical keys. */
export function templateFieldKeys(t: SpecTemplate): string[] {
  return t.groups.flatMap((g) => g.fields.map((f) => f.key))
}

/** Subset of fields that should appear as headline / product-card bullets. */
export function highlightedFields(t: SpecTemplate): SpecTemplateField[] {
  return t.groups.flatMap((g) => g.fields.filter((f) => !!f.highlight))
}

/**
 * Walk a category's `parent_category` chain (deepest → root) and
 * return the first valid `spec_template` found on any ancestor.
 *
 * Categories should be fetched with parent_category populated to a
 * reasonable depth (5 is what the storefront uses elsewhere).
 *
 * Returns `null` when no template is found anywhere in the chain.
 */
export function resolveTemplateFromCategory(
  category: any | null | undefined
): SpecTemplate | null {
  let cur: any = category
  let safety = 10
  while (cur && safety-- > 0) {
    const meta = (cur.metadata || {}) as Record<string, any>
    const candidate = meta.spec_template
    if (isSpecTemplate(candidate)) return candidate
    cur = cur.parent_category
  }
  return null
}

/**
 * Format a stored value for display, adding the unit suffix from the
 * template field when it's not already present in the value.
 */
export function formatTemplatedValue(
  raw: unknown,
  field: SpecTemplateField
): string {
  if (raw === null || typeof raw === "undefined") return ""
  if (typeof raw === "boolean") return raw ? "Yes" : "No"
  let s = String(raw).trim()
  if (!s) return ""
  if (field.unit) {
    const unit = field.unit.trim()
    // Append unit only when not already present at the tail (case-insensitive).
    if (unit && !s.toLowerCase().endsWith(unit.toLowerCase())) {
      s = `${s} ${unit}`
    }
  }
  return s
}

/* ────────────────────────────────────────────────────────────────
 * Pre-built presets — admin can apply with one click then edit.
 * Keep keys snake_case + lowercase so they match the canonical
 * group classifier in `./spec-groups.ts` for legacy products that
 * never had a template applied.
 * ──────────────────────────────────────────────────────────────── */

export const SPEC_TEMPLATE_PRESETS: Record<
  string,
  { label: string; description: string; template: SpecTemplate }
> = {
  "mobile-phone": {
    label: "Mobile Phone",
    description: "Smartphones — display, chipset, RAM, storage, camera, battery.",
    template: {
      groups: [
        {
          name: "Overview & Status",
          icon: "ph-device-mobile",
          fields: [
            { key: "release_date", label: "Release Date", type: "text", highlight: true, placeholder: "e.g. October 2026" },
            { key: "pta_approved", label: "PTA Approved", type: "boolean", highlight: true, is_filter: true },
            { key: "sim_type", label: "Sim Type", type: "select", options: ["Nano-SIM + eSIM"], placeholder: "e.g. Nano-SIM + eSIM" },
            { key: "5g_support", label: "5G Support", type: "boolean", is_filter: true },
          ],
        },
        {
          name: "Memory & Storage",
          icon: "ph-database",
          fields: [
            { key: "memory", label: "RAM", type: "select", options: ["2GB RAM", "4GB RAM", "6GB RAM", "8GB RAM", "12GB RAM", "16GB RAM"], highlight: true, placeholder: "12GB RAM" },
            { key: "storage", label: "Storage", type: "select", options: ["32GB", "64GB", "128GB", "256GB", "512GB", "1TB", "2TB"], placeholder: "e.g. 256GB" },
            { key: "expandable_storage", label: "Card Slot", type: "text", placeholder: "No" },
          ],
        },
        {
          name: "Processor & Performance",
          icon: "ph-cpu",
          fields: [
            { key: "chipset", label: "Chipset", type: "select", options: ["Mediatek Dimensity 8500 Ultra", "Google Tensor G5 (3 nm)", "Qualcomm SM8850-1-AD Snapdragon 8 Elite Gen 5 (3 nm)"], highlight: true, placeholder: "Mediatek Dimensity 8500 Ultra" },
            { key: "cpu", label: "Processor (CPU)", type: "text", placeholder: "Octa-core (1 x 3.4 GHz + 3 x 3.2 GHz + 4 x 2.2 GHz)" },
            { key: "gpu", label: "GPU", type: "text", placeholder: "Mali-G720 MC8" },
          ],
        },
        {
          name: "Display Specifications",
          icon: "ph-monitor",
          fields: [
            { key: "display_size", label: "Display Size", type: "text", highlight: true, placeholder: "6.59 Inches" },
            { key: "display_technology", label: "Panel Technology", type: "text", placeholder: "AMOLED, 68B Colors" },
            { key: "display_resolution", label: "Resolution", type: "text", placeholder: "1268 x 2756 Pixels (~460 PPI)" },
            { key: "display_protection", label: "Screen Protection", type: "text", placeholder: "Corning Gorilla Glass 7i" },
            { key: "refresh_rate", label: "Refresh Rate", type: "select", options: ["120Hz", "90Hz", "60Hz", "144Hz"], placeholder: "e.g. 120Hz" },
          ],
        },
        {
          name: "Camera Details",
          icon: "ph-camera",
          fields: [
            { key: "camera_main", label: "Main Camera", type: "text", highlight: true, placeholder: "Triple 50 MP + 50 MP + 12 MP" },
            { key: "main_camera_video", label: "Main Camera Video", type: "text", placeholder: "e.g. 4K@60fps" },
            { key: "camera_front", label: "Selfie Camera", type: "text", placeholder: "32 MP" },
            { key: "new_field", label: "Selfie Camera Video", type: "text", placeholder: "e.g. 1080p@30fps" },
            { key: "camera_features", label: "Camera Features", type: "text", placeholder: "Leica Lens, Ultra HDR, OIS" },
          ],
        },
        {
          name: "Battery & Power",
          icon: "ph-battery-full",
          fields: [
            { key: "battery_capacity", label: "Battery Capacity", type: "select", options: ["6500 mAh", "5000 mAh", "4970 mAh"], highlight: true, placeholder: "6500 mAh" },
            { key: "charging_speed", label: "Charging Speed", type: "text", placeholder: "67W Fast Charging" },
            { key: "wireless_charging", label: "Wireless Charging", type: "boolean" },
          ],
        },
        {
          name: "Build & Software",
          icon: "ph-ruler",
          fields: [
            { key: "os", label: "Operating System", type: "text", placeholder: "Android 16 (HyperOS 3)" },
            { key: "ui", label: "UI (User Interface)", type: "text", placeholder: "e.g. HyperOS" },
            { key: "dimensions", label: "Dimensions", type: "text", placeholder: "157.6 x 75.2 x 8.2 mm" },
            { key: "weight", label: "Weight", type: "text", placeholder: "200 g" },
            { key: "sensors", label: "Sensors", type: "text", placeholder: "Fingerprint (under display), Gyro, Proximity" },
            { key: "colors", label: "Colors", type: "select", options: ["White", "Grey", "Opal White", "Black", "Violet"], placeholder: "Violet, Blue, Opal White, Black" },
          ],
        },
      ],
    },
  },

  laptop: {
    label: "Laptop",
    description: "Notebooks & ultrabooks — CPU, RAM, SSD, GPU, display.",
    template: {
      groups: [
        {
          name: "Performance",
          icon: "ph-cpu",
          fields: [
            { key: "cpu", label: "Processor", type: "text", highlight: true, placeholder: "Intel Core i7-13700H" },
            { key: "cores", label: "Cores / Threads", type: "text", placeholder: "14 / 20" },
            { key: "gpu", label: "Graphics", type: "text", highlight: true, placeholder: "NVIDIA RTX 4060 8GB" },
          ],
        },
        {
          name: "Memory & Storage",
          icon: "ph-database",
          fields: [
            { key: "ram", label: "RAM", unit: "GB", type: "number", highlight: true },
            { key: "ram_type", label: "RAM Type", type: "select", options: ["DDR4", "DDR5", "LPDDR4X", "LPDDR5", "LPDDR5X"] },
            { key: "ssd", label: "SSD", unit: "GB", type: "number", highlight: true },
            { key: "storage_type", label: "Storage Type", type: "select", options: ["NVMe SSD", "SATA SSD", "HDD", "SSD + HDD"] },
          ],
        },
        {
          name: "Display",
          icon: "ph-monitor",
          fields: [
            { key: "display_size", label: "Display Size", unit: "inch", type: "number", highlight: true },
            { key: "resolution", label: "Resolution", type: "select", options: ["HD", "FHD", "2K", "2.5K", "3K", "4K"] },
            { key: "refresh_rate", label: "Refresh Rate", unit: "Hz", type: "number" },
            { key: "panel_type", label: "Panel Type", type: "select", options: ["IPS", "OLED", "Mini-LED", "TN"] },
            { key: "touchscreen", label: "Touchscreen", type: "boolean" },
          ],
        },
        {
          name: "Battery",
          icon: "ph-battery-full",
          fields: [
            { key: "battery_life_hours", label: "Battery Life", unit: "hours", type: "number" },
            { key: "battery", label: "Battery Capacity", unit: "Wh", type: "number" },
            { key: "charging_speed_w", label: "Charger", unit: "W", type: "number" },
          ],
        },
        {
          name: "Connectivity & Ports",
          icon: "ph-wifi-high",
          fields: [
            { key: "wifi", label: "Wi-Fi", type: "text", placeholder: "Wi-Fi 6E" },
            { key: "bluetooth", label: "Bluetooth", type: "text" },
            { key: "ports", label: "Ports", type: "text", placeholder: "2× USB-C, 2× USB-A, HDMI 2.1" },
            { key: "thunderbolt", label: "Thunderbolt", type: "boolean" },
          ],
        },
        {
          name: "Operating System",
          icon: "ph-circles-three",
          fields: [
            { key: "os", label: "OS", type: "text", placeholder: "Windows 11 Home" },
          ],
        },
        {
          name: "Design",
          icon: "ph-ruler",
          fields: [
            { key: "weight_g", label: "Weight", unit: "g", type: "number" },
            { key: "build_material", label: "Build Material", type: "text" },
          ],
        },
      ],
    },
  },

  tv: {
    label: "Television",
    description: "Smart TVs — panel, size, resolution, smart OS, audio.",
    template: {
      groups: [
        {
          name: "Display",
          icon: "ph-monitor",
          fields: [
            { key: "display_size", label: "Screen Size", unit: "inch", type: "number", highlight: true },
            { key: "panel_type", label: "Panel Type", type: "select", options: ["LED", "QLED", "OLED", "Mini-LED", "Micro-LED", "Neo QLED"], highlight: true },
            { key: "resolution", label: "Resolution", type: "select", options: ["HD", "FHD", "4K", "8K"], highlight: true },
            { key: "refresh_rate", label: "Refresh Rate", unit: "Hz", type: "number" },
            { key: "hdr", label: "HDR Support", type: "text", placeholder: "Dolby Vision, HDR10+" },
            { key: "brightness_nits", label: "Peak Brightness", unit: "nits", type: "number" },
          ],
        },
        {
          name: "Smart OS",
          icon: "ph-circles-three",
          fields: [
            { key: "os", label: "Smart OS", type: "select", options: ["Google TV", "Android TV", "Tizen", "webOS", "Roku TV", "Fire TV", "VIDAA", "Other"], highlight: true },
            { key: "voice_assistant", label: "Voice Assistant", type: "text", placeholder: "Google Assistant, Alexa" },
          ],
        },
        {
          name: "Audio",
          icon: "ph-speaker-high",
          fields: [
            { key: "audio_output_w", label: "Audio Output", unit: "W", type: "number" },
            { key: "dolby", label: "Dolby Audio", type: "text", placeholder: "Dolby Atmos" },
          ],
        },
        {
          name: "Connectivity",
          icon: "ph-wifi-high",
          fields: [
            { key: "hdmi_ports", label: "HDMI Ports", type: "number" },
            { key: "usb_ports", label: "USB Ports", type: "number" },
            { key: "wifi", label: "Wi-Fi", type: "text" },
            { key: "bluetooth", label: "Bluetooth", type: "text" },
          ],
        },
        {
          name: "Power",
          icon: "ph-lightning",
          fields: [
            { key: "power_consumption", label: "Power Consumption", unit: "W", type: "number" },
            { key: "voltage", label: "Voltage", unit: "V", type: "text" },
          ],
        },
      ],
    },
  },

  smartwatch: {
    label: "Smartwatch",
    description: "Wearables — display, sensors, battery, connectivity.",
    template: {
      groups: [
        {
          name: "Display",
          icon: "ph-monitor",
          fields: [
            { key: "display_size", label: "Display Size", unit: "inch", type: "number", highlight: true },
            { key: "panel_type", label: "Panel Type", type: "select", options: ["AMOLED", "OLED", "LCD", "Retina", "Always-On AMOLED"] },
            { key: "resolution", label: "Resolution", type: "text" },
          ],
        },
        {
          name: "Health & Sensors",
          icon: "ph-cell-signal-high",
          fields: [
            { key: "heart_rate", label: "Heart Rate", type: "boolean", highlight: true },
            { key: "spo2", label: "SpO2", type: "boolean" },
            { key: "ecg", label: "ECG", type: "boolean" },
            { key: "gps", label: "GPS", type: "boolean", highlight: true },
            { key: "sleep_tracking", label: "Sleep Tracking", type: "boolean" },
          ],
        },
        {
          name: "Battery",
          icon: "ph-battery-full",
          fields: [
            { key: "battery_life_hours", label: "Battery Life", unit: "hours", type: "number", highlight: true },
            { key: "battery", label: "Battery", unit: "mAh", type: "number" },
          ],
        },
        {
          name: "Connectivity",
          icon: "ph-wifi-high",
          fields: [
            { key: "bluetooth", label: "Bluetooth", type: "text" },
            { key: "wifi", label: "Wi-Fi", type: "boolean" },
            { key: "cellular", label: "Cellular", type: "boolean" },
          ],
        },
        {
          name: "Design & Build",
          icon: "ph-ruler",
          fields: [
            { key: "weight_g", label: "Weight", unit: "g", type: "number" },
            { key: "ip_rating", label: "Water Resistance", type: "text", placeholder: "5 ATM / IP68" },
            { key: "case_material", label: "Case Material", type: "text" },
          ],
        },
      ],
    },
  },

  headphones: {
    label: "Headphones / Earbuds",
    description: "Wireless audio — drivers, ANC, battery, codecs.",
    template: {
      groups: [
        {
          name: "Audio",
          icon: "ph-speaker-high",
          fields: [
            { key: "driver_size", label: "Driver Size", unit: "mm", type: "number" },
            { key: "anc", label: "Active Noise Cancellation", type: "boolean", highlight: true },
            { key: "transparency_mode", label: "Transparency Mode", type: "boolean" },
            { key: "audio_codec", label: "Audio Codecs", type: "text", placeholder: "AAC, LDAC, aptX HD" },
          ],
        },
        {
          name: "Battery",
          icon: "ph-battery-full",
          fields: [
            { key: "battery_life_hours", label: "Battery Life", unit: "hours", type: "number", highlight: true },
            { key: "battery_with_case_hours", label: "With Case", unit: "hours", type: "number" },
            { key: "fast_charging", label: "Fast Charging", type: "boolean" },
            { key: "wireless_charging", label: "Wireless Charging", type: "boolean" },
          ],
        },
        {
          name: "Connectivity",
          icon: "ph-wifi-high",
          fields: [
            { key: "bluetooth", label: "Bluetooth", type: "text", placeholder: "5.3" },
            { key: "multipoint", label: "Multipoint Pairing", type: "boolean" },
            { key: "usb_type", label: "Charging Port", type: "select", options: ["USB-C", "Lightning", "Micro USB"] },
          ],
        },
        {
          name: "Design",
          icon: "ph-ruler",
          fields: [
            { key: "form_factor", label: "Form Factor", type: "select", options: ["In-ear", "On-ear", "Over-ear", "Open-ear"], highlight: true },
            { key: "weight_g", label: "Weight", unit: "g", type: "number" },
            { key: "ip_rating", label: "Water/Sweat Resistance", type: "text", placeholder: "IPX4" },
          ],
        },
      ],
    },
  },

  speaker: {
    label: "Speaker",
    description: "Bluetooth & smart speakers — power, battery, codecs.",
    template: {
      groups: [
        {
          name: "Audio",
          icon: "ph-speaker-high",
          fields: [
            { key: "audio_output_w", label: "Output Power", unit: "W", type: "number", highlight: true },
            { key: "audio_codec", label: "Audio Codecs", type: "text" },
            { key: "stereo_pair", label: "Stereo Pairing", type: "boolean" },
          ],
        },
        {
          name: "Battery",
          icon: "ph-battery-full",
          fields: [
            { key: "battery_life_hours", label: "Battery Life", unit: "hours", type: "number", highlight: true },
            { key: "battery", label: "Battery Capacity", unit: "mAh", type: "number" },
          ],
        },
        {
          name: "Connectivity",
          icon: "ph-wifi-high",
          fields: [
            { key: "bluetooth", label: "Bluetooth", type: "text" },
            { key: "wifi", label: "Wi-Fi", type: "boolean" },
            { key: "aux_in", label: "AUX In", type: "boolean" },
          ],
        },
        {
          name: "Design",
          icon: "ph-ruler",
          fields: [
            { key: "ip_rating", label: "Water Resistance", type: "text", placeholder: "IP67" },
            { key: "weight_g", label: "Weight", unit: "g", type: "number" },
          ],
        },
      ],
    },
  },

  ac: {
    label: "Air Conditioner",
    description: "Split / window AC — tonnage, energy rating, modes.",
    template: {
      groups: [
        {
          name: "Capacity & Cooling",
          icon: "ph-fan",
          fields: [
            { key: "tonnage", label: "Tonnage", unit: "ton", type: "number", highlight: true },
            { key: "cooling_capacity", label: "Cooling Capacity", unit: "BTU/hr", type: "number" },
            { key: "cooling_type", label: "Type", type: "select", options: ["Split", "Window", "Cassette", "Floor Standing", "Portable"], highlight: true },
            { key: "compressor", label: "Compressor", type: "select", options: ["Inverter", "Non-Inverter", "Dual Inverter"], highlight: true },
            { key: "refrigerant", label: "Refrigerant", type: "text", placeholder: "R32 / R410A" },
          ],
        },
        {
          name: "Energy",
          icon: "ph-lightning",
          fields: [
            { key: "energy_rating", label: "Energy Rating", type: "text", placeholder: "5 Star" },
            { key: "power_consumption", label: "Power Consumption", unit: "W", type: "number" },
            { key: "voltage", label: "Voltage", type: "text", placeholder: "220-240 V" },
          ],
        },
        {
          name: "Features",
          icon: "ph-circles-three",
          fields: [
            { key: "wifi", label: "Wi-Fi Control", type: "boolean" },
            { key: "voice_assistant", label: "Voice Control", type: "boolean" },
            { key: "modes", label: "Operating Modes", type: "text", placeholder: "Cool, Heat, Dry, Auto" },
            { key: "anti_bacterial", label: "Anti-Bacterial Filter", type: "boolean" },
          ],
        },
      ],
    },
  },

  refrigerator: {
    label: "Refrigerator",
    description: "Single / double door / French door — capacity, energy, features.",
    template: {
      groups: [
        {
          name: "Capacity",
          icon: "ph-stack",
          fields: [
            { key: "capacity_l", label: "Total Capacity", unit: "L", type: "number", highlight: true },
            { key: "freezer_capacity_l", label: "Freezer Capacity", unit: "L", type: "number" },
            { key: "form_factor", label: "Type", type: "select", options: ["Single Door", "Double Door", "Side-by-Side", "French Door", "Mini Fridge"], highlight: true },
            { key: "doors", label: "Doors", type: "number" },
          ],
        },
        {
          name: "Energy",
          icon: "ph-lightning",
          fields: [
            { key: "energy_rating", label: "Energy Rating", type: "text" },
            { key: "compressor", label: "Compressor", type: "select", options: ["Inverter", "Linear Inverter", "Conventional", "Smart Inverter"], highlight: true },
            { key: "refrigerant", label: "Refrigerant", type: "text" },
          ],
        },
        {
          name: "Features",
          icon: "ph-circles-three",
          fields: [
            { key: "frost_free", label: "Frost Free", type: "boolean" },
            { key: "water_dispenser", label: "Water Dispenser", type: "boolean" },
            { key: "ice_maker", label: "Ice Maker", type: "boolean" },
            { key: "wifi", label: "Wi-Fi / Smart", type: "boolean" },
          ],
        },
        {
          name: "Design",
          icon: "ph-ruler",
          fields: [
            { key: "dimensions", label: "Dimensions", type: "text", placeholder: "H × W × D in cm" },
            { key: "color", label: "Color", type: "text" },
          ],
        },
      ],
    },
  },

  "washing-machine": {
    label: "Washing Machine",
    description: "Front / top load — capacity, RPM, energy.",
    template: {
      groups: [
        {
          name: "Capacity",
          icon: "ph-stack",
          fields: [
            { key: "load_kg", label: "Capacity", unit: "kg", type: "number", highlight: true },
            { key: "form_factor", label: "Type", type: "select", options: ["Front Load", "Top Load", "Semi-Automatic", "Twin Tub"], highlight: true },
            { key: "max_spin_rpm", label: "Max Spin Speed", unit: "RPM", type: "number" },
          ],
        },
        {
          name: "Energy",
          icon: "ph-lightning",
          fields: [
            { key: "energy_rating", label: "Energy Rating", type: "text" },
            { key: "power_consumption", label: "Power Consumption", unit: "W", type: "number" },
          ],
        },
        {
          name: "Features",
          icon: "ph-circles-three",
          fields: [
            { key: "wash_programs", label: "Wash Programs", type: "number" },
            { key: "inverter", label: "Inverter Motor", type: "boolean" },
            { key: "wifi", label: "Wi-Fi / Smart", type: "boolean" },
            { key: "steam_wash", label: "Steam Wash", type: "boolean" },
            { key: "child_lock", label: "Child Lock", type: "boolean" },
          ],
        },
      ],
    },
  },

  camera: {
    label: "Camera",
    description: "DSLR / mirrorless / action — sensor, video, ISO.",
    template: {
      groups: [
        {
          name: "Sensor",
          icon: "ph-camera",
          fields: [
            { key: "sensor_type", label: "Sensor Type", type: "select", options: ["Full Frame", "APS-C", "Micro Four Thirds", "1-inch", "Other"], highlight: true },
            { key: "resolution_mp", label: "Resolution", unit: "MP", type: "number", highlight: true },
            { key: "iso_range", label: "ISO Range", type: "text", placeholder: "100-51200" },
          ],
        },
        {
          name: "Video",
          icon: "ph-video-camera",
          fields: [
            { key: "video_recording", label: "Max Video", type: "text", placeholder: "4K @ 60fps", highlight: true },
            { key: "slow_motion", label: "Slow Motion", type: "text" },
            { key: "log_recording", label: "Log Recording", type: "boolean" },
          ],
        },
        {
          name: "Autofocus & Stabilization",
          icon: "ph-target",
          fields: [
            { key: "af_points", label: "AF Points", type: "number" },
            { key: "ibis", label: "In-Body Stabilization (IBIS)", type: "boolean" },
            { key: "burst_fps", label: "Continuous Shooting", unit: "fps", type: "number" },
          ],
        },
        {
          name: "Connectivity",
          icon: "ph-wifi-high",
          fields: [
            { key: "wifi", label: "Wi-Fi", type: "boolean" },
            { key: "bluetooth", label: "Bluetooth", type: "boolean" },
            { key: "memory_card_slots", label: "Memory Card Slots", type: "number" },
          ],
        },
        {
          name: "Design",
          icon: "ph-ruler",
          fields: [
            { key: "weight_g", label: "Weight", unit: "g", type: "number" },
            { key: "ip_rating", label: "Weather Sealing", type: "text" },
          ],
        },
      ],
    },
  },

  "gaming-console": {
    label: "Gaming Console",
    description: "Consoles & handhelds — CPU, GPU, storage, output.",
    template: {
      groups: [
        {
          name: "Performance",
          icon: "ph-cpu",
          fields: [
            { key: "cpu", label: "CPU", type: "text" },
            { key: "gpu", label: "GPU", type: "text", highlight: true },
            { key: "ram", label: "RAM", unit: "GB", type: "number" },
            { key: "storage", label: "Storage", unit: "GB", type: "number", highlight: true },
            { key: "storage_type", label: "Storage Type", type: "text", placeholder: "Custom NVMe SSD" },
          ],
        },
        {
          name: "Output",
          icon: "ph-monitor",
          fields: [
            { key: "max_resolution", label: "Max Resolution", type: "select", options: ["1080p", "1440p", "4K", "8K"], highlight: true },
            { key: "max_fps", label: "Max Frame Rate", unit: "fps", type: "number" },
            { key: "hdr", label: "HDR", type: "boolean" },
            { key: "ray_tracing", label: "Ray Tracing", type: "boolean" },
          ],
        },
        {
          name: "Connectivity",
          icon: "ph-wifi-high",
          fields: [
            { key: "wifi", label: "Wi-Fi", type: "text" },
            { key: "bluetooth", label: "Bluetooth", type: "text" },
            { key: "ethernet", label: "Ethernet", type: "text", placeholder: "Gigabit" },
            { key: "ports", label: "Ports", type: "text" },
          ],
        },
        {
          name: "Design",
          icon: "ph-ruler",
          fields: [
            { key: "weight_g", label: "Weight", unit: "g", type: "number" },
            { key: "dimensions", label: "Dimensions", type: "text" },
          ],
        },
      ],
    },
  },

  tablet: {
    label: "Tablet",
    description: "iPad / Android / Windows tablets.",
    template: {
      groups: [
        {
          name: "Display",
          icon: "ph-monitor",
          fields: [
            { key: "display_size", label: "Display Size", unit: "inch", type: "number", highlight: true },
            { key: "resolution", label: "Resolution", type: "text" },
            { key: "panel_type", label: "Panel Type", type: "select", options: ["LCD", "IPS", "OLED", "Mini-LED", "Liquid Retina"] },
            { key: "refresh_rate", label: "Refresh Rate", unit: "Hz", type: "number" },
          ],
        },
        {
          name: "Performance",
          icon: "ph-cpu",
          fields: [
            { key: "chipset", label: "Chipset", type: "text", highlight: true },
            { key: "ram", label: "RAM", unit: "GB", type: "number", highlight: true },
            { key: "storage", label: "Storage", unit: "GB", type: "number", highlight: true },
          ],
        },
        {
          name: "Battery",
          icon: "ph-battery-full",
          fields: [
            { key: "battery", label: "Battery", unit: "mAh", type: "number" },
            { key: "battery_life_hours", label: "Battery Life", unit: "hours", type: "number" },
          ],
        },
        {
          name: "Connectivity",
          icon: "ph-wifi-high",
          fields: [
            { key: "wifi", label: "Wi-Fi", type: "text" },
            { key: "cellular", label: "Cellular", type: "boolean" },
            { key: "usb_type", label: "USB Port", type: "select", options: ["USB-C", "Lightning", "Micro USB"] },
            { key: "stylus_support", label: "Stylus Support", type: "boolean" },
          ],
        },
        {
          name: "Design",
          icon: "ph-ruler",
          fields: [
            { key: "weight_g", label: "Weight", unit: "g", type: "number" },
            { key: "ip_rating", label: "Water Resistance", type: "text" },
          ],
        },
      ],
    },
  },
}

/** List shape for admin "Apply Preset" dropdown. */
export const SPEC_TEMPLATE_PRESET_LIST = Object.entries(SPEC_TEMPLATE_PRESETS).map(
  ([id, p]) => ({ id, label: p.label, description: p.description })
)

/* ────────────────────────────────────────────────────────────────
 * Render helpers — convert a (specs, template) pair into the same
 * `SpecGroup[]` shape used by `./spec-groups.ts` so the existing
 * SpecSheet UI can render either pathway with no branching.
 * ──────────────────────────────────────────────────────────────── */

/** A single rendered row — matches `SpecRow` from `./spec-groups`. */
export type RenderedSpecRow = { key: string; label: string; value: string }
/** A rendered group — matches `SpecGroup` from `./spec-groups`. */
export type RenderedSpecGroup = {
  name: string
  icon: string
  rows: RenderedSpecRow[]
}

const FALLBACK_GROUP_ICON = "ph-info"

/**
 * Build grouped, ready-to-render rows from `product.metadata.specs`
 * using the category-defined template. Empty values are dropped so
 * the spec sheet stays tight regardless of how many fields the admin
 * filled. Keys present in `specs` but NOT in the template are
 * collected into a final "Other" group so nothing is silently lost.
 */
export function buildSpecGroupsFromTemplate(
  specs: any,
  template: SpecTemplate
): RenderedSpecGroup[] {
  if (!specs || typeof specs !== "object" || Array.isArray(specs)) return []

  const used = new Set<string>()
  const out: RenderedSpecGroup[] = []

  for (const g of template.groups) {
    const rows: RenderedSpecRow[] = []
    for (const f of g.fields) {
      const raw = (specs as Record<string, any>)[f.key]
      if (raw === null || typeof raw === "undefined") continue
      let value: string
      if (typeof raw === "boolean") {
        value = raw ? "Yes" : "No"
      } else {
        value = String(raw).trim()
        if (!value) continue
        if (f.type === "date") {
          const parts = value.split("-")
          if (parts.length === 3) {
            const year = parseInt(parts[0], 10)
            const month = parseInt(parts[1], 10) - 1
            const day = parseInt(parts[2], 10)
            const dateValue = new Date(year, month, day)
            const today = new Date()
            today.setHours(0, 0, 0, 0)
            if (dateValue > today) {
              value = `${value} (Upcoming)`
            }
          }
        } else if (
          f.unit &&
          !value.toLowerCase().endsWith(f.unit.trim().toLowerCase())
        ) {
          value = `${value} ${f.unit}`
        }
      }
      rows.push({ key: f.key, label: f.label, value })
      used.add(f.key)
    }
    if (rows.length > 0) {
      out.push({ name: g.name, icon: g.icon || FALLBACK_GROUP_ICON, rows })
    }
  }

  // Capture spec keys that aren't in the template — never silently drop
  // admin-entered data.
  const otherRows: RenderedSpecRow[] = []
  for (const [key, raw] of Object.entries(specs)) {
    if (used.has(key)) continue
    if (!key || key.startsWith("_")) continue
    if (raw === null || typeof raw === "undefined") continue
    let value: string
    if (typeof raw === "boolean") {
      value = raw ? "Yes" : "No"
    } else {
      value = String(raw).trim()
      if (!value) continue
    }
    const label = key
      .replace(/_/g, " ")
      .replace(/\b\w/g, (l) => l.toUpperCase())
    otherRows.push({ key, label, value })
  }
  if (otherRows.length > 0) {
    out.push({ name: "Other", icon: FALLBACK_GROUP_ICON, rows: otherRows })
  }
  return out
}
