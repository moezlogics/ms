import { model } from "@medusajs/framework/utils"

/**
 * Homepage hero banner.
 *
 * Operators manage these from the admin panel — each banner has an image,
 * optional headline/subhead overlay, optional click-through URL, a sort
 * order and an active flag. The storefront pulls active banners ordered
 * by `sort_order ASC` and renders them as a full-width fade/slide carousel.
 */
export const Banner = model.define("banner", {
  id: model.id({ prefix: "banner" }).primaryKey(),
  title: model.text().nullable(),
  subtitle: model.text().nullable(),
  image_url: model.text(),
  image_url_mobile: model.text().nullable(),
  link_url: model.text().nullable(),
  cta_label: model.text().nullable(),
  text_position: model.text().default("bottom-left"), // "bottom-left", "center", "bottom-right", "top-left"
  theme: model.text().default("dark"), // "dark" (glass dark) or "light" (glass light)
  sort_order: model.number().default(0),
  is_active: model.boolean().default(true),
})
