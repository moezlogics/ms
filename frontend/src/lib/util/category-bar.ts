/**
 * Parses the admin "Top Category Bar" setting into a normalized shape used
 * by the homepage and store page.
 *
 * Stored in site_settings (key `homepage_top_categories` / `store_top_categories`)
 * by the admin Page Builder. Two formats are accepted:
 *   • legacy: a bare JSON array of category IDs → treated as "custom".
 *   • current: `{ mode: "all" | "custom" | "hidden", ids: string[] }`.
 *
 * Modes:
 *   • "all"    → show all top-level categories (default / back-compat).
 *   • "custom" → show exactly `ids`, in order.
 *   • "hidden" → don't render the category bar at all.
 */
export type CategoryBarConfig = {
  hidden: boolean
  ids: string[]
}

export function parseCategoryBar(raw: unknown): CategoryBarConfig {
  if (!raw || typeof raw !== "string") return { hidden: false, ids: [] }
  try {
    const v = JSON.parse(raw)

    // Legacy: bare array of IDs = custom selection.
    if (Array.isArray(v)) {
      return { hidden: false, ids: v.filter((x) => typeof x === "string") }
    }

    if (v && typeof v === "object") {
      if (v.mode === "hidden") return { hidden: true, ids: [] }
      const ids = Array.isArray(v.ids)
        ? v.ids.filter((x: any) => typeof x === "string")
        : []
      // "custom" with no ids behaves like "all" (nothing curated yet).
      return { hidden: false, ids: v.mode === "custom" ? ids : [] }
    }
  } catch {
    /* malformed → default */
  }
  return { hidden: false, ids: [] }
}
