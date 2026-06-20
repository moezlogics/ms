import { model } from "@medusajs/framework/utils"

export const BlogCategory: any = model.define("blog_category", {
  id: model.id({ prefix: "bcat" }).primaryKey(),
  name: model.text().searchable(),
  handle: model.text().unique(),
  description: model.text().nullable(),
  posts: model.manyToMany(() => require("./post").BlogPost, {
    mappedBy: "categories",
  }),
})
