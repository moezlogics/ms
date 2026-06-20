import { Modules } from "@medusajs/framework/utils"

/* ------------------------------------------------------------------ *
 * cached() — thin read-through cache wrapper around the Medusa cache
 * module (Redis in production, see medusa-config.ts).
 *
 * Purpose: high-traffic public GET endpoints (site settings, banners,
 * brands, blog lists) are read on nearly every storefront page view.
 * Without this each hit runs a fresh DB query — the single biggest
 * source of avoidable DB load. We cache the serialized result for a
 * short TTL so repeated reads are served from Redis.
 *
 * Invalidation strategy: short TTLs (60–300s). Admin edits become
 * visible within the TTL. This is intentionally simple and is the same
 * "cache config for a minute" pattern large stores use for read-heavy
 * settings/CMS data. For instant invalidation, call `invalidateCache`
 * from the relevant admin write route.
 *
 * Fail-safe: every cache interaction is wrapped — if Redis is down or
 * the cache module is unavailable, we transparently fall back to the
 * live producer so the endpoint never breaks.
 * ------------------------------------------------------------------ */

type Scope = { resolve: (key: any) => any }

function getCache(scope: Scope): any | null {
  try {
    return scope.resolve(Modules.CACHE)
  } catch {
    return null
  }
}

export async function cached<T>(
  scope: Scope,
  key: string,
  ttlSeconds: number,
  producer: () => Promise<T>
): Promise<T> {
  const cache = getCache(scope)

  if (cache) {
    try {
      const hit = await cache.get(key)
      if (hit !== null && hit !== undefined) {
        return hit as T
      }
    } catch {
      /* ignore read errors, fall through to producer */
    }
  }

  const data = await producer()

  if (cache) {
    try {
      await cache.set(key, data, ttlSeconds)
    } catch {
      /* ignore write errors */
    }
  }

  return data
}

/** Invalidate one or more cache keys (best-effort). */
export async function invalidateCache(
  scope: Scope,
  keys: string | string[]
): Promise<void> {
  const cache = getCache(scope)
  if (!cache) return
  const list = Array.isArray(keys) ? keys : [keys]
  for (const k of list) {
    try {
      await cache.invalidate(k)
    } catch {
      /* ignore */
    }
  }
}
