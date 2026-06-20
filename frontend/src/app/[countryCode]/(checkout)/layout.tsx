import LocalizedClientLink from "@modules/common/components/localized-client-link"
import { getSiteSettings } from "@lib/data/site-settings"

/**
 * Checkout chrome — minimal so the payment flow stays focused.
 * Renders the site logo / name from admin settings.
 */
export default async function CheckoutLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const settings = await getSiteSettings()
  const siteName = settings.site_name || "Store"
  const logo = settings.site_logo_url
  const logoWidthDesktop = settings.site_logo_width_desktop ? parseInt(settings.site_logo_width_desktop, 10) : null

  return (
    <div className="w-full bg-bg relative md:min-h-screen">
      <header className="h-14 bg-header border-b border-header-line text-header-fg">
        <nav className="flex h-full items-center container-anvogue justify-between">
          <LocalizedClientLink
            href="/cart"
            className="text-xs font-medium text-header-fg/60 hover:text-header-fg flex items-center gap-1.5 flex-1 basis-0 transition-colors"
            data-testid="back-to-cart-link"
          >
            <i className="ph-bold ph-arrow-left text-sm" aria-hidden />
            <span className="hidden sm:inline">Back to cart</span>
            <span className="sm:hidden">Back</span>
          </LocalizedClientLink>

          <LocalizedClientLink
            href="/"
            className="flex items-center justify-center"
            data-testid="store-link"
            aria-label={siteName}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logo}
                alt={siteName}
                className={logoWidthDesktop ? "object-contain" : "max-h-7 w-auto object-contain"}
                style={logoWidthDesktop ? { width: `${Math.min(logoWidthDesktop, 150)}px`, height: "auto" } : undefined}
              />
            ) : (
              <span className="text-base font-semibold text-header-fg uppercase tracking-wider">
                {siteName}
              </span>
            )}
          </LocalizedClientLink>

          <div className="flex-1 basis-0 flex justify-end items-center gap-1.5">
            <i
              className="ph ph-shield-check text-header-accent text-base"
              aria-hidden
            />
            <span className="hidden sm:inline text-[10px] text-header-fg/40 font-medium">Secure</span>
          </div>
        </nav>
      </header>

      <div className="relative" data-testid="checkout-container">
        {children}
      </div>
    </div>
  )
}
