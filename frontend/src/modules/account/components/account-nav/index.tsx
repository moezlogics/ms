"use client"

import { useParams, usePathname } from "next/navigation"
import { useEffect, useRef } from "react"

import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { HttpTypes } from "@medusajs/types"
import { signout } from "@lib/data/customer"
import Avatar, {
  getAvatarPropsFromCustomer,
} from "@modules/common/components/avatar"

/**
 * Account section navigation — renders three different shapes from the
 * same data source so the layout can compose them where it needs them.
 *
 *   • `desktop`       → vertical icon list + profile mini-card + sign-out.
 *                        Lives in the left rail on `>= small`.
 *   • `mobile-pills`  → horizontal scrolling chip rail of sub-pages.
 *                        Sticks below the mobile top bar.
 *   • `mobile-list`   → legacy full-width list (kept for back-compat
 *                        in case any page still embeds it; not used by
 *                        the new layout).
 *
 * One source of truth (`NAV_ITEMS`) means new sections only need a
 * single line added here.
 */
type Variant = "desktop" | "mobile-pills" | "mobile-list"

type Props = {
  customer: HttpTypes.StoreCustomer | null
  loyaltyBalance?: number
  variant?: Variant
}

type NavItem = {
  href: string
  label: string
  /** Phosphor icon class — `ph` for outline, `ph-fill` for active. */
  icon: string
  testId?: string
  /** When true, a `>` prefix on the route also matches this item active. */
  matchPrefix?: boolean
}

const NAV_ITEMS: NavItem[] = [
  {
    href: "/account",
    label: "Overview",
    icon: "ph-house-line",
    testId: "overview-link",
  },
  {
    href: "/account/orders",
    label: "Orders",
    icon: "ph-package",
    testId: "orders-link",
    matchPrefix: true,
  },
  {
    href: "/account/profile",
    label: "Profile",
    icon: "ph-user",
    testId: "profile-link",
    matchPrefix: true,
  },
  {
    href: "/account/addresses",
    label: "Addresses",
    icon: "ph-map-pin",
    testId: "addresses-link",
    matchPrefix: true,
  },
  {
    href: "/account/loyalty",
    label: "Loyalty",
    icon: "ph-coin",
    testId: "loyalty-link",
    matchPrefix: true,
  },
]

const AccountNav = ({
  customer,
  loyaltyBalance = 0,
  variant = "desktop",
}: Props) => {
  const route = usePathname() || ""
  const { countryCode } = useParams() as { countryCode?: string }
  const cleanRoute = countryCode
    ? route.replace(new RegExp(`^/${countryCode}`), "") || "/"
    : route.replace(/^\/[a-z]{2}(?=\/|$)/, "") || "/"

  const isActive = (item: NavItem) => {
    if (cleanRoute === item.href) return true
    if (item.matchPrefix && cleanRoute.startsWith(item.href + "/")) return true
    return false
  }

  const handleLogout = async () => {
    await signout(countryCode || "us")
  }

  if (variant === "mobile-pills") {
    return <MobilePills items={NAV_ITEMS} isActive={isActive} />
  }

  if (variant === "mobile-list") {
    return (
      <MobileList
        items={NAV_ITEMS}
        isActive={isActive}
        customer={customer}
        onLogout={handleLogout}
      />
    )
  }

  return (
    <DesktopRail
      items={NAV_ITEMS}
      isActive={isActive}
      customer={customer}
      loyaltyBalance={loyaltyBalance}
      onLogout={handleLogout}
    />
  )
}

/* ────────────────────────────────────────────────────────────── */
/* Desktop rail                                                  */
/* ────────────────────────────────────────────────────────────── */

const DesktopRail = ({
  items,
  isActive,
  customer,
  loyaltyBalance,
  onLogout,
}: {
  items: NavItem[]
  isActive: (i: NavItem) => boolean
  customer: HttpTypes.StoreCustomer | null
  loyaltyBalance: number
  onLogout: () => void
}) => {
  return (
    <nav
      aria-label="Account navigation"
      className="rounded-2xl bg-bg border border-line p-4 flex flex-col gap-4"
      data-testid="account-nav"
    >
      {/* Profile mini-card. Uses the shared <Avatar> component so the
          uploaded photo / gender silhouette here matches the avatar
          shown in the dashboard hero, mobile top-bar, reviews, etc.
          A previous revision rolled its own initials chip which made
          the same customer look "different on every screen". */}
      {customer && (
        <div className="flex items-center gap-3 px-1 py-1">
          <Avatar
            size={40}
            {...getAvatarPropsFromCustomer(customer)}
          />
          <div className="min-w-0">
            <p className="text-[13px] font-semibold text-ink truncate leading-tight">
              {customer.first_name
                ? `${customer.first_name} ${customer.last_name || ""}`.trim()
                : "Welcome"}
            </p>
            <p className="text-[11px] text-ink/50 truncate leading-tight">
              {customer.email}
            </p>
          </div>
        </div>
      )}

      {/* Loyalty mini-pill */}
      <LocalizedClientLink
        href="/account/loyalty"
        className="flex items-center justify-between gap-2 rounded-xl bg-surface/60 hover:bg-surface px-3 py-2 transition-colors"
        aria-label={`${loyaltyBalance} loyalty points`}
      >
        <span className="flex items-center gap-2 min-w-0">
          <i className="ph-fill ph-coin text-base text-yellow-500" aria-hidden />
          <span className="text-[11px] font-medium text-ink/60">Points</span>
        </span>
        <span className="text-sm font-bold text-ink tabular-nums">
          {loyaltyBalance.toLocaleString()}
        </span>
      </LocalizedClientLink>

      {/* Nav links */}
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isActive(item)
          return (
            <li key={item.href}>
              <LocalizedClientLink
                href={item.href}
                data-testid={item.testId}
                className={`group flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium transition-colors ${
                  active
                    ? "bg-ink text-bg"
                    : "text-ink/75 hover:text-ink hover:bg-surface"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <i
                  className={`${active ? "ph-fill" : "ph"} ${item.icon} text-base shrink-0`}
                  aria-hidden
                />
                <span>{item.label}</span>
              </LocalizedClientLink>
            </li>
          )
        })}
      </ul>

      {/* Sign out */}
      <button
        type="button"
        onClick={onLogout}
        data-testid="logout-button"
        className="mt-auto flex items-center gap-3 px-3 py-2.5 rounded-xl text-[13px] font-medium text-ink/70 hover:text-rose-600 hover:bg-rose-50 transition-colors"
      >
        <i className="ph ph-sign-out text-base shrink-0" aria-hidden />
        <span>Sign out</span>
      </button>
    </nav>
  )
}

/* ────────────────────────────────────────────────────────────── */
/* Mobile sticky pill rail                                       */
/* ────────────────────────────────────────────────────────────── */

const MobilePills = ({
  items,
  isActive,
}: {
  items: NavItem[]
  isActive: (i: NavItem) => boolean
}) => {
  const railRef = useRef<HTMLDivElement | null>(null)

  // Auto-scroll the active pill into view on route change so the
  // currently-selected sub-page is always visible after navigation.
  useEffect(() => {
    const rail = railRef.current
    if (!rail) return
    const active = rail.querySelector<HTMLElement>('[data-active="true"]')
    if (active) {
      active.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      })
    }
  }, [items, isActive])

  return (
    <nav
      ref={railRef}
      aria-label="Account sub-pages"
      data-testid="mobile-account-nav"
      className="flex gap-1.5 overflow-x-auto px-3 py-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
    >
      {items.map((item) => {
        const active = isActive(item)
        return (
          <LocalizedClientLink
            key={item.href}
            href={item.href}
            data-testid={item.testId}
            data-active={active}
            className={`shrink-0 inline-flex items-center gap-1.5 h-8 rounded-full px-3 text-[12px] font-semibold transition-colors ${
              active
                ? "bg-ink text-bg"
                : "bg-bg border border-line text-ink/75 hover:text-ink hover:border-ink"
            }`}
            aria-current={active ? "page" : undefined}
          >
            <i
              className={`${active ? "ph-fill" : "ph"} ${item.icon} text-[13px]`}
              aria-hidden
            />
            {item.label}
          </LocalizedClientLink>
        )
      })}
    </nav>
  )
}

/* ────────────────────────────────────────────────────────────── */
/* Legacy mobile list (kept for back-compat)                     */
/* ────────────────────────────────────────────────────────────── */

const MobileList = ({
  items,
  isActive,
  customer,
  onLogout,
}: {
  items: NavItem[]
  isActive: (i: NavItem) => boolean
  customer: HttpTypes.StoreCustomer | null
  onLogout: () => void
}) => (
  <ul className="flex flex-col" data-testid="mobile-account-list">
    {items.map((item) => {
      const active = isActive(item)
      return (
        <li key={item.href}>
          <LocalizedClientLink
            href={item.href}
            data-testid={item.testId}
            className={`flex items-center justify-between px-5 py-4 border-b border-line text-[14px] ${
              active ? "text-ink font-semibold" : "text-ink/75"
            }`}
          >
            <span className="flex items-center gap-3">
              <i className={`ph ${item.icon} text-lg`} aria-hidden />
              {item.label}
            </span>
            <i className="ph ph-caret-right text-xs text-ink/40" aria-hidden />
          </LocalizedClientLink>
        </li>
      )
    })}
    {customer && (
      <li>
        <button
          type="button"
          onClick={onLogout}
          data-testid="logout-button"
          className="w-full flex items-center justify-between px-5 py-4 border-b border-line text-[14px] text-rose-600"
        >
          <span className="flex items-center gap-3">
            <i className="ph ph-sign-out text-lg" aria-hidden />
            Sign out
          </span>
          <i className="ph ph-caret-right text-xs text-rose-600/50" aria-hidden />
        </button>
      </li>
    )}
  </ul>
)

export default AccountNav
