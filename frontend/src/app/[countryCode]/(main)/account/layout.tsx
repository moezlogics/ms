import { retrieveCustomer } from "@lib/data/customer"
import { getCustomerLoyalty } from "@lib/data/loyalty"
import { Toaster } from "@medusajs/ui"
import AccountLayout from "@modules/account/templates/account-layout"

/**
 * Every page under `/account/*` is user-specific: it reads the auth
 * cookie via `retrieveCustomer()`, fetches loyalty balance, orders,
 * addresses, etc. None of those have a meaningful static prerender.
 *
 * Previously this layout used parallel routes (`@dashboard` /
 * `@login`) to switch between authenticated and guest UI. That
 * pattern hit a known Next.js 15 production-build crash
 * (`Cannot read properties of undefined (reading 'entryCSSFiles')`)
 * during the static-export phase that no combination of
 * `force-dynamic` + `default.tsx` reliably suppressed. The current
 * shape is a plain `children` layout with a single decision-making
 * `page.tsx` at the root of `/account` — simpler and bug-free.
 */
export const dynamic = "force-dynamic"

export default async function AccountPageLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const customer = await retrieveCustomer().catch(() => null)
  // Loyalty balance feeds the mobile top bar's points pill. Fetched
  // here (server-side) so the request piggybacks on the SSR pass
  // and `<AccountNav />` can stay a pure client component.
  const loyalty = customer
    ? await getCustomerLoyalty().catch(() => null)
    : null

  return (
    <AccountLayout customer={customer} loyaltyBalance={loyalty?.balance ?? 0}>
      {children}
      <Toaster />
    </AccountLayout>
  )
}
