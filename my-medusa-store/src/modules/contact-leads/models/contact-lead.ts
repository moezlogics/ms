import { model } from "@medusajs/framework/utils"

export const ContactLead = model.define("contact_lead", {
  id: model.id({ prefix: "clead" }).primaryKey(),
  name: model.text(),
  email: model.text(),
  phone: model.text().nullable(),
  subject: model.text().nullable(),
  message: model.text(),
  status: model.enum(["new", "read", "replied", "archived"]).default("new"),
})
