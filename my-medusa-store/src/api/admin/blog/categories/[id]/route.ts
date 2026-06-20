import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../../modules/blog"
import BlogModuleService from "../../../../../modules/blog/service"

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const category = await blog.retrieveBlogCategory(req.params.id)
  res.json({ category })
}

export async function POST(req: MedusaRequest, res: MedusaResponse) {
  return PATCH(req, res)
}

export async function PATCH(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const { id } = req.params
  const body = (req.body || {}) as Record<string, any>

  const update: Record<string, any> = { id }
  for (const k of ["name", "handle", "description"]) {
    if (k in body) update[k] = body[k]
  }
  const [category] = await blog.updateBlogCategories([update as any])
  res.json({ category })
}

export async function DELETE(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  await blog.deleteBlogCategories([req.params.id])
  res.json({ id: req.params.id, deleted: true })
}
