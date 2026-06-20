import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../../modules/blog"
import BlogModuleService from "../../../../../modules/blog/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const { id } = req.params
  const post = await blog.retrieveBlogPost(id, { relations: ["categories"] })
  res.json({ post })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  // alias for PATCH (Medusa admin UI sometimes uses POST with _method)
  return PATCH(req, res)
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const { id } = req.params
  const body = (req.body || {}) as Record<string, any>

  const update: Record<string, any> = { id }
  const allowed = [
    "title",
    "handle",
    "excerpt",
    "content",
    "featured_image",
    "featured_image_alt",
    "status",
    "published_at",
    "seo_title",
    "seo_description",
    "seo_keywords",
  ]
  for (const key of allowed) {
    if (key in body) update[key] = body[key]
  }

  // If publishing for the first time, stamp published_at
  if (body.status === "published" && !body.published_at) {
    update.published_at = new Date()
  }

  if (Array.isArray(body.category_ids)) {
    update.categories = body.category_ids.map((cid: string) => ({ id: cid }))
  }

  const [post] = await blog.updateBlogPosts([update as any])
  res.json({ post })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const { id } = req.params
  await blog.deleteBlogPosts([id])
  res.json({ id, deleted: true })
}
