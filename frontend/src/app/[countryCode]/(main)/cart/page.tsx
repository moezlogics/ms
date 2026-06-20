import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getCustomerLoyalty } from "@lib/data/loyalty"
import CartTemplate from "@modules/cart/templates"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Cart",
  description: "Review the items in your cart before checkout.",
  robots: { index: false, follow: false },
}

export default async function Cart() {
  const cart = await retrieveCart().catch((error) => {
    console.error(error)
    return notFound()
  })

  const customer = await retrieveCustomer()

  // Best-effort loyalty fetch. `null` for guests so the redeem widget
  // shows the sign-in CTA. Failure is non-fatal — the cart still loads.
  const loyalty = customer
    ? await getCustomerLoyalty().catch(() => null)
    : null

  return (
    <CartTemplate
      cart={cart}
      customer={customer}
      loyaltyBalance={customer ? loyalty?.balance ?? 0 : null}
    />
  )
}
