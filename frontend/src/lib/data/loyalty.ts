"use server"

import { getAuthHeaders } from "./cookies"

const BACKEND_URL =
  process.env.MEDUSA_BACKEND_URL || "http://localhost:8022"

const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

export type LoyaltyTransaction = {
  id: string
  customer_id: string
  points: number
  balance_after: number
  kind: "earn" | "redeem" | "adjust" | "refund"
  order_id: string | null
  cart_id: string | null
  description: string | null
  created_at: string
}

export type LoyaltyData = {
  balance: number
  transactions: LoyaltyTransaction[]
}

/**
 * Fetch the authenticated customer's loyalty balance + transaction
 * history. Server-only — uses the auth cookie set by the Medusa SDK.
 */
export async function getCustomerLoyalty(): Promise<LoyaltyData | null> {
  const auth = await getAuthHeaders()
  if (!auth) return null

  try {
    const res = await fetch(
      `${BACKEND_URL}/store/customers/me/loyalty-transactions`,
      {
        headers: {
          ...(auth as Record<string, string>),
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        cache: "no-store",
      }
    )
    if (!res.ok) return null
    return (await res.json()) as LoyaltyData
  } catch {
    return null
  }
}

export type ClaimCompletionRewardResult = {
  rewarded: boolean
  points_granted: number
  balance: number
  completion: number
  already_claimed: boolean
}

/**
 * Idempotent: claim the one-time 10-point bonus for finishing the
 * profile. Storefront calls this on every dashboard mount AFTER the
 * user has saved their profile — the backend gates on metadata, so
 * repeat calls are no-ops. When `rewarded` flips true the dashboard
 * pops the celebratory toast.
 */
export async function claimCompletionReward(): Promise<ClaimCompletionRewardResult | null> {
  const auth = await getAuthHeaders()
  if (!auth) return null

  try {
    const res = await fetch(
      `${BACKEND_URL}/store/customers/me/claim-completion-reward`,
      {
        method: "POST",
        headers: {
          ...(auth as Record<string, string>),
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        cache: "no-store",
      }
    )
    if (!res.ok) return null
    return (await res.json()) as ClaimCompletionRewardResult
  } catch {
    return null
  }
}

export type CartLoyaltyApplyResult = {
  cart: any
  message?: string
}

export type LoyaltyMax = {
  /** Customer's full point balance. */
  balance: number
  /** Maximum currency amount they can redeem on this specific cart. */
  max_amount: number
  /** Cart subtotal (in major units) used to compute the cap. */
  subtotal: number
  /** Server-side cap ratio (e.g. 0.5 = 50% of subtotal). */
  ratio: number
  /** ISO currency code, e.g. "pkr". */
  currency_code: string
}

/**
 * Fetch the maximum amount the customer can redeem on this cart. Used
 * by the cart/checkout slider to set its upper bound. Backend enforces
 * the same cap server-side so a tampered client can't over-redeem.
 */
export async function getLoyaltyMax(
  cartId: string
): Promise<LoyaltyMax | null> {
  const auth = await getAuthHeaders()
  if (!auth) return null

  try {
    const res = await fetch(
      `${BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}/loyalty-points/max`,
      {
        headers: {
          ...(auth as Record<string, string>),
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        cache: "no-store",
      }
    )
    if (!res.ok) return null
    return (await res.json()) as LoyaltyMax
  } catch {
    return null
  }
}

/**
 * Apply a loyalty redemption to the cart.
 *
 * `amount` is the cash-equivalent value to discount (e.g. 250 = "Rs 250
 * off"). Omit it to redeem the maximum the backend allows. The backend
 * is the source of truth — it validates against the customer's balance
 * and the 50%-of-subtotal cap, and returns an error message if either
 * is breached.
 */
export async function applyLoyaltyToCart(
  cartId: string,
  amount?: number
): Promise<CartLoyaltyApplyResult | null> {
  const auth = await getAuthHeaders()
  if (!auth) return null

  try {
    const res = await fetch(
      `${BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}/loyalty-points`,
      {
        method: "POST",
        headers: {
          ...(auth as Record<string, string>),
          "x-publishable-api-key": PUBLISHABLE_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(amount && amount > 0 ? { amount } : {}),
        cache: "no-store",
      }
    )
    if (!res.ok) return { cart: null, message: await safeErrorMessage(res) }
    return (await res.json()) as CartLoyaltyApplyResult
  } catch {
    return null
  }
}

/** Remove a previously-applied loyalty redemption from a cart. */
export async function removeLoyaltyFromCart(
  cartId: string
): Promise<CartLoyaltyApplyResult | null> {
  const auth = await getAuthHeaders()
  if (!auth) return null

  try {
    const res = await fetch(
      `${BACKEND_URL}/store/carts/${encodeURIComponent(cartId)}/loyalty-points`,
      {
        method: "DELETE",
        headers: {
          ...(auth as Record<string, string>),
          "x-publishable-api-key": PUBLISHABLE_KEY,
        },
        cache: "no-store",
      }
    )
    if (!res.ok) return { cart: null, message: await safeErrorMessage(res) }
    return (await res.json()) as CartLoyaltyApplyResult
  } catch {
    return null
  }
}

/**
 * Extract a user-friendly error message from a failed HTTP response.
 * The backend now returns `{ message: "..." }` JSON; older error
 * shapes may also include `{ errors }` or plain-text bodies.
 */
async function safeErrorMessage(res: Response): Promise<string> {
  try {
    const text = await res.text()
    try {
      const json = JSON.parse(text)
      return json?.message || json?.error || json?.errors?.[0]?.message || text
    } catch {
      // Not valid JSON — return raw text (could be HTML error page)
      return text || `Error ${res.status}`
    }
  } catch {
    return `Request failed (${res.status})`
  }
}

