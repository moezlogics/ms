import { model } from "@medusajs/framework/utils"

/**
 * Brand — supports nested hierarchy (sub-brands) via `parent_id`.
 *
 *   parent_id = null  → top-level brand (e.g. "Apple")
 *   parent_id = "..." → sub-brand (e.g. "Apple Mac" parent="brand_apple")
 *
 * Hierarchy depth is intentionally unrestricted; in practice the
 * storefront URL builder caps at the depth Medusa categories use
 * (~5 levels). The FK is declared at the SQL level (see migration
 * + sync-db script) — Medusa's `model.define()` doesn't expose a
 * self-referencing FK helper, so we just keep `parent_id` as a
 * plain nullable text column on the model layer.
 */
export const Brand = model.define("brand", {
  id: model.id({ prefix: "brand" }).primaryKey(),
  name: model.text().searchable(),
  handle: model.text().unique(),
  logo_url: model.text().nullable(),
  description: model.text().nullable(),
  website_url: model.text().nullable(),
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  sort_order: model.number().default(0),
  is_active: model.boolean().default(true),
  parent_id: model.text().nullable(),
})

export const BrandProduct = model.define("brand_product", {
  id: model.id({ prefix: "bp" }).primaryKey(),
  product_id: model.text(),
  brand_id: model.text(),
})
