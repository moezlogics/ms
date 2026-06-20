import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/* ------------------------------------------------------------------ *
 * Login lockout — brute-force protection for admin login.
 *
 * After MAX_FAILS failed attempts from one IP, that IP is BANNED from
 * logging in for BAN_SECONDS (1 hour). Enforced on the backend (the only
 * place that can't be bypassed) and backed by Redis (the cache module),
 * so the ban is shared across PM2 cluster instances and survives restarts.
 *
 * A successful login clears the counter.
 * ------------------------------------------------------------------ */

const MAX_FAILS = 3
const BAN_SECONDS = 60 * 60 // 1 hour
const FAIL_WINDOW = 60 * 60 // count failures within a rolling hour

function clientIp(req: MedusaRequest): string {
  const fwd = req.headers["x-forwarded-for"]
  if (typeof fwd === "string" && fwd.length > 0) return fwd.split(",")[0].trim()
  if (Array.isArray(fwd) && fwd.length > 0) return fwd[0].split(",")[0].trim()
  // @ts-ignore
  return req.ip || req.socket?.remoteAddress || "unknown"
}

export async function loginLockout(
  req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  let cache: any = null
  try {
    cache = req.scope.resolve(Modules.CACHE)
  } catch {
    return next() // no cache available — fail open (don't block logins)
  }

  const ip = clientIp(req)
  const banKey = `login:ban:${ip}`
  const failKey = `login:fails:${ip}`

  // 1) Already banned? Reject before the auth handler runs.
  try {
    const banned = await cache.get(banKey)
    if (banned) {
      res.setHeader("Retry-After", String(BAN_SECONDS))
      return res.status(429).json({
        type: "locked",
        message:
          "Too many failed login attempts. This device is locked for 1 hour. Please try again later.",
      })
    }
  } catch {
    /* cache read failed — continue */
  }

  // 2) Observe the auth result after the handler finishes.
  res.on("finish", () => {
    void (async () => {
      try {
        if (res.statusCode === 401) {
          const current = ((await cache.get(failKey)) as number) || 0
          const updated = current + 1
          if (updated >= MAX_FAILS) {
            await cache.set(banKey, true, BAN_SECONDS)
            try {
              await cache.invalidate(failKey)
            } catch {}
          } else {
            await cache.set(failKey, updated, FAIL_WINDOW)
          }
        } else if (res.statusCode >= 200 && res.statusCode < 300) {
          // Successful login — clear counters.
          try {
            await cache.invalidate(failKey)
            await cache.invalidate(banKey)
          } catch {}
        }
      } catch {
        /* never let bookkeeping crash anything */
      }
    })()
  })

  return next()
}
