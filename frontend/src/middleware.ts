import { NextRequest, NextResponse } from "next/server"

const BACKEND_URL = process.env.MEDUSA_BACKEND_URL
const PUBLISHABLE_API_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY
const DEFAULT_REGION = process.env.NEXT_PUBLIC_DEFAULT_REGION || "pk"

/**
 * Middleware to always serve Pakistan (pk) region without showing
 * country code in the URL. All requests are internally rewritten
 * to /pk/... but the browser URL stays clean.
 *
 * Routes that live OUTSIDE the `[countryCode]` segment must skip the
 * rewrite — otherwise Next.js looks for them under
 * `app/[countryCode]/.../page.tsx` (where they don't exist) and 404s.
 * That includes:
 *   - /api/*           (route handlers + Meilisearch proxy)
 *   - /auth/*          (Google OAuth callback page)
 *   - /sitemap.xml     (root metadata route)
 *   - /robots.txt      (root metadata route)
 */
const SKIP_PREFIXES = ["/api", "/auth", "/sitemap", "/robots"]

export async function middleware(request: NextRequest) {
  const { pathname, search, origin } = request.nextUrl

  // Skip static assets (anything with a file extension)
  if (pathname.includes(".")) {
    return NextResponse.next()
  }

  // Skip root-level routes that aren't inside `[countryCode]`
  if (SKIP_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next()
  }

  // If the path already starts with /pk (internal rewrite loop guard), pass through
  if (pathname.startsWith(`/${DEFAULT_REGION}`)) {
    return NextResponse.next()
  }

  // Rewrite internally to /pk/... — URL in browser stays the same
  const rewriteUrl = new URL(
    `/${DEFAULT_REGION}${pathname === "/" ? "" : pathname}${search}`,
    origin
  )

  const response = NextResponse.rewrite(rewriteUrl)

  // ── CDN caching for anonymous catalog traffic ──────────────────────
  // Next marks every dynamic page `private, no-store`, so Cloudflare
  // (Cf-Cache-Status: DYNAMIC) re-renders on the server for EVERY first
  // visit — that's the slow "first response". For visitors with no
  // session and no cart (the vast majority of first-time mobile traffic)
  // the page is user-independent, so let the CDN hold it.
  const isUserBound =
    request.cookies.get("_medusa_jwt") || request.cookies.get("_medusa_cart_id")
  const isPrivatePath = ["/account", "/cart", "/checkout", "/order", "/compare"].some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  )
  const cacheableAnon =
    request.method === "GET" && !isUserBound && !isPrivatePath

  if (cacheableAnon) {
    // CRITICAL: do NOT set ANY cookie here. Cloudflare refuses to cache
    // a response that carries `Set-Cookie` (it returns Cf-Cache-Status:
    // BYPASS) — which is exactly why the HTML was never edge-cached and
    // every first response hit the origin. An anonymous visitor doesn't
    // need the per-user `_medusa_cache_id` (catalog data is global), so
    // we skip it here to keep the response cookie-free + CDN-cacheable.
    response.headers.set(
      "Cache-Control",
      "public, max-age=0, s-maxage=300, stale-while-revalidate=86400"
    )
  } else {
    // User-bound / private / non-GET request: set the per-user cache-id
    // for scoped fetch-cache tagging (these responses are never CDN-cached
    // anyway, so the Set-Cookie is harmless here).
    if (!request.cookies.get("_medusa_cache_id")) {
      response.cookies.set("_medusa_cache_id", crypto.randomUUID(), {
        maxAge: 60 * 60 * 24,
      })
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|auth|sitemap|robots|_next/static|_next/image|favicon.ico|images|assets|png|svg|jpg|jpeg|gif|webp).*)",
  ],
}
