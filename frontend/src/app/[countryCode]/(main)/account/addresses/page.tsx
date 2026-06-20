// User-specific page - opt out of static prerender.
export const dynamic = "force-dynamic"
import { Metadata } from "next"
import { notFound, redirect } from "next/navigation"

import AddressBook from "@modules/account/components/address-book"
import AccountPageHeader from "@modules/account/components/page-header"

import { getRegion } from "@lib/data/regions"
import { retrieveCustomer } from "@lib/data/customer"

export const metadata: Metadata = {
  title: "Addresses",
  description: "View your addresses",
  robots: { index: false, follow: false },
}

export default async function Addresses(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params
  const { countryCode } = params
  const customer = await retrieveCustomer()
  const region = await getRegion(countryCode)

  if (!customer) {
    redirect("/account")
  }

  if (!region) {
    notFound()
  }

  return (
    <div className="w-full" data-testid="addresses-page-wrapper">
      <AccountPageHeader
        icon="ph-map-pin"
        title="Your address"
        subtitle="Where we deliver your orders. The same address is used for billing — keep it up to date for one-tap checkout."
      />
      <AddressBook customer={customer} region={region} />
    </div>
  )
}
