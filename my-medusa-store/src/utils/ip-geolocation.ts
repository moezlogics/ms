/**
 * Server-side IP geolocation with multi-provider fallback.
 *
 * Why server-side?
 *   Browser-side IP geo (ipapi.co etc.) is unreliable — ad-blockers,
 *   Brave shields, and corporate proxies all kill the call, and free
 *   tiers rate-limit aggressively per-client-IP. Doing the lookup on
 *   the backend means:
 *     • One outbound request per real visitor IP, with a 5-minute
 *       memory cache so repeat subscribers don't burn quota.
 *     • Predictable behaviour regardless of the client's browser.
 *     • Cloudflare headers (when CF is in front) take precedence and
 *       skip the lookup entirely.
 *
 * Providers (tried in order — first OK response wins):
 *   1. http://ip-api.com/json/<ip>     — 45 req/min/IP, no key, returns
 *                                         { city, regionName, country }
 *   2. https://ipwhois.app/json/<ip>   — 10k req/month, no key, returns
 *                                         { city, region, country }
 *   3. https://ipapi.co/<ip>/json/      — 1k req/day, no key, returns
 *                                         { city, region, country_name }
 *
 * We DON'T require any of the providers to be reachable — geo is
 * advisory metadata, not a blocker for subscription create/update.
 */

export type GeoResult = {
  city: string | null
  state: string | null
  country: string | null
}

const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const FETCH_TIMEOUT_MS = 2500
const NEGATIVE_TTL_MS = 60 * 1000 // 1 minute for failures so we retry sooner

type CachedEntry = {
  result: GeoResult | null
  expires: number
}

// In-memory cache keyed by IP. Stays per-process; that's fine — a single
// Medusa node won't see enough cardinality to grow this unbounded, and
// it gets evicted on TTL.
const CACHE: Map<string, CachedEntry> = (globalThis as any).__ipGeoCache__ ||
  new Map<string, CachedEntry>()
;(globalThis as any).__ipGeoCache__ = CACHE

/**
 * Pull the real client IP out of an Express request, accounting for
 * the most common reverse-proxy headers. Order matters — we trust
 * Cloudflare → upstream LB → x-forwarded-for chain → req.ip.
 */
export function extractClientIp(req: {
  headers: Record<string, any>
  ip?: string
  socket?: { remoteAddress?: string }
}): string | null {
  const get = (name: string) => {
    const v = req.headers[name] || req.headers[name.toLowerCase()]
    return Array.isArray(v) ? v[0] : v
  }

  const cf = get("cf-connecting-ip")
  if (cf) return String(cf).trim()

  const real = get("x-real-ip")
  if (real) return String(real).trim()

  const xff = get("x-forwarded-for")
  if (xff) {
    // First entry in the comma-separated list is the original client
    const first = String(xff).split(",")[0].trim()
    if (first) return first
  }

  if (req.ip) return req.ip
  if (req.socket?.remoteAddress) return req.socket.remoteAddress
  return null
}

/**
 * Returns true when the IP is private/loopback/link-local — there's no
 * point in geo-looking-up "127.0.0.1" or "10.x.x.x".
 */
function isPrivateIp(ip: string): boolean {
  const v = ip.replace(/^::ffff:/, "")
  if (v === "::1" || v === "127.0.0.1") return true
  if (/^10\./.test(v)) return true
  if (/^192\.168\./.test(v)) return true
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(v)) return true
  if (/^169\.254\./.test(v)) return true // link-local
  if (/^fc|^fd/.test(v)) return true // IPv6 ULA
  return false
}

async function fetchJson(url: string): Promise<any | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: controller.signal as any })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Try ip-api.com (highest free quota of the bunch).
 * Returns null if the provider is unreachable or rate-limits.
 */
async function lookupIpApi(ip: string): Promise<GeoResult | null> {
  const j = await fetchJson(
    `http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,city,regionName,country`
  )
  if (!j || j.status !== "success") return null
  return {
    city: j.city || null,
    state: j.regionName || null,
    country: j.country || null,
  }
}

async function lookupIpWhois(ip: string): Promise<GeoResult | null> {
  const j = await fetchJson(
    `https://ipwhois.app/json/${encodeURIComponent(ip)}`
  )
  if (!j || j.success === false) return null
  return {
    city: j.city || null,
    state: j.region || null,
    country: j.country || null,
  }
}

async function lookupIpapiCo(ip: string): Promise<GeoResult | null> {
  const j = await fetchJson(
    `https://ipapi.co/${encodeURIComponent(ip)}/json/`
  )
  if (!j || j.error) return null
  return {
    city: j.city || null,
    state: j.region || j.region_code || null,
    country: j.country_name || j.country || null,
  }
}

/**
 * Look up city/state/country for an IP. Falls through providers until
 * one returns a useful payload. Returns null if every provider fails or
 * the IP is private/missing.
 */
export async function resolveGeoFromIp(
  ip: string | null
): Promise<GeoResult | null> {
  if (!ip || isPrivateIp(ip)) return null

  // Cache check
  const cached = CACHE.get(ip)
  if (cached && cached.expires > Date.now()) {
    return cached.result
  }

  const providers = [lookupIpApi, lookupIpWhois, lookupIpapiCo]
  for (const provider of providers) {
    try {
      const result = await provider(ip)
      if (result && (result.city || result.state || result.country)) {
        CACHE.set(ip, { result, expires: Date.now() + CACHE_TTL_MS })
        return result
      }
    } catch {
      // try next provider
    }
  }

  // All providers failed — cache a short negative result so we don't
  // hammer them on every page view from the same IP
  CACHE.set(ip, { result: null, expires: Date.now() + NEGATIVE_TTL_MS })
  return null
}
