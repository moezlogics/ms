import { model } from "@medusajs/framework/utils"
import { BlogCategory } from "./category"

export const BlogPost = model.define("blog_post", {
  id: model.id({ prefix: "bpost" }).primaryKey(),
  title: model.text().searchable(),
  handle: model.text().unique(),
  excerpt: model.text().nullable(),
  content: model.text().nullable(), // rich HTML (from TipTap)
  featured_image: model.text().nullable(),
  featured_image_alt: model.text().nullable(),
  status: model.enum(["draft", "published"]).default("draft"),
  published_at: model.dateTime().nullable(),
  // SEO
  seo_title: model.text().nullable(),
  seo_description: model.text().nullable(),
  seo_keywords: model.text().nullable(),
  // Relations
  categories: model.manyToMany(() => BlogCategory, {
    pivotTable: "blog_post_categories",
  }),
})
