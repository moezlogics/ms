import { Suspense } from "react"

import { listRegions } from "@lib/data/regions"
import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listCategories } from "@lib/data/categories"
import { retrieveCustomer } from "@lib/data/customer"
import { getSiteSettings } from "@lib/data/site-settings"
import { StoreRegion, HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"
import SmartSearchBar from "@modules/search/components/smart-search-bar"

/**
 * Clean, solid-white header — no transparency, no category bar.
 *
 * Desktop (≥ small):
 *   [Logo]   [Home Shop▾ Blog Contact]   [Search pill] [👤 ❤ 🛍]
 *
 * Mobile (< small):
 *   [☰]      [Logo]     [🔍][🛍]
 */
export default async function Nav() {
  const [regions, locales, currentLocale, categories, customer, settings] =
    await Promise.all([
      listRegions().then((r: StoreRegion[]) => r),
      listLocales(),
      getLocale(),
      listCategories().catch(() => [] as HttpTypes.StoreProductCategory[]),
      retrieveCustomer().catch(() => null),
      getSiteSettings(),
    ])

  const siteName = settings.site_name?.trim() || "Store"
  const logoUrl = settings.site_logo_url?.trim()

  // Top-level categories only for the "Shop" mega-menu.
  const topCategories = (categories || [])
    .filter((c) => !c.parent_category_id)
    .slice(0, 12)

  const logoWidthDesktop = settings.site_logo_width_desktop ? parseInt(settings.site_logo_width_desktop, 10) : null
  const logoWidthMobile = settings.site_logo_width_mobile ? parseInt(settings.site_logo_width_mobile, 10) : null

  const Logo = ({ size = "md", isMobile = false }: { size?: "sm" | "md" | "lg"; isMobile?: boolean }) => {
    const customWidth = isMobile ? logoWidthMobile : logoWidthDesktop
    const h =
      size === "sm" ? "h-9" : size === "lg" ? "h-9 md:h-10" : "h-7 md:h-8"
    return logoUrl ? (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={siteName}
        className={customWidth ? "object-contain" : `${h} w-auto object-contain`}
        style={customWidth ? { width: `${customWidth}px`, height: "auto" } : undefined}
      />
    ) : (
      <span
        className={`tracking-tight font-semibold ${
          size === "lg"
            ? "text-2xl md:text-[28px]"
            : size === "sm"
            ? "text-lg"
            : "text-xl md:text-[22px]"
        }`}
      >
        {siteName}
      </span>
    )
  }

  return (
    <header
      id="header"
      className="sticky top-0 inset-x-0 z-40"
      role="banner"
      aria-label={siteName}
    >
      {/* Subtle accent strip — uses the dedicated header_accent so it
          adapts to the header palette (e.g. gold strip under a navy
          header in Midnight Luxe). */}
      <div
        className="h-[2px] w-full"
        style={{
          backgroundColor: "rgb(var(--color-header-top-border))",
        }}
        aria-hidden
      />

      {/* === Mobile header — 64px main row, NO category bar === */}
      <div className="small:hidden bg-header border-b border-header-line shadow-sm">
        {/* Row 1 — hamburger · logo · search · cart (64px) */}
        <div className="px-2 h-16 flex items-center gap-1">
          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            <SideMenu
              regions={regions}
              locales={locales}
              currentLocale={currentLocale}
              customer={customer}
            />
          </div>

          <LocalizedClientLink
            href="/"
            aria-label={siteName}
            className="flex-1 flex items-center justify-center min-w-0 text-header-fg"
            data-testid="nav-store-link-mobile"
          >
            <Logo size="sm" isMobile />
          </LocalizedClientLink>

          <div className="w-12 h-12 flex items-center justify-center shrink-0">
            <Suspense
              fallback={
                <LocalizedClientLink
                  href="/cart"
                  aria-label="Cart"
                  className="w-12 h-12 flex items-center justify-center rounded-full hover:bg-header-hover text-header-fg hover:text-header-accent transition-all active:scale-90"
                >
                  <i className="ph-bold ph-handbag text-[24px]" aria-hidden />
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </div>
      </div>

      {/* === Desktop header === */}
      <div className="hidden small:block bg-header border-b border-header-line shadow-sm">
        <div className="container-anvogue h-[64px]">
          <nav
            className="flex items-center justify-between h-full gap-8"
            aria-label="Primary"
          >
            {/* Left: Logo */}
            <LocalizedClientLink
              href="/"
              className="flex items-center shrink-0 text-header-fg"
              data-testid="nav-store-link"
              aria-label={siteName}
            >
              <Logo size="md" />
            </LocalizedClientLink>

            {/* Center: primary nav with sweep-underline hover */}
            <ul className="flex items-center gap-1 h-full">
              <li className="h-full flex items-center">
                <NavLink href="/">Home</NavLink>
              </li>
              <li className="h-full flex items-center relative group">
                <LocalizedClientLink
                  href="/store"
                  className="relative px-4 h-full inline-flex items-center text-sm font-medium text-header-fg transition-colors gap-1.5 group-hover:text-header-accent"
                >
                  Shop
                  {topCategories.length > 0 && (
                    <i
                      className="ph ph-caret-down text-[10px] mt-0.5 transition-transform group-hover:rotate-180"
                      aria-hidden
                    />
                  )}
                  <span
                    className="absolute bottom-[18px] left-4 right-4 h-[2px] rounded-full bg-header-accent opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-hidden
                  />
                </LocalizedClientLink>
                {topCategories.length > 0 && (
                  <div
                    className="hidden group-hover:grid absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50"
                    role="menu"
                  >
                    <div className="bg-bg rounded-large border border-line shadow-pop py-5 px-6 grid grid-cols-2 gap-x-10 gap-y-1 min-w-[440px]">
                      {topCategories.map((c) => (
                        <LocalizedClientLink
                          key={c.id}
                          href={`/${c.handle}`}
                          className="group/cat text-sm text-ink/80 hover:text-primary hover:bg-surface rounded-base px-3 py-2 -mx-3 transition-colors inline-flex items-center justify-between"
                        >
                          <span>{c.name}</span>
                          <i
                            className="ph ph-arrow-right text-[11px] opacity-0 group-hover/cat:opacity-100 -translate-x-1 group-hover/cat:translate-x-0 transition-all text-primary"
                            aria-hidden
                          />
                        </LocalizedClientLink>
                      ))}
                      <LocalizedClientLink
                        href="/store"
                        className="text-sm font-semibold text-primary hover:text-accent col-span-2 pt-3 mt-2 border-t border-line flex items-center gap-1"
                      >
                        View all categories
                        <i
                          className="ph-bold ph-arrow-right text-xs"
                          aria-hidden
                        />
                      </LocalizedClientLink>
                    </div>
                  </div>
                )}
              </li>
              <li className="h-full flex items-center">
                <NavLink href="/blog">Blog</NavLink>
              </li>
              <li className="h-full flex items-center">
                <NavLink href="/contact">Contact</NavLink>
              </li>
            </ul>

            {/* Right: search + actions */}
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="hidden medium:block w-[340px] lg:w-[400px]">
                <SmartSearchBar />
              </div>
              <span className="mx-1 h-5 w-px bg-header-line" aria-hidden />
              <LocalizedClientLink
                href="/account"
                aria-label={customer ? "Account" : "Sign in"}
                className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-header-hover text-header-fg hover:text-header-accent transition-all hover:scale-[1.05] relative"
              >
                <i className="ph-bold ph-user text-[20px]" aria-hidden />
                {customer && (
                  <span
                    className="absolute top-2 right-2 w-2 h-2 rounded-full bg-success border border-header"
                    aria-hidden
                  />
                )}
              </LocalizedClientLink>

              <Suspense
                fallback={
                  <LocalizedClientLink
                    href="/cart"
                    aria-label="Cart"
                    data-testid="nav-cart-link"
                    className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-header-hover text-header-fg hover:text-header-accent transition-all hover:scale-[1.05]"
                  >
                    <i
                      className="ph-bold ph-handbag text-[20px]"
                      aria-hidden
                    />
                  </LocalizedClientLink>
                }
              >
                <CartButton />
              </Suspense>
            </div>
          </nav>
        </div>
      </div>
    </header>
  )
}

/**
 * Desktop nav link with a primary-colored sweep-underline on hover.
 */
function NavLink({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <LocalizedClientLink
      href={href}
      className="relative group px-4 h-full inline-flex items-center text-sm font-medium text-header-fg hover:text-header-accent transition-colors"
    >
      {children}
      <span
        className="absolute bottom-[18px] left-4 right-4 h-[2px] rounded-full bg-header-accent scale-x-0 origin-left group-hover:scale-x-100 transition-transform duration-300"
        aria-hidden
      />
    </LocalizedClientLink>
  )
}
