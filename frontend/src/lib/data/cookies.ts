import "server-only"
import { cookies as nextCookies } from "next/headers"

/**
 * IMPORTANT — why these helpers SWALLOW DynamicServerError instead of
 * rethrowing it:
 *
 * During an ISR render (`export const revalidate = N`) Next runs the page
 * in a static context where `cookies()` THROWS DynamicServerError. The old
 * code RETHREW that error, and at request time nothing above catches it →
 * **every ISR page 500'd** (this took the whole catalog down when ISR was
 * first enabled; only fully-static pages survived). Our fast sister-site
 * foodiespakistan has no such rethrow anywhere — its ISR pages simply
 * render anonymously — and that's the correct behaviour for a cached
 * page: no cookies → no user → anonymous render, which is exactly what a
 * shared cached page must contain anyway. User-specific UI (cart badge,
 * account state) self-corrects client-side after mount.
 */

export const getAuthHeaders = async (): Promise<
  { authorization: string } | {}
> => {
  try {
    const cookies = await nextCookies()
    const token = cookies.get("_medusa_jwt")?.value

    if (!token) {
      return {}
    }

    return { authorization: `Bearer ${token}` }
  } catch {
    // Static/ISR render (cookies unavailable) → anonymous.
    return {}
  }
}

export const getCacheTag = async (tag: string): Promise<string> => {
  try {
    const cookies = await nextCookies()
    const cacheId = cookies.get("_medusa_cache_id")?.value

    if (!cacheId) {
      return ""
    }

    return `${tag}-${cacheId}`
  } catch {
    // Static/ISR render → no per-user tag.
    return ""
  }
}

/**
 * Public/global cache tags — these are NOT scoped to a user's
 * `_medusa_cache_id` cookie, so a single revalidation from the Medusa
 * backend (via `/api/revalidate`) can invalidate the cached fetch for
 * every visitor at once. Per-user tags (returned by `getCacheTag`) are
 * still attached so user-specific actions (locale change, cart events)
 * keep working as before.
 *
 * Keep this list aligned with the tags the backend subscriber emits
 * (see `src/subscribers/revalidate-storefront.ts`).
 */
const GLOBAL_REVALIDATE_TAGS = new Set([
  "products",
  "categories",
  "collections",
  "regions",
  "sales-channels",
  "shipping-options",
  "site-settings",
  "banners",
  "brands",
  "blog",
])

/**
 * Time-based revalidation fallback (seconds) for public data sets.
 *
 * The backend subscriber + `/api/revalidate` route is the primary
 * cache-busting path, but it can silently miss under real-world
 * conditions: subscriber crash on a single event, custom modules
 * that don't emit events, Cloudflare 5xx, or the storefront being
 * mid-restart when the POST fires.
 *
 * Pairing tag invalidation with `next.revalidate = 60` means the
 * stalest a public page can ever get is 60 seconds — Next.js will
 * silently background-refresh the underlying fetch once a cached
 * response is older than that. Deletes that the event pipeline
 * missed self-heal within a minute instead of "forever".
 *
 * Only applied to entries in `GLOBAL_REVALIDATE_TAGS`. User-scoped
 * caches (carts, customer, orders) keep their per-action
 * invalidation — adding a 60s timer there would be wasteful and
 * could leak across sessions in edge cases.
 *
 * Override with `CACHE_REVALIDATE_SECONDS` env var when needed.
 */
const GLOBAL_REVALIDATE_SECONDS = (() => {
  const raw = Number(process.env.CACHE_REVALIDATE_SECONDS)
  return Number.isFinite(raw) && raw > 0 ? raw : 60
})()

export const getCacheOptions = async (
  tag: string
): Promise<{ tags?: string[]; revalidate?: number } | {}> => {
  if (typeof window !== "undefined") {
    return {}
  }

  const tags: string[] = []

  // Only call getCacheTag (which reads cookies) for private / user-specific tags.
  // For global public data sets, avoid reading cookies entirely to prevent opting
  // the page / fetch into dynamic request-time rendering during builds.
  if (GLOBAL_REVALIDATE_TAGS.has(tag)) {
    tags.push(tag)
  } else {
    const cacheTag = await getCacheTag(tag)
    if (cacheTag) {
      tags.push(cacheTag)
    }
  }

  const opts: { tags?: string[]; revalidate?: number } = {}

  if (tags.length > 0) {
    opts.tags = tags
  }

  // Time-based safety net for public data. Triggers a background
  // re-fetch when the cache entry is older than the configured
  // window, regardless of whether the event subscriber fired.
  if (GLOBAL_REVALIDATE_TAGS.has(tag)) {
    opts.revalidate = GLOBAL_REVALIDATE_SECONDS
  }

  return opts
}

export const setAuthToken = async (token: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", token, {
    // 30 days — matches the backend jwtExpiresIn so the cookie doesn't
    // outlive (or under-live) the token. Previously 7d while the token
    // itself defaulted to ~1d, so customers were silently logged out
    // after a day even though the cookie was still around.
    maxAge: 60 * 60 * 24 * 30,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeAuthToken = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_jwt", "", {
    maxAge: -1,
  })
}

export const getCartId = async () => {
  try {
    const cookies = await nextCookies()
    return cookies.get("_medusa_cart_id")?.value
  } catch {
    // Static/ISR render — cookies() throws here. No try/catch existed
    // before, so retrieveCart() crashed every ISR page (a second 500
    // source besides the rethrows above). Anonymous render → no cart.
    return undefined
  }
}

export const setCartId = async (cartId: string) => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", cartId, {
    maxAge: 60 * 60 * 24 * 7,
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  })
}

export const removeCartId = async () => {
  const cookies = await nextCookies()
  cookies.set("_medusa_cart_id", "", {
    maxAge: -1,
  })
}

/**
 * "Return to" cookie — short-lived breadcrumb that lets the auth flow
 * (email login, OTP signup, Google OAuth) bring the user back to the
 * page they came from. We avoid putting the URL on the auth form as a
 * hidden field exclusively because the Google OAuth round-trip strips
 * any query params we don't put inside `state`, so a cookie survives
 * where a form field can't.
 *
 * Security:
 *   - httpOnly so client JS can't read or tamper.
 *   - 10-minute TTL — long enough for OAuth, short enough that a stale
 *     redirect can't ambush a future login.
 *   - Only same-origin paths starting with "/" are accepted; anything
 *     else (e.g. `//evil.com`, `https://…`) is silently dropped to
 *     prevent open-redirect attacks.
 */
const RETURN_TO_COOKIE = "_medusa_return_to"
const RETURN_TO_MAX_AGE = 60 * 10 // 10 minutes

const isSafeReturnTo = (value: string | null | undefined): value is string => {
  if (!value || typeof value !== "string") return false
  // Must be a relative path; reject protocol-relative and absolute URLs.
  if (!value.startsWith("/")) return false
  if (value.startsWith("//")) return false
  // Reject control characters and suspiciously long values.
  if (value.length > 512) return false
  if (/[\x00-\x1f]/.test(value)) return false
  return true
}

export const setReturnTo = async (path: string | null | undefined) => {
  if (!isSafeReturnTo(path)) return
  const cookies = await nextCookies()
  cookies.set(RETURN_TO_COOKIE, path, {
    maxAge: RETURN_TO_MAX_AGE,
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
  })
}

export const getReturnTo = async (): Promise<string | null> => {
  try {
    const cookies = await nextCookies()
    const value = cookies.get(RETURN_TO_COOKIE)?.value
    return isSafeReturnTo(value) ? value : null
  } catch {
    // Static/ISR render → no return-to breadcrumb.
    return null
  }
}

export const clearReturnTo = async () => {
  const cookies = await nextCookies()
  cookies.set(RETURN_TO_COOKIE, "", { maxAge: -1, path: "/" })
}
