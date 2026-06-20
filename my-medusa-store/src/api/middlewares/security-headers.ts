import { MedusaRequest, MedusaResponse, MedusaNextFunction } from "@medusajs/framework/http"

/* ------------------------------------------------------------------ *
 * Baseline security response headers for the API + (dev) admin.
 *
 * These are conservative, framework-safe headers that don't risk
 * breaking JSON API clients or the admin SPA:
 *   - HSTS: force HTTPS for a year (only honoured over TLS, harmless on http)
 *   - nosniff: stop MIME-type sniffing
 *   - SAMEORIGIN: block the API/admin being framed by other sites
 *   - Referrer-Policy: don't leak full URLs cross-origin
 *   - Permissions-Policy: deny powerful features the API never needs
 *
 * A full Content-Security-Policy is intentionally NOT set here — it's
 * highly app-specific and best applied (and tested) at the nginx layer
 * and in the Next.js storefront, to avoid silently breaking the admin.
 * ------------------------------------------------------------------ */
export function securityHeaders(
  _req: MedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
) {
  res.setHeader(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains"
  )
  res.setHeader("X-Content-Type-Options", "nosniff")
  res.setHeader("X-Frame-Options", "SAMEORIGIN")
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin")
  res.setHeader(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), interest-cohort=()"
  )
  // Remove the framework's default tech fingerprint where present.
  res.removeHeader("X-Powered-By")

  return next()
}
