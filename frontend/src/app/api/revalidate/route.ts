import { revalidatePath, revalidateTag } from "next/cache"
import { NextRequest, NextResponse } from "next/server"

/**
 * Storefront cache-invalidation webhook.
 *
 * The Medusa backend posts here on data-mutation events
 * (`product.created`, `product-category.updated`,
 * `product-collection.deleted`, etc.) so the Next.js fetch cache
 * stops serving stale data to visitors. See the matching subscriber
 * at `src/subscribers/revalidate-storefront.ts` in the backend.
 *
 * Security:
 *   - Requires the `x-revalidate-secret` header to equal the
 *     `REVALIDATE_SECRET` env var. Both backend and storefront must
 *     share the same value. Returns 401 if missing or wrong.
 *   - `REVALIDATE_SECRET` MUST be set in the storefront env. If it
 *     isn't, the route returns 503 instead of silently accepting
 *     anonymous requests — a misconfiguration is loud, not a
 *     security hole.
 *
 * Body:
 *   { "tags": ["products", "categories", ...], "paths": ["/"] }
 *
 * Either field is optional. `tags` calls `revalidateTag(...)` for
 * each; `paths` calls `revalidatePath(...)` for each. The tags must
 * match the global set defined in
 * `src/lib/data/cookies.ts::GLOBAL_REVALIDATE_TAGS`.
 */
export async function POST(req: NextRequest) {
  const expected = process.env.REVALIDATE_SECRET

  if (!expected) {
    return NextResponse.json(
      { error: "REVALIDATE_SECRET is not configured on the storefront" },
      { status: 503 }
    )
  }

  const provided = req.headers.get("x-revalidate-secret")
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  let body: { tags?: unknown; paths?: unknown }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const tags = Array.isArray(body.tags)
    ? body.tags.filter((t): t is string => typeof t === "string" && t.length > 0)
    : []
  const paths = Array.isArray(body.paths)
    ? body.paths.filter((p): p is string => typeof p === "string" && p.length > 0)
    : []

  if (tags.length === 0 && paths.length === 0) {
    return NextResponse.json(
      { error: "Provide at least one of `tags` or `paths`" },
      { status: 400 }
    )
  }

  for (const tag of tags) {
    revalidateTag(tag)
  }
  for (const path of paths) {
    revalidatePath(path)
  }

  return NextResponse.json({
    revalidated: true,
    tags,
    paths,
    at: new Date().toISOString(),
  })
}

export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
