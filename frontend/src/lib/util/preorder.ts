/**
 * Pre-order state resolver.
 *
 * Admins flag a product as pre-order by setting three metadata keys
 * on the product itself (no schema migration needed):
 *
 *   metadata.preorder_open    → "true" / true to activate
 *   metadata.launch_date      → ISO date string ("2026-06-15T00:00:00Z")
 *   metadata.preorder_message → optional override for the banner copy
 *
 * Once the launch date has passed the storefront automatically
 * reverts to the regular "Add to Cart" / "Buy Now" CTAs, so admins
 * don't need to manually flip the toggle off after launch day.
 *
 * Returning a single struct from this helper keeps the four call
 * sites (PreorderBanner, ProductActions desktop CTA, MobileActions
 * sticky CTA, JSON-LD availability) in lockstep — there's exactly
 * one place the rules live.
 */

export type PreorderState = {
  /** True when the product should display pre-order UX. */
  isPreorder: boolean
  /** Parsed launch date; null when the admin didn't supply one. */
  launchDate: Date | null
  /** Whether the launch date is in the past (i.e. product is now live). */
  hasLaunched: boolean
  /** Optional admin-supplied message; null falls back to a default. */
  message: string | null
}

function parseBool(raw: any): boolean {
  if (raw === true) return true
  if (typeof raw === "string") {
    const v = raw.trim().toLowerCase()
    return v === "true" || v === "1" || v === "yes" || v === "on"
  }
  return false
}

function parseDate(raw: any): Date | null {
  if (!raw) return null
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw
  if (typeof raw === "string" || typeof raw === "number") {
    const d = new Date(raw)
    return Number.isNaN(d.getTime()) ? null : d
  }
  return null
}

/**
 * Inspect a product's metadata blob and return its pre-order state.
 *
 * Safe to call with `null` / `undefined` / non-object input — the
 * function always returns a fully-populated struct so call sites
 * can destructure without null guards.
 */
export function getPreorderState(metadata: any): PreorderState {
  if (!metadata || typeof metadata !== "object") {
    return { isPreorder: false, launchDate: null, hasLaunched: false, message: null }
  }
  const open = parseBool(metadata.preorder_open)
  const launchDate = parseDate(metadata.launch_date)
  const message =
    typeof metadata.preorder_message === "string" && metadata.preorder_message.trim()
      ? metadata.preorder_message.trim()
      : null

  const hasLaunched = !!launchDate && launchDate.getTime() <= Date.now()

  // We DON'T require a launch_date for `isPreorder` — admins can run
  // an open-ended pre-order window with the toggle alone — but we DO
  // auto-disable pre-order UX once the launch date has passed so the
  // shopper sees regular CTAs without admin intervention.
  const isPreorder = open && !hasLaunched

  return { isPreorder, launchDate, hasLaunched, message }
}
