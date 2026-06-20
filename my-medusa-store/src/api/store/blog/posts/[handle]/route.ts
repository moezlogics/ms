import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../../modules/blog"
import BlogModuleService from "../../../../../modules/blog/service"

// Public single post by handle
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const { handle } = req.params

  const [post] = await blog.listBlogPosts(
    { handle, status: "published" },
    { relations: ["categories"], take: 1 }
  )

  if (!post) {
    return res.status(404).json({ error: "Post not found" })
  }

  res.json({ post })
}
