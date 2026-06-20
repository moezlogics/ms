import { retrieveCart } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { getCustomerLoyalty } from "@lib/data/loyalty"
import PaymentWrapper from "@modules/checkout/components/payment-wrapper"
import CheckoutForm from "@modules/checkout/templates/checkout-form"
import CheckoutSummary from "@modules/checkout/templates/checkout-summary"
import CheckoutTracker from "@modules/analytics/checkout-tracker"
import { Metadata } from "next"
import { notFound } from "next/navigation"

export const metadata: Metadata = {
  title: "Checkout",
  description: "Complete your purchase securely.",
  // Never index transactional surfaces — every checkout URL is
  // user-specific and short-lived.
  robots: {
    index: false,
    follow: false,
    nocache: true,
    googleBot: { index: false, follow: false, noimageindex: true },
  },
}

export default async function Checkout() {
  const cart = await retrieveCart()

  if (!cart) {
    return notFound()
  }

  const customer = await retrieveCustomer()

  const loyalty = customer
    ? await getCustomerLoyalty().catch(() => null)
    : null

  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] container-anvogue gap-x-8 gap-y-6 py-6 md:py-8">
      <CheckoutTracker cart={cart} />
      <PaymentWrapper cart={cart}>
        <CheckoutForm cart={cart} customer={customer} />
      </PaymentWrapper>
      <CheckoutSummary cart={cart} loyaltyBalance={customer ? loyalty?.balance ?? 0 : null} />
    </div>
  )
}
