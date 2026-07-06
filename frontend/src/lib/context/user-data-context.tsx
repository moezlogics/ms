"use client"

/**
 * Client-side user/cart state for static (ISR) pages.
 *
 * WHY THIS EXISTS: reading auth/cart cookies during server render forced
 * every page dynamic and 500'd any ISR attempt (proven DYNAMIC_SERVER_USAGE
 * root cause). Instead, the shared page shell renders anonymously and this
 * provider fetches the per-user bits (customer, cart, shipping options)
 * AFTER mount via server actions — the standard "static shell + client
 * personalization" pattern.
 *
 * Refresh triggers:
 *  - initial mount
 *  - route change (covers post-checkout, cart page edits, login, etc.)
 *  - `CART_UPDATED_EVENT` dispatched by add-to-cart flows for an instant
 *    badge update without waiting for a navigation.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react"
import { usePathname } from "next/navigation"
import { HttpTypes, StoreCartShippingOption } from "@medusajs/types"
import { retrieveCustomer } from "@lib/data/customer"
import { listCartOptions, retrieveCart } from "@lib/data/cart"

export const CART_UPDATED_EVENT = "medusa:cart-updated"

export function notifyCartUpdated() {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(CART_UPDATED_EVENT))
  }
}

type UserDataContextType = {
  customer: HttpTypes.StoreCustomer | null
  cart: HttpTypes.StoreCart | null
  shippingOptions: StoreCartShippingOption[]
  /** false until the first client fetch resolves. */
  ready: boolean
  refreshCart: () => void
}

const UserDataContext = createContext<UserDataContextType>({
  customer: null,
  cart: null,
  shippingOptions: [],
  ready: false,
  refreshCart: () => {},
})

export const UserDataProvider = ({
  children,
}: {
  children: React.ReactNode
}) => {
  const [customer, setCustomer] = useState<HttpTypes.StoreCustomer | null>(null)
  const [cart, setCart] = useState<HttpTypes.StoreCart | null>(null)
  const [shippingOptions, setShippingOptions] = useState<
    StoreCartShippingOption[]
  >([])
  const [ready, setReady] = useState(false)
  const pathname = usePathname()
  const fetchedCustomerOnce = useRef(false)

  const refreshCart = useCallback(() => {
    retrieveCart()
      .then((c) => {
        setCart(c ?? null)
        if (c) {
          listCartOptions()
            .then((res) => setShippingOptions(res?.shipping_options ?? []))
            .catch(() => {})
        }
      })
      .catch(() => {})
      .finally(() => setReady(true))
  }, [])

  const refreshCustomer = useCallback(() => {
    retrieveCustomer()
      .then((c) => setCustomer(c ?? null))
      .catch(() => {})
  }, [])

  // Refetch on every route change: cheap (tag-cached on the server) and
  // keeps the badge/login state correct after checkout, cart edits, login.
  useEffect(() => {
    refreshCart()
    // Customer changes rarely — fetch once on mount, then only re-check
    // when navigating within /account or /order flows.
    if (
      !fetchedCustomerOnce.current ||
      /\/(account|order|checkout)(\/|$)/.test(pathname || "")
    ) {
      fetchedCustomerOnce.current = true
      refreshCustomer()
    }
  }, [pathname, refreshCart, refreshCustomer])

  useEffect(() => {
    const onCartUpdated = () => refreshCart()
    window.addEventListener(CART_UPDATED_EVENT, onCartUpdated)
    return () => window.removeEventListener(CART_UPDATED_EVENT, onCartUpdated)
  }, [refreshCart])

  return (
    <UserDataContext.Provider
      value={{ customer, cart, shippingOptions, ready, refreshCart }}
    >
      {children}
    </UserDataContext.Provider>
  )
}

export const useUserData = () => useContext(UserDataContext)
