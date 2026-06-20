import { model } from "@medusajs/framework/utils"

export const Review = model.define("advanced_review", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  customer_id: model.text().nullable(),
  guest_name: model.text().nullable(),
  guest_email: model.text().nullable(),
  rating: model.number(),
  content: model.text(),
  photos: model.json().nullable(), // array of strings (URLs)
  is_verified: model.boolean().default(false),
  status: model.enum(["pending", "approved", "flagged"]).default("pending"),
  owner_reply: model.text().nullable(),
  metadata: model.json().nullable(),
})
