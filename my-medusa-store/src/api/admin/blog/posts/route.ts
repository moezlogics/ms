import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../modules/blog"
import BlogModuleService from "../../../../modules/blog/service"

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .substring(0, 120) || `post-${Date.now()}`
}

// GET /admin/blog/posts — list with pagination and filters
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const q = req.query as Record<string, any>

  const limit = Math.min(parseInt(q.limit || "20", 10), 100)
  const offset = parseInt(q.offset || "0", 10)
  const filters: Record<string, any> = {}
  if (q.status) filters.status = q.status
  if (q.q) filters.title = { $ilike: `%${q.q}%` }

  const [posts, count] = await blog.listAndCountBlogPosts(filters, {
    take: limit,
    skip: offset,
    order: { created_at: "DESC" } as any,
    relations: ["categories"],
  })

  res.json({ posts, count, limit, offset })
}

// POST /admin/blog/posts — create
export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const body = (req.body || {}) as Record<string, any>

  if (!body.title) {
    return res.status(400).json({ error: "title is required" })
  }

  const handle = body.handle ? slugify(body.handle) : slugify(body.title)
  const now = new Date()

  const [post] = await blog.createBlogPosts([
    {
      title: body.title,
      handle,
      excerpt: body.excerpt || null,
      content: body.content || null,
      featured_image: body.featured_image || null,
      featured_image_alt: body.featured_image_alt || null,
      status: body.status || "draft",
      published_at: body.status === "published" ? now : body.published_at || null,
      seo_title: body.seo_title || null,
      seo_description: body.seo_description || null,
      seo_keywords: body.seo_keywords || null,
      categories: Array.isArray(body.category_ids)
        ? body.category_ids.map((id: string) => ({ id }))
        : [],
    } as any,
  ])

  res.status(201).json({ post })
}
