"use client"

import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Avatar, {
  getAvatarPropsFromCustomer,
} from "@modules/common/components/avatar"
import { useParams, usePathname, useRouter } from "next/navigation"

type Props = {
  customer: HttpTypes.StoreCustomer
  loyaltyBalance: number
}

/**
 * Mobile-only sticky top bar for the account section.
 *
 * Mimics native app patterns (Daraz / Foodpanda / Naheed):
 *   • Back chevron on sub-pages, hamburger-style avatar on /account.
 *   • Centered greeting truncated to a single line.
 *   • Loyalty points pill on the right — tap to /account/loyalty.
 *
 * Stays sticky at the top so the user always has the points balance
 * visible (matters for the redemption-at-checkout flow we're building
 * out — same balance everywhere).
 *
 * Hidden on `>= small` viewports; the desktop layout uses a sidebar
 * profile card instead.
 */
export default function AccountMobileTopBar({ customer, loyaltyBalance }: Props) {
  const router = useRouter()
  const pathname = usePathname() || ""
  const { countryCode } = useParams() as { countryCode?: string }

  // Strip /pk prefix so the comparison works regardless of the
  // middleware rewrite Medusa storefront does for the country code.
  const cleanRoute = countryCode
    ? pathname.replace(new RegExp(`^/${countryCode}`), "") || "/"
    : pathname.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/"

  const isRoot = cleanRoute === "/account" || cleanRoute === "/account/"

  const greeting = customer.first_name
    ? `Hi, ${customer.first_name}`
    : "My Account"

  return (
    <header
      className="small:hidden sticky top-0 z-40 bg-bg/95 backdrop-blur supports-[backdrop-filter]:bg-bg/80 border-b border-line"
      data-testid="account-mobile-topbar"
    >
      <div className="flex items-center gap-3 h-14 px-4">
        {/* Left: back arrow on sub-pages, avatar on /account */}
        {isRoot ? (
          <span className="shrink-0">
            <Avatar
              size={36}
              {...getAvatarPropsFromCustomer(customer)}
              bordered
            />
          </span>
        ) : (
          <button
            type="button"
            onClick={() => router.back()}
            aria-label="Go back"
            className="shrink-0 -ml-1.5 inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface text-ink/80 hover:text-ink transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink/40"
          >
            <i className="ph-bold ph-caret-left text-lg" aria-hidden />
          </button>
        )}

        {/* Center: greeting / page name */}
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold text-ink truncate leading-tight">
            {isRoot ? greeting : pageTitleFromPath(cleanRoute)}
          </p>
          {isRoot && (
            <p className="text-[10px] text-ink/45 truncate leading-tight">
              {customer.email}
            </p>
          )}
        </div>

        {/* Right: loyalty pill */}
        <LocalizedClientLink
          href="/account/loyalty"
          className="shrink-0 inline-flex items-center gap-1.5 h-8 rounded-full bg-surface border border-line hover:border-ink px-3 transition-colors"
          aria-label={`${loyaltyBalance} loyalty points`}
        >
          <i className="ph-fill ph-coin text-[14px] text-yellow-500" aria-hidden />
          <span className="text-[12px] font-bold text-ink leading-none tabular-nums">
            {loyaltyBalance.toLocaleString()}
          </span>
        </LocalizedClientLink>
      </div>
    </header>
  )
}

/**
 * Map an account sub-route to a friendly page title for the top bar.
 * Falls back to a Title-cased version of the last segment so newly
 * added routes still render a sensible label without code changes.
 */
function pageTitleFromPath(path: string): string {
  if (path.startsWith("/account/orders/details")) return "Order details"
  if (path.startsWith("/account/orders")) return "My orders"
  if (path.startsWith("/account/profile")) return "Profile"
  if (path.startsWith("/account/addresses")) return "Addresses"
  if (path.startsWith("/account/loyalty")) return "Loyalty points"
  if (path.startsWith("/account/setup")) return "Set up your account"
  const last = path.split("/").filter(Boolean).pop() || "Account"
  return last.charAt(0).toUpperCase() + last.slice(1).replace(/-/g, " ")
}
