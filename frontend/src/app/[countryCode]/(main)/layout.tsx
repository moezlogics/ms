import { Metadata } from "next"

import { getBaseURL } from "@lib/util/env"
import AnnouncementBarServer from "@modules/layout/components/announcement-bar/server"
import Footer from "@modules/layout/templates/footer"
import Nav from "@modules/layout/templates/nav"
import MobileBottomNav from "@modules/layout/components/mobile-bottom-nav"
import { getSiteSettings } from "@lib/data/site-settings"
import { CompareProvider } from "@modules/products/components/compare/context"
import CompareTray from "@modules/products/components/compare/compare-tray"
import {
  ClientRecentPurchasesTicker,
  ClientUserWidgets,
} from "./client-wrappers"

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
}

export default async function PageLayout(props: { children: React.ReactNode }) {
  // IMPORTANT: no cookies() in this layout — customer/cart hydrate
  // client-side via UserDataProvider (see ClientUserWidgets). Reading them
  // here was the proven cause of the DYNAMIC_SERVER_USAGE 500 under ISR.
  const settings = await getSiteSettings()

  const cartDrawerEnabled = settings.cart_drawer_enabled === "true"
  const tickerEnabled = settings.recent_purchases_ticker_enabled === "true"
  const tickerInterval = parseInt(settings.recent_purchases_ticker_interval || "30", 10)

  return (
    <CompareProvider>
      <AnnouncementBarServer />
      <Nav />
      {props.children}
      <Footer />
      <MobileBottomNav />

      {/* Cart mismatch banner + free-shipping nudge + cart drawer —
          per-user, hydrated client-side after mount */}
      <ClientUserWidgets cartDrawerEnabled={cartDrawerEnabled} />

      {/* Recent purchases social proof ticker */}
      {tickerEnabled && <ClientRecentPurchasesTicker interval={tickerInterval} />}

      <CompareTray />
    </CompareProvider>
  )
}
