"use client"

import { useUserData } from "@lib/context/user-data-context"
import MobileBottomNavClient from "./client"

/**
 * Mobile-only app-style bottom tab bar.
 *
 * Was a server component that read cart/auth cookies on every page render
 * — which forced every page dynamic and broke ISR. The bar itself is
 * static; the cart badge and signed-in highlight hydrate client-side from
 * UserDataProvider right after mount.
 */
export default function MobileBottomNav() {
  const { cart, customer } = useUserData()

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
