// User-specific page - opt out of static prerender.
export const dynamic = "force-dynamic"
import { Metadata } from "next"

import OrderOverview from "@modules/account/components/order-overview"
import AccountPageHeader from "@modules/account/components/page-header"
import { notFound, redirect } from "next/navigation"
import { listOrders } from "@lib/data/orders"
import Divider from "@modules/common/components/divider"
import TransferRequestForm from "@modules/account/components/transfer-request-form"

export const metadata: Metadata = {
  title: "Orders",
  description: "Overview of your previous orders.",
  robots: { index: false, follow: false },
}

export default async function Orders() {
  const orders = await listOrders()

  if (!orders) {
    redirect("/account")
  }

  return (
    <div className="w-full" data-testid="orders-page-wrapper">
      <AccountPageHeader
        icon="ph-package"
        title="My orders"
        subtitle="View your previous orders and request returns or exchanges if needed."
      />
      <div>
        <OrderOverview orders={orders} />
        <Divider className="my-12" />
        <TransferRequestForm />
      </div>
    </div>
  )
}
