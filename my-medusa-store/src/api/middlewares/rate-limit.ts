import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"

/* ------------------------------------------------------------------ *
 * Lightweight fixed-window rate limiter.
 *
 * Why in-memory (not Redis): keeps the hot request path dependency-free
 * and adds zero latency. The app runs under PM2 cluster (2 instances),
 * so the *effective* global ceiling is `max × instances` — that's fine
 * for the goal here, which is to stop brute-force and request floods
 * from knocking the server over (the "site must never go down" ask),
 * not to enforce a billing-grade exact quota.
 *
 * Keyed by client IP (honouring the nginx/CloudPanel proxy via
 * x-forwarded-for) + a per-route bucket name, so limits on /auth don't
 * consume the budget for /contact, etc.
 * ------------------------------------------------------------------ */

type Counter = { count: number; resetAt: number }

const store = new Map<string, Counter>()

// Periodic sweep so the Map can't grow unbounded under attack.
const SWEEP_MS = 60_000
let lastSweep = Date.now()
function sweep(now: number) {
  if (now - lastSweep < SWEEP_MS) return
  lastSweep = now
  for (const [key, c] of store) {
    if (c.resetAt <= now) store.delete(key)
  }
}

function clientIp(req: MedusaRequest): string {
  const fwd = req.headers["x-forwarded-for"]
  if (typeof fwd === "string" && fwd.length > 0) {
    return fwd.split(",")[0].trim()
  }
  if (Array.isArray(fwd) && fwd.length > 0) {
    return fwd[0].split(",")[0].trim()
  }
  // @ts-ignore - express req.ip / socket fallback
  return req.ip || req.socket?.remoteAddress || "unknown"
}

export type RateLimitOptions = {
  /** Max requests allowed per window, per client. */
  max: number
  /** Window length in milliseconds. */
  windowMs: number
  /** Bucket name so different routes have independent budgets. */
  bucket: string
}

export function rateLimit(opts: RateLimitOptions) {
  const { max, windowMs, bucket } = opts

  return (req: MedusaRequest, res: MedusaResponse, next: MedusaNextFunction) => {
    const now = Date.now()
    sweep(now)

    const key = `${bucket}:${clientIp(req)}`
    let entry = store.get(key)

    if (!entry || entry.resetAt <= now) {
      entry = { count: 0, resetAt: now + windowMs }
      store.set(key, entry)
    }

    entry.count++

    const remaining = Math.max(0, max - entry.count)
    const resetSec = Math.ceil((entry.resetAt - now) / 1000)

    res.setHeader("X-RateLimit-Limit", String(max))
    res.setHeader("X-RateLimit-Remaining", String(remaining))
    res.setHeader("X-RateLimit-Reset", String(resetSec))

    if (entry.count > max) {
      res.setHeader("Retry-After", String(resetSec))
      return res.status(429).json({
        type: "rate_limit",
        message: "Too many requests. Please slow down and try again shortly.",
      })
    }

    return next()
  }
}
