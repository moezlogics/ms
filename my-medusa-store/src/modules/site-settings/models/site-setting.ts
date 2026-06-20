import { model } from "@medusajs/framework/utils"

export const SiteSetting = model.define("site_setting", {
  id: model.id({ prefix: "sset" }).primaryKey(),
  key: model.text().unique(),
  value: model.text().nullable(),
})
