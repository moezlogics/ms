import React from "react"

import AccountNav from "../components/account-nav"
import AccountMobileTopBar from "../components/account-mobile-top-bar"
import { HttpTypes } from "@medusajs/types"

interface AccountLayoutProps {
  customer: HttpTypes.StoreCustomer | null
  children: React.ReactNode
  /**
   * Customer's current loyalty balance, fetched server-side in the
   * route segment layout. Lives in the mobile top bar's points pill
   * and the desktop sidebar's profile card. 0 for guests.
   */
  loyaltyBalance?: number
}

/**
 * Account section shell.
 *
 * Two completely different layouts depending on viewport:
 *
 * Mobile (< small): full-bleed, app-like.
 *   • Sticky top bar with avatar + name + points pill.
 *   • No sidebar — sub-page navigation is the horizontal pill rail
 *     inside <AccountNav />, also sticky-below the top bar.
 *   • Children render edge-to-edge with their own padding.
 *
 * Desktop (>= small): classic two-column.
 *   • Left rail (240px) — sticky icon nav, profile mini-card on top,
 *     sign-out at the bottom.
 *   • Right column — children, max-width capped, generous padding.
 *
 * The whole shell uses theme tokens (`bg-bg`, `bg-surface`, `text-ink`,
 * `border-line`, `--color-accent`) so any branded palette inherits.
 * The legacy "Got questions?" footer block has been retired — it's
 * better surfaced from the global footer, not duplicated here.
 */
const AccountLayout: React.FC<AccountLayoutProps> = ({
  customer,
  children,
  loyaltyBalance = 0,
}) => {
  return (
    <div className="bg-surface/40 min-h-screen" data-testid="account-page">
      {/* ── Mobile sticky top bar (signed-in only) ─────────── */}
      {customer && (
        <AccountMobileTopBar
          customer={customer}
          loyaltyBalance={loyaltyBalance}
        />
      )}

      <div className="content-container max-w-6xl mx-auto small:py-10">
        <div className="grid grid-cols-1 small:grid-cols-[240px_1fr] small:gap-8">
          {/* ── Desktop sidebar ─────────────────────────────── */}
          {customer && (
            <aside className="hidden small:block">
              <div className="sticky top-24">
                <AccountNav
                  customer={customer}
                  loyaltyBalance={loyaltyBalance}
                  variant="desktop"
                />
              </div>
            </aside>
          )}

          {/* ── Main column ─────────────────────────────────── */}
          <main className="min-w-0">
            {/* Mobile sub-page pill nav (signed-in only) */}
            {customer && (
              <div className="small:hidden sticky top-[57px] z-30 bg-surface/80 backdrop-blur supports-[backdrop-filter]:bg-surface/70 border-b border-line">
                <AccountNav
                  customer={customer}
                  loyaltyBalance={loyaltyBalance}
                  variant="mobile-pills"
                />
              </div>
            )}

            <div className="px-4 py-4 small:px-0 small:py-0">{children}</div>
          </main>
        </div>
      </div>
    </div>
  )
}

export default AccountLayout
