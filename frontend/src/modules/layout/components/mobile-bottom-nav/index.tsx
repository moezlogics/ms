import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import MobileBottomNavClient from "./client"

/**
 * Mobile-only app-style bottom tab bar.
 *
 * Server component: pre-fetches the lightweight pieces the bar needs
 * (cart line-item count, signed-in flag) so the client bundle stays
 * trim and the badge is correct on first paint — no flicker.
 *
 * Rendering / layout responsibilities live in `./client.tsx`, which
 * is the actual interactive bar with `usePathname()` highlights and
 * the animated active pill.
 */
export default async function MobileBottomNav() {
  const [cart, customer] = await Promise.all([
    retrieveCart().catch(() => null),
    retrieveCustomer().catch(() => null),
  ])

  const itemCount =
    cart?.items?.reduce((sum: number, i: any) => sum + (i?.quantity || 0), 0) ||
    0

  return (
    <MobileBottomNavClient
      cartCount={itemCount}
      isSignedIn={Boolean(customer)}
    />
  )
}
