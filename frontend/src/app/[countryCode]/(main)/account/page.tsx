import { Metadata } from "next"

import OverviewModern from "@modules/account/components/overview-modern"
import GuestDashboard from "@modules/account/components/guest-dashboard"
import { retrieveCustomer } from "@lib/data/customer"
import { listOrders } from "@lib/data/orders"
import { claimCompletionReward, getCustomerLoyalty } from "@lib/data/loyalty"

/**
 * `/account` — combined login + dashboard entry point.
 *
 * This file replaces the previous parallel-route setup
 * (`@dashboard` + `@login` slots) which triggered a Next.js 15
 * production-build crash:
 *
 *   TypeError: Cannot read properties of undefined (reading 'entryCSSFiles')
 *
 * during the static-export phase. The bug fires while collecting
 * CSS for parallel route slots, and persists even with
 * `force-dynamic` flags and the required `default.tsx` fallbacks
 * in place. The simplest reliable workaround is to drop parallel
 * routes entirely and decide at runtime which UI to show.
 *
 * The route is fully dynamic by virtue of reading the auth cookie
 * via `retrieveCustomer()`.
 */
export const metadata: Metadata = {
  title: "Account",
  description: "Overview of your account activity.",
  robots: { index: false, follow: false },
}

export default async function AccountPage() {
  const customer = await retrieveCustomer().catch(() => null)

  if (!customer) {
    return <GuestDashboard />
  }

  // Authenticated dashboard — pull orders + loyalty in parallel.
  // Both fetches are best-effort: a failure on either still renders.
  const [orders, loyalty, reward] = await Promise.all([
    listOrders().catch(() => null),
    getCustomerLoyalty().catch(() => null),
    // Idempotent: credits 10 pts the first time the user lands here
    // with a fully-completed profile, no-ops thereafter. The response
    // tells us whether *this* render is the one that flipped the
    // flag, so the toast fires exactly once across the account.
    claimCompletionReward().catch(() => null),
  ])

  const balance = reward?.balance ?? loyalty?.balance ?? 0
  const recentlyAwarded = reward?.rewarded
    ? { points: reward.points_granted }
    : null

  return (
    <OverviewModern
      customer={customer}
      orders={orders}
      loyaltyBalance={balance}
      recentlyAwarded={recentlyAwarded}
    />
  )
}
