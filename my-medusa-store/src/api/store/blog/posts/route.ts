import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { BLOG_MODULE } from "../../../../modules/blog"
import BlogModuleService from "../../../../modules/blog/service"
import { cached } from "../../../../utils/cache-response"

// Public list — only published posts
export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const blog: BlogModuleService = req.scope.resolve(BLOG_MODULE)
  const q = req.query as Record<string, any>

  const limit = Math.min(parseInt(q.limit || "12", 10), 50)
  const offset = parseInt(q.offset || "0", 10)

  const filters: Record<string, any> = { status: "published" }
  if (q.q) filters.title = { $ilike: `%${q.q}%` }

  if (q.category) {
    // filter by category handle
    const categories = await blog.listBlogCategories({ handle: q.category })
    if (categories.length) {
      filters.categories = { id: categories[0].id }
    } else {
      return res.json({ posts: [], count: 0, limit, offset })
    }
  }

  const runQuery = () =>
    blog.listAndCountBlogPosts(filters, {
      take: limit,
      skip: offset,
      order: { published_at: "DESC" } as any,
      relations: ["categories"],
    })

  // Cache normal listings/pagination. Skip caching free-text searches
  // (q.q) so arbitrary search strings can't pollute the cache.
  let posts: any[]
  let count: number
  if (q.q) {
    ;[posts, count] = await runQuery()
  } else {
    const cat = typeof q.category === "string" ? q.category : "all"
    const result = await cached<[any[], number]>(
      req.scope,
      `store:blog:posts:${cat}:${limit}:${offset}`,
      180,
      runQuery
    )
    ;[posts, count] = result
    res.setHeader("Cache-Control", "public, max-age=120, s-maxage=180")
  }

  res.json({ posts, count, limit, offset })
}
