"use server"

import { retrieveCart } from "./cart"
import { getAuthHeaders } from "./cookies"

/**
 * Lightweight cart/account summary for client components.
 *
 * Catalog pages are ISR-cached, so their server-rendered HTML is the
 * ANONYMOUS version (cart badge 0, signed-out icon) for everyone. Client
 * components call this server action after mount to self-correct with the
 * real per-user state — the request runs per-user (server action = POST,
 * never cached), so cookies are available here even though the page HTML
 * came from the shared ISR cache.
 *
 * Kept intentionally tiny (id + item quantities only) so the round-trip
 * stays cheap on mobile.
 */
export async function getCartSummary(): Promise<{
  count: number
  isSignedIn: boolean
}> {
  try {
    const [cart, auth] = await Promise.all([
      retrieveCart(undefined, "id,items.quantity").catch(() => null),
      getAuthHeaders(),
    ])
    const count =
      cart?.items?.reduce(
        (sum: number, i: any) => sum + (i?.quantity || 0),
        0
      ) || 0
    return { count, isSignedIn: "authorization" in (auth as object) }
  } catch {
    return { count: 0, isSignedIn: false }
  }
}
