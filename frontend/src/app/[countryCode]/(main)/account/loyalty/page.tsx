// User-specific page - opt out of static prerender.
export const dynamic = "force-dynamic"
import { Metadata } from "next"
import { getCustomerLoyalty } from "@lib/data/loyalty"
import LoyaltyOverview from "@modules/account/components/loyalty-overview"
import AccountPageHeader from "@modules/account/components/page-header"

export const metadata: Metadata = {
  title: "Loyalty Points",
  description: "Your loyalty points balance and transaction history.",
  robots: { index: false, follow: false },
}

export default async function LoyaltyPage() {
  const data = await getCustomerLoyalty()

  return (
    <div className="w-full" data-testid="loyalty-page-wrapper">
      <AccountPageHeader
        icon="ph-coin"
        title="Loyalty points"
        subtitle="Track your rewards balance and every point you've earned or redeemed."
      />
      <LoyaltyOverview data={data} />
    </div>
  )
}
