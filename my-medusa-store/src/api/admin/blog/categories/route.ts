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
    .substring(0, 80) || `cat-${Date.now()}`
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const q = req.query as Record<string, any>
  const limit = Math.min(parseInt(q.limit || "100", 10), 200)
  const offset = parseInt(q.offset || "0", 10)

  const [categories, count] = await blog.listAndCountBlogCategories(
    {},
    { take: limit, skip: offset, order: { name: "ASC" } as any }
  )
  res.json({ categories, count, limit, offset })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const body = (req.body || {}) as Record<string, any>

  if (!body.name) {
    return res.status(400).json({ error: "name is required" })
  }

  const handle = body.handle ? slugify(body.handle) : slugify(body.name)

  const [category] = await blog.createBlogCategories([
    {
      name: body.name,
      handle,
      description: body.description || null,
    },
  ])

  res.status(201).json({ category })
}
