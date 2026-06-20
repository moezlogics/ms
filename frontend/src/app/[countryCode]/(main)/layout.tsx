import { Metadata } from "next"

import { listCartOptions, retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getBaseURL } from "@lib/util/env"
import { StoreCartShippingOption } from "@medusajs/types"
import AnnouncementBarServer from "@modules/layout/components/announcement-bar/server"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import MobileBottomNav from "@modules/layout/components/mobile-bottom-nav"
import { getSiteSettings } from "@lib/data/site-settings"
import { CompareProvider } from "@modules/products/components/compare/context"
import CompareTray from "@modules/products/components/compare/compare-tray"
import {
  ClientFreeShippingNudge,
  ClientCartDrawer,
  ClientRecentPurchasesTicker,
  ClientCartMismatchBanner,
} from "./client-wrappers"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  const [customer, cart, settings] = await Promise.all([
    retrieveCustomer(),
    retrieveCart(),
    getSiteSettings(),
  ])

  let shippingOptions: StoreCartShippingOption[] = []

  if (cart) {
    const { shipping_options } = await listCartOptions()
    shippingOptions = shipping_options
  }

  const cartDrawerEnabled = settings.cart_drawer_enabled === "true"
  const tickerEnabled = settings.recent_purchases_ticker_enabled === "true"
  const tickerInterval = parseInt(settings.recent_purchases_ticker_interval || "30", 10)

  return (
    <CompareProvider>
      <AnnouncementBarServer />
      <Nav />
      {customer && cart && (
        <ClientCartMismatchBanner customer={customer} cart={cart} />
      )}

      {cart && (
        <ClientFreeShippingNudge
          cart={cart}
          shippingOptions={shippingOptions}
        />
      )}
      {props.children}
      <Footer />
      <MobileBottomNav />

      {/* Cart drawer — admin toggleable */}
      {cartDrawerEnabled && <ClientCartDrawer cart={cart} />}

      {/* Recent purchases social proof ticker */}
      {tickerEnabled && <ClientRecentPurchasesTicker interval={tickerInterval} />}

      <CompareTray />
    </CompareProvider>
  )
}
