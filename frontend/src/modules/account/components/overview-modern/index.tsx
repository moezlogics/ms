import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { convertToLocale } from "@lib/util/money"
import PointsEarnedToast from "@modules/account/components/points-earned-toast"
import SignoutButton from "@modules/account/components/signout-button"
import Avatar, {
  getAvatarPropsFromCustomer,
} from "@modules/common/components/avatar"

/**
 * Minimal account dashboard.
 *
 * Design goals — coming back from a previous "everything is huge"
 * iteration:
 *   • Compact hero (~140px on desktop) with a soft accent halo, not
 *     a giant gradient block.
 *   • Cards stay tight: 14-16px padding, no oversized icons.
 *   • Setup checklist shrinks once complete (a single confirmation
 *     row instead of four ticks taking up half the screen).
 *   • Quick action chips are small + cute, not large tiles.
 *   • Recent orders is a slim list, not a table.
 *
 * Everything still uses the theme tokens so dark/branded palettes
 * just inherit.
 */

type Props = {
  customer: HttpTypes.StoreCustomer
  orders: HttpTypes.StoreOrder[] | null
  loyaltyBalance: number
  recentlyAwarded?: { points: number } | null
}

/**
 * Profile completion percentage used everywhere in the dashboard and
 * mirrored server-side in `/store/customers/me/claim-completion-reward`.
 *
 * Four weighted equally:
 *   1. email
 *   2. first + last name
 *   3. phone
 *   4. at least one address (default billing preferred)
 */
export function getProfileCompletion(
  customer: HttpTypes.StoreCustomer | null
): number {
  if (!customer) return 0
  let count = 0
  const total = 4
  if (customer.email) count++
  if (customer.first_name && customer.last_name) count++
  if (customer.phone) count++
  const addresses = customer.addresses || []
  if (
    addresses.some((a: any) => a.is_default_billing) ||
    addresses.length > 0
  )
    count++
  return Math.round((count / total) * 100)
}

type ChecklistItem = {
  done: boolean
  label: string
  href: string
}

function getChecklist(customer: HttpTypes.StoreCustomer): ChecklistItem[] {
  const addresses = customer.addresses || []
  const meta = (customer.metadata as any) || {}
  return [
    { done: !!customer.email, label: "Email", href: "/account/profile" },
    {
      done: !!(customer.first_name && customer.last_name),
      label: "Name",
      href: "/account/profile",
    },
    { done: !!customer.phone, label: "Phone", href: "/account/profile" },
    {
      done:
        addresses.some((a: any) => a.is_default_billing) ||
        addresses.length > 0,
      label: "Address",
      href: "/account/addresses",
    },
  ]
}

const OverviewModern = ({
  customer,
  orders,
  loyaltyBalance,
  recentlyAwarded,
}: Props) => {
  const completion = getProfileCompletion(customer)
  const checklist = getChecklist(customer)
  const firstName =
    customer.first_name || customer.email?.split("@")[0] || "there"
  const recentOrders = (orders || []).slice(0, 3)
  const orderCount = orders?.length || 0
  const isComplete = completion === 100

  return (
    <div className="flex flex-col gap-3 small:gap-5" data-testid="overview-page-wrapper">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        {/* Left Column: Hero, Setup Checklist, and Quick Tiles */}
        <div className="lg:col-span-7 flex flex-col gap-3 small:gap-5">
          {/* ── Hero balance card — Flutter / fintech inspired ─────────
             Mobile-first: the *primary* surface is the loyalty balance,
             not a generic greeting. The avatar + name sit on a strip
             above. Big tabular-nums points display, "earn more" CTA, and
             a soft chromatic blob for depth without a gimmicky gradient
             background. */}
          <section className="relative overflow-hidden rounded-3xl bg-ink text-bg shadow-[0_18px_36px_-22px_rgba(0,0,0,0.55)]">
            {/* Decorative blobs */}
            <span
              aria-hidden
              className="absolute -top-20 -right-16 w-56 h-56 rounded-full opacity-40 blur-3xl"
              style={{ background: "rgb(var(--color-accent))" }}
            />
            <span
              aria-hidden
              className="absolute -bottom-24 -left-10 w-48 h-48 rounded-full opacity-25 blur-3xl"
              style={{ background: "rgb(var(--color-primary))" }}
            />

            <div className="relative px-5 pt-4 pb-5 small:px-7 small:pt-5 small:pb-7">
              {/* Top strip: avatar + greeting + tiny edit chip */}
              <div className="flex items-center justify-between gap-3">
                <LocalizedClientLink
                  href="/account/profile"
                  aria-label="Edit profile picture"
                  className="flex items-center gap-3 min-w-0 group"
                  title="Change profile picture"
                >
                  <span className="relative shrink-0">
                    <Avatar
                      size={40}
                      {...getAvatarPropsFromCustomer(customer)}
                      className="ring-2 ring-bg/20 transition-transform group-hover:scale-[1.05]"
                    />
                    <span
                      aria-hidden
                      className="absolute -bottom-0.5 -right-0.5 w-4 h-4 rounded-full bg-bg text-ink flex items-center justify-center"
                    >
                      <i className="ph-bold ph-pencil-simple text-[8px]" aria-hidden />
                    </span>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[11px] uppercase tracking-[0.18em] text-bg/55">
                      Welcome back
                    </span>
                    <span
                      className="block text-[15px] font-semibold leading-tight truncate"
                      data-testid="welcome-message"
                      data-value={customer.first_name}
                    >
                      {firstName}
                    </span>
                  </span>
                </LocalizedClientLink>

                <LocalizedClientLink
                  href="/account/orders"
                  aria-label="View orders"
                  className="shrink-0 inline-flex items-center justify-center w-9 h-9 rounded-full bg-bg/10 hover:bg-bg/20 transition-colors"
                >
                  <i className="ph-bold ph-bell text-[15px]" aria-hidden />
                </LocalizedClientLink>
              </div>

              {/* Big balance display */}
              <div className="mt-5 small:mt-6">
                <p className="text-[11px] uppercase tracking-[0.2em] text-bg/55">
                  Loyalty balance
                </p>
                <div className="mt-1 flex items-baseline gap-2">
                  <span className="text-[40px] small:text-[44px] font-bold tabular-nums leading-none">
                    {loyaltyBalance.toLocaleString()}
                  </span>
                  <span className="text-xs font-semibold uppercase tracking-wider text-bg/60">
                    pts
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-bg/55">
                  Use them at checkout
                </p>
              </div>

              {/* Action row */}
              <div className="mt-5">
                <LocalizedClientLink
                  href="/store"
                  className="inline-flex items-center justify-center gap-1.5 h-10 w-full rounded-full bg-bg/10 text-bg text-[12px] font-bold hover:bg-bg/15 transition-colors border border-bg/15"
                >
                  Shop now
                  <i className="ph-bold ph-arrow-right text-sm" aria-hidden />
                </LocalizedClientLink>
              </div>
            </div>
          </section>

          {/* ── Setup row ──────────────────────────────────────────── */}
          {!isComplete && (
            <section className="rounded-2xl bg-bg border border-line px-5 py-4 small:px-6">
              <div className="flex items-center justify-between gap-3 mb-3">
                <p className="text-sm font-semibold text-ink">
                  Finish your profile{" "}
                  <span className="text-ink/40 font-normal">
                    · earn +10 pts
                  </span>
                </p>
                <span className="text-[11px] font-bold text-ink/55 tabular-nums">
                  {completion}%
                </span>
              </div>

              <div
                className="w-full h-1.5 rounded-full bg-surface overflow-hidden"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={completion}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-yellow-400 via-orange-400 to-pink-500 transition-[width] duration-500"
                  style={{ width: `${completion}%` }}
                />
              </div>

              {/* Compact step chips */}
              <ul className="mt-3 flex flex-wrap gap-1.5">
                {checklist.map((step) => (
                  <li key={step.label}>
                    <LocalizedClientLink
                      href={step.href}
                      className={`inline-flex items-center gap-1.5 h-7 px-2.5 rounded-full text-[11px] font-medium transition-colors ${
                        step.done
                          ? "bg-emerald-50 text-emerald-700"
                          : "bg-surface text-ink hover:bg-ink hover:text-bg"
                      }`}
                    >
                      {step.done ? (
                        <i className="ph-bold ph-check text-[10px]" aria-hidden />
                      ) : (
                        <i className="ph ph-plus text-[10px]" aria-hidden />
                      )}
                      {step.label}
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* When complete, just a tiny confirmation strip */}
          {isComplete && (
            <p className="text-[11px] text-ink/45 px-1 inline-flex items-center gap-1.5">
              <i className="ph-fill ph-seal-check text-emerald-500 text-sm" aria-hidden />
              Profile is all set
            </p>
          )}

          {/* ── Quick tiles — Material-3 icon-container style ──────────
             Color-coded icon chips so each shortcut is recognisable at a
             glance rather than a wall of identical greys. Two-up on
             mobile, four-up on desktop. */}
          <section className="grid grid-cols-2 gap-2.5">
            <Tile
              href="/account/orders"
              icon="ph-package"
              label="Orders"
              metric={orderCount}
              tint="blue"
            />
            <Tile
              href="/account/addresses"
              icon="ph-map-pin"
              label="Address"
              metric={(customer.addresses || []).length > 0 ? "Saved" : "Add"}
              tint="emerald"
            />
            <Tile
              href="/account/profile"
              icon="ph-user-circle"
              label="Profile"
              metric={isComplete ? "100%" : `${completion}%`}
              tint="purple"
            />
            <Tile
              href="/account/loyalty"
              icon="ph-coin"
              label="Points"
              metric={loyaltyBalance.toLocaleString()}
              tint="amber"
            />
          </section>
        </div>

        {/* Right Column: Recent Orders */}
        <div className="lg:col-span-5">
          {/* ── Recent orders ──────────────────────────────────────── */}
          <section className="rounded-2xl bg-bg border border-line overflow-hidden">
            <header className="flex items-center justify-between px-5 small:px-6 py-3 border-b border-line">
              <h2 className="text-sm font-semibold text-ink">Recent orders</h2>
              {recentOrders.length > 0 && (
                <LocalizedClientLink
                  href="/account/orders"
                  className="text-[11px] font-medium text-ink/55 hover:text-ink"
                >
                  View all →
                </LocalizedClientLink>
              )}
            </header>

            {recentOrders.length === 0 ? (
              <div className="px-5 small:px-6 py-8 text-center">
                <span className="text-3xl block mb-2" aria-hidden>
                  🛍️
                </span>
                <p className="text-sm text-ink">No orders yet</p>
                <p className="mt-1 text-[11px] text-ink/50 max-w-[220px] mx-auto">
                  When you place your first order, it'll show up here.
                </p>
                <LocalizedClientLink
                  href="/store"
                  className="mt-3 inline-flex items-center gap-1.5 h-8 px-4 rounded-full bg-ink text-bg text-[11px] font-semibold hover:bg-ink/85 transition-colors"
                >
                  Start shopping
                  <i className="ph-bold ph-arrow-right text-[10px]" aria-hidden />
                </LocalizedClientLink>
              </div>
            ) : (
              <ul className="divide-y divide-line" data-testid="orders-wrapper">
                {recentOrders.map((order) => (
                  <li
                    key={order.id}
                    data-testid="order-wrapper"
                    data-value={order.id}
                  >
                    <LocalizedClientLink
                      href={`/account/orders/details/${order.id}`}
                      className="group flex items-center gap-3 px-5 small:px-6 py-3 hover:bg-surface/50 transition-colors"
                    >
                      <span className="shrink-0 inline-flex items-center justify-center w-8 h-8 rounded-full bg-surface text-ink/70">
                        <i className="ph ph-receipt text-sm" aria-hidden />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span
                          className="block text-[13px] font-semibold text-ink"
                          data-testid="order-id"
                          data-value={order.display_id}
                        >
                          #{order.display_id}
                        </span>
                        <span
                          className="block text-[10px] text-ink/50 mt-0.5"
                          data-testid="order-created-date"
                        >
                          {new Date(order.created_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </span>
                      <span
                        className="text-[13px] font-semibold text-ink shrink-0"
                        data-testid="order-amount"
                      >
                        {convertToLocale({
                          amount: order.total,
                          currency_code: order.currency_code,
                        })}
                      </span>
                      <i
                        className="ph ph-caret-right text-[11px] text-ink/35"
                        aria-hidden
                      />
                    </LocalizedClientLink>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </div>

      {/* Mobile-only sign out — desktop has it in the sidebar */}
      <div className="small:hidden">
        <SignoutButton className="w-full" />
      </div>

      {/* Celebration toast — fires once when the backend has just
          credited the 10-point completion bonus. */}
      <PointsEarnedToast
        show={!!recentlyAwarded?.points}
        points={recentlyAwarded?.points || 0}
      />
    </div>
  )
}

/**
 * Quick-action tile for the dashboard grid.
 *
 * Tints map onto Tailwind colour stops so each shortcut has a
 * distinct icon container — Material 3 / Flutter convention. The
 * label/metric on the right keeps the tile compact even on small
 * screens. Tap target hits ~64px tall on mobile.
 */
type Tint = "blue" | "emerald" | "purple" | "amber"

const TINTS: Record<Tint, { bg: string; fg: string }> = {
  blue: { bg: "bg-blue-50", fg: "text-blue-600" },
  emerald: { bg: "bg-emerald-50", fg: "text-emerald-600" },
  purple: { bg: "bg-purple-50", fg: "text-purple-600" },
  amber: { bg: "bg-amber-50", fg: "text-amber-600" },
}

const Tile = ({
  href,
  icon,
  label,
  metric,
  tint,
}: {
  href: string
  icon: string
  label: string
  metric: string | number
  tint: Tint
}) => {
  const t = TINTS[tint]
  return (
    <LocalizedClientLink
      href={href}
      className="group relative flex items-center gap-3 rounded-2xl bg-bg border border-line hover:border-ink/40 hover:shadow-[0_8px_18px_-12px_rgba(0,0,0,0.18)] px-3 py-3 transition-all"
    >
      <span
        className={`inline-flex items-center justify-center w-10 h-10 rounded-xl ${t.bg} ${t.fg} shrink-0`}
      >
        <i className={`ph-fill ${icon} text-[18px]`} aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[11px] font-medium uppercase tracking-wider text-ink/50 leading-none">
          {label}
        </span>
        <span className="mt-1 block text-[15px] font-bold text-ink leading-none truncate">
          {metric}
        </span>
      </span>
      <i
        className="ph ph-caret-right text-[11px] text-ink/30 group-hover:text-ink/55 transition-colors shrink-0"
        aria-hidden
      />
    </LocalizedClientLink>
  )
}

export default OverviewModern
