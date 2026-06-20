import { model } from "@medusajs/framework/utils"

/**
 * Spec Template — a reusable schema of specification fields.
 *
 * Admin creates templates on the `/admin/spec-templates` page,
 * then links them to product categories. Products in that
 * category inherit the template's groups/fields and render
 * a structured spec form + storefront spec sheet.
 *
 * `template_data` stores the full JSON payload:
 *   { groups: [{ name, icon, fields: [{ key, label, unit, type, options, placeholder, highlight }] }] }
 */
export const SpecTemplate = model.define("spec_template", {
  id: model.id({ prefix: "sptpl" }).primaryKey(),
  /** Human-readable label, e.g. "Mobile Phone", "Laptop". */
  name: model.text().searchable(),
  /** URL-safe slug, e.g. "mobile-phone". Unique per store. */
  handle: model.text().unique(),
  /** Short description shown in the admin list. */
  description: model.text().nullable(),
  /** Phosphor icon class for the template, e.g. "ph-device-mobile". */
  icon: model.text().default("ph-list-checks"),
  /** Whether this is a built-in preset (true) or user-created (false). */
  is_preset: model.boolean().default(false),
  /** Sort order for the admin list. */
  sort_order: model.number().default(0),
  /**
   * The full template JSON — stored as JSONB.
   * Shape: { groups: SpecTemplateGroup[] }
   */
  template_data: model.json().default({ groups: [] }),
})
