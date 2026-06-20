import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../modules/blog"
import BlogModuleService from "../../../../modules/blog/service"

// Public categories list — used by the storefront for filter chips
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const categories = await blog.listBlogCategories(
    {},
    { order: { name: "ASC" } as any }
  )
  res.json({ categories })
}
