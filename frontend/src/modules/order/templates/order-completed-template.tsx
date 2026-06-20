import { cookies as nextCookies } from "next/headers"

import CartTotals from "@modules/common/components/cart-totals"
import OnboardingCta from "@modules/order/components/onboarding-cta"
import ShippingDetails from "@modules/order/components/shipping-details"
import PaymentDetails from "@modules/order/components/payment-details"
import OrderMapDisplay from "@modules/order/components/order-map-display"
import PurchaseTracker from "@modules/analytics/purchase-tracker"
import OrderTracker from "@modules/order/components/order-tracker"
import GuestOrderSync from "@modules/order/components/guest-order-sync"
import CopyButton from "@modules/order/components/copy-button"
import Thumbnail from "@modules/products/components/thumbnail"
import LineItemOptions from "@modules/common/components/line-item-options"
import LineItemPrice from "@modules/common/components/line-item-price"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { getSiteSettings, resolveProductCardAspectClass } from "@lib/data/site-settings"

type OrderCompletedTemplateProps = {
  order: HttpTypes.StoreOrder
}

export default async function OrderCompletedTemplate({
  order,
}: OrderCompletedTemplateProps) {
  const cookies = await nextCookies()
  const settings = await getSiteSettings()
  const aspectClass = resolveProductCardAspectClass(settings)

  const isOnboarding = cookies.get("_medusa_onboarding")?.value === "true"
  const meta = (order.metadata || {}) as Record<string, any>

  return (
    <div className="py-8 md:py-16 min-h-[calc(100vh-64px)] bg-bg/40">
      <div className="max-w-6xl w-full mx-auto px-4 flex flex-col gap-6">
        {isOnboarding && <OnboardingCta orderId={order.id} />}
        <PurchaseTracker order={order} />
        <GuestOrderSync orderId={order.id} />

        {/* ── Sleek CSS Animation definitions ── */}
        <style>{`
          @keyframes draw {
            to {
              stroke-dashoffset: 0;
            }
          }
        `}</style>

        {/* ── Modern Success Card Header ── */}
        <div className="w-full bg-surface border border-line/35 rounded-3xl p-6 md:p-8 shadow-sm flex flex-col items-center text-center animate-enter">
          <div className="relative flex items-center justify-center mb-4">
            {/* Soft ambient success glow */}
            <span className="absolute inline-flex h-16 w-16 rounded-full bg-success/10 animate-pulse" />
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-success to-emerald-500 flex items-center justify-center shadow-md shadow-success/20 z-10">
              <svg className="w-7 h-7 text-white stroke-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={3} 
                  d="M5 13l4 4L19 7" 
                  className="animate-[draw_0.6s_ease-out_forwards_0.15s]" 
                  style={{ strokeDasharray: 50, strokeDashoffset: 50 }} 
                />
              </svg>
            </div>
          </div>
          <h1
            className="text-2xl md:text-3xl font-extrabold tracking-tight text-ink mb-2"
            data-testid="order-complete-heading"
          >
            Order Confirmed!
          </h1>
          <p className="text-xs md:text-sm text-ink/50 max-w-sm leading-relaxed">
            Thank you for shopping! We have received your order and our dispatch team is already preparing it.
          </p>
        </div>

        {/* ── Two Column Layout Grid ── */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start" data-testid="order-complete-container">
          
          {/* Left Column: Status, Shipping & Payment, Map, Support */}
          <div className="lg:col-span-7 space-y-6">
            
            {/* Order Progress / Status Tracker */}
            <OrderTracker order={order} />

            {/* Combined Shipping & Payment Card */}
            <div className="w-full bg-surface border border-line/35 rounded-3xl p-5 sm:p-6 shadow-sm space-y-6">
              <ShippingDetails order={order} hideHeading={false} />
              <div className="h-px bg-line/25 w-full" />
              <PaymentDetails order={order} hideHeading={false} />
            </div>

            {/* Map Display (Only if lat/lng are supplied) */}
            {meta.map_lat && meta.map_lng && (
              <div className="w-full bg-surface border border-line/35 rounded-3xl overflow-hidden shadow-sm">
                <OrderMapDisplay metadata={meta} />
              </div>
            )}

            {/* App-like Actionable Footer Card */}
            <div className="w-full bg-surface border border-line/35 rounded-3xl p-5 sm:p-6 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <h3 className="text-xs font-bold text-ink flex items-center gap-1.5">
                  <i className="ph-fill ph-question text-base text-primary" aria-hidden />
                  Need Support?
                </h3>
                <p className="text-[10px] text-ink/45 mt-0.5">
                  Have questions about deliveries, exchanges, or refunds? Contact us anytime.
                </p>
              </div>
              <div className="flex gap-2.5 w-full sm:w-auto">
                <LocalizedClientLink
                  href="/contact"
                  className="flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-bold text-ink bg-surface-alt hover:bg-surface-alt/70 border border-line/35 rounded-xl transition duration-150"
                >
                  Contact
                </LocalizedClientLink>
                <LocalizedClientLink
                  href="/contact"
                  className="flex-1 sm:flex-initial text-center px-4 py-2 text-xs font-bold text-white bg-primary hover:brightness-110 rounded-xl transition duration-150"
                >
                  Returns Policy
                </LocalizedClientLink>
              </div>
            </div>

          </div>

          {/* Right Column: Reference Info, Cart Items List, Totals Breakdown */}
          <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-24">
            
            {/* Reference Info Card */}
            <div className="w-full bg-surface border border-line/35 rounded-3xl p-5 sm:p-6 shadow-sm">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 text-xs">
                <div className="flex flex-col gap-1">
                  <span className="text-ink/40 font-bold uppercase tracking-wider text-[10px]">Order ID</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="font-bold text-ink font-mono text-[13px]">#{order.display_id}</span>
                    <CopyButton text={order.display_id.toString()} />
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-ink/40 font-bold uppercase tracking-wider text-[10px]">Order Date</span>
                  <span className="font-bold text-ink mt-1 text-[13px]">
                    {new Date(order.created_at).toLocaleDateString("en-US", {
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>

                <div className="flex flex-col gap-1">
                  <span className="text-ink/40 font-bold uppercase tracking-wider text-[10px]">Email Confirmation</span>
                  <span className="font-bold text-ink mt-1 text-[13px] truncate" title={order.email}>
                    {order.email}
                  </span>
                </div>
              </div>
            </div>

            {/* Ordered Products List Card */}
            <div className="w-full bg-surface border border-line/35 rounded-3xl p-5 sm:p-6 shadow-sm">
              <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2 border-b border-line/20 pb-3">
                <i className="ph-bold ph-package text-base text-primary" aria-hidden />
                Items In This Order ({order.items?.length || 0})
              </h3>
              <div className="divide-y divide-line/25 max-h-[320px] overflow-y-auto pr-1">
                {order.items
                  ?.sort((a, b) => ((a.created_at ?? "") > (b.created_at ?? "") ? -1 : 1))
                  .map((item) => (
                    <div key={item.id} className="py-4 flex gap-4 items-center justify-between first:pt-0 last:pb-0">
                      <div className="flex gap-3.5 items-center">
                        <div className={`w-14 rounded-xl overflow-hidden border border-line/30 shrink-0 bg-surface-alt/10 ${aspectClass}`}>
                          <Thumbnail thumbnail={item.thumbnail} size="square" aspectClass={aspectClass} />
                        </div>
                        <div className="flex flex-col min-w-0">
                          <h4 className="text-xs font-bold text-ink line-clamp-1">{item.product_title}</h4>
                          {item.variant && (
                            <LineItemOptions variant={item.variant} className="text-[10px] text-ink/45 mt-0.5" />
                          )}
                          <p className="text-[10px] text-ink/50 mt-1">
                            Qty: <span className="font-bold text-ink">{item.quantity}</span>
                          </p>
                        </div>
                      </div>
                      <div className="text-right shrink-0">
                        <LineItemPrice item={item} style="tight" currencyCode={order.currency_code} className="text-xs font-bold text-ink" />
                      </div>
                    </div>
                  ))}
              </div>
            </div>

            {/* Pricing Totals Card */}
            <div className="w-full bg-surface border border-line/35 rounded-3xl p-5 sm:p-6 shadow-sm">
              <h3 className="text-sm font-bold text-ink mb-4 flex items-center gap-2 border-b border-line/20 pb-3">
                <i className="ph-bold ph-receipt text-base text-primary" aria-hidden />
                Billing Summary
              </h3>
              <CartTotals totals={order} />
            </div>

          </div>

        </div>
      </div>
    </div>
  )
}
