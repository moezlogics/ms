"use client"

import { useUserData } from "@lib/context/user-data-context"
import CartDropdown from "../cart-dropdown"

/**
 * Header cart button. Was a server component that read the cart cookie on
 * every render — which forced every page dynamic and broke ISR. Now reads
 * the client-hydrated cart from UserDataProvider (badge appears right
 * after mount; the icon itself is in the static HTML).
 */
export default function CartButton() {
  const { cart } = useUserData()
  return <CartDropdown cart={cart} />
}
