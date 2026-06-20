import { getBaseURL } from "@lib/util/env"
import { Metadata, Viewport } from "next"
import { Instrument_Sans } from "next/font/google"
import "styles/globals.css"
import GoogleAnalytics from "@modules/analytics/google-analytics"
import MetaPixel from "@modules/analytics/meta-pixel"
import CustomHeadCode from "@modules/analytics/custom-head-code"
import BusinessJsonLd from "@modules/seo/business-json-ld"
import SiteJsonLd from "@modules/seo/site-json-ld"
import { getSiteSettings, resolveProductCardAspectClass } from "@lib/data/site-settings"
import { buildTheme, getFontHref } from "@lib/util/theme"
import { CartDrawerProvider } from "@lib/context/cart-drawer-context"
import { SiteSettingsProvider } from "@lib/context/site-settings-context"
import { retrieveCustomer } from "@lib/data/customer"
import { ClientPushPrompt, ClientChatWidget, ClientSmoothScroll } from "./client-wrappers"

// Anvogue body font, wired to the CSS variable used by tailwind.config.js
// and globals.css so `font-sans` resolves to Instrument Sans everywhere.
const instrumentSans = Instrument_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-instrument-sans",
  display: "swap",
})

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()

  const siteName = settings.site_name?.trim()
  const tagline = settings.site_tagline?.trim()
  const title = settings.seo_home_title?.trim()
  const description = settings.seo_home_description?.trim()

  const meta: Metadata = {
    metadataBase: new URL(getBaseURL()),
  }

  if (siteName) {
    meta.applicationName = siteName
    // No `template` here — every child page already crafts a full title
    // (product name, category, blog post headline, etc.) and appending
    // ` | {siteName}` to all of them was making every tab and SERP
    // result repetitive. The home/landing title still uses the site
    // name explicitly via `default`.
    meta.title = {
      default: title || (tagline ? `${siteName} | ${tagline}` : siteName),
      template: "%s",
    }
  } else if (title) {
    meta.title = title
  }

  if (description) meta.description = description

  if (settings.seo_home_keywords?.trim()) {
    meta.keywords = settings.seo_home_keywords
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean)
  }

  if (settings.site_favicon_url?.trim()) {
    meta.icons = { icon: settings.site_favicon_url }
  }

  // Default OpenGraph for Pakistan-focused storefront: English primary,
  // Urdu alternate. Both share the country code so social previews show
  // PKR and Pakistan locale formatting.
  meta.openGraph = {
    siteName: siteName || undefined,
    type: "website",
    locale: "en_PK",
    alternateLocale: ["ur_PK"],
    ...(settings.seo_default_og_image?.trim()
      ? { images: [{ url: settings.seo_default_og_image }] }
      : {}),
  }

  return meta
}

// Mobile browser address-bar colour. Falls back through:
//   theme_browser_bar → theme_header_bg → theme_primary → white.
// iOS Safari only honours this inside an installed PWA; Chrome /
// Edge / Samsung / Firefox on Android colour the URL bar directly.
export async function generateViewport(): Promise<Viewport> {
  const settings = await getSiteSettings()
  const HEX = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/
  const browserBar =
    [
      settings.theme_browser_bar,
      settings.theme_header_bg,
      settings.theme_primary,
    ]
      .map((v) => v?.trim())
      .find((v) => v && HEX.test(v)) || "#FFFFFF"
  return { themeColor: browserBar }
}

export default async function RootLayout(props: { children: React.ReactNode }) {
  const settings = await getSiteSettings()
  const theme = buildTheme(settings)
  const fontHref = getFontHref(theme.fontKey)
  // Best-effort customer lookup so push subscriptions are linked to the
  // logged-in user. Failures are silent — push works for guests too.
  let customerId: string | null = null
  try {
    const customer = await retrieveCustomer()
    customerId = customer?.id || null
  } catch {}
  // NOTE: cart id is fetched lazily inside the chat widget via a server
  // action — reading the HttpOnly cookie here would call `cookies()` and
  // force-disqualify the root layout from static generation, breaking
  // every page that uses `generateStaticParams` (product detail, etc.).

  return (
    <html
      lang="en"
      data-mode="light"
      data-theme-radius={theme.radiusKey}
      data-theme-font={theme.fontKey}
      className={instrumentSans.variable}
      suppressHydrationWarning
    >
      <head>
        {/* ── Third-party CSS loaded ASYNC (non-render-blocking) ──────────
            Phosphor icon fonts (3 weights) + the theme Google Font used to
            be plain <link rel="stylesheet"> which BLOCKS first paint on
            mobile (3 unpkg round-trips + a fonts.googleapis round-trip
            before anything renders). That was the biggest PageSpeed hit.

            We can't use the `media="print" onLoad=` swap (React strips the
            inline onLoad on <link>, which left icons invisible forever).
            Instead a tiny inline script appends the stylesheets after the
            document starts parsing — real stylesheets, so icons/fonts DO
            load, just without blocking the initial render. A <noscript>
            fallback keeps everything working with JS disabled. */}
        {/* Phosphor icons are now SELF-HOSTED under /icons/phosphor (see
            public/) — same-origin + Cloudflare-cached. unpkg.com was a
            slow third-party chain (DNS+TLS+~600ms on mobile) flagged in
            every PageSpeed report, and a single point of failure. */}
        {fontHref && (
          <>
            <link rel="preconnect" href="https://fonts.googleapis.com" />
            <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
          </>
        )}
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var u=${JSON.stringify([
              "/icons/phosphor/regular/style.css",
              "/icons/phosphor/bold/style.css",
              "/icons/phosphor/fill/style.css",
              ...(fontHref ? [fontHref] : []),
            ])};function inject(){for(var i=0;i<u.length;i++){var l=document.createElement("link");l.rel="stylesheet";l.href=u[i];document.head.appendChild(l);}}/* Defer until the browser is idle so the ~420KB Phosphor icon fonts
            don't compete with the LCP product image for Slow-4G bandwidth.
            Body text uses the next/font Instrument Sans (already preloaded),
            so deferring these only delays decorative icons by a beat. */
            if('requestIdleCallback' in window){requestIdleCallback(inject,{timeout:1800});}else{setTimeout(inject,200);}})();`,
          }}
        />
        <noscript>
          <link rel="stylesheet" href="/icons/phosphor/regular/style.css" />
          <link rel="stylesheet" href="/icons/phosphor/bold/style.css" />
          <link rel="stylesheet" href="/icons/phosphor/fill/style.css" />
          {fontHref && <link rel="stylesheet" href={fontHref} />}
        </noscript>
        {/* Theme variables injected from /admin/theme — overrides defaults in globals.css */}
        <style
          id="dynamic-theme"
          dangerouslySetInnerHTML={{ __html: theme.cssVarsBlock }}
        />
        <GoogleAnalytics measurementId={settings.google_analytics_id} />
        <MetaPixel pixelId={settings.meta_pixel_id} />
        {/* LocalBusiness JSON-LD — emits GroceryStore / Pharmacy / Store
            schema based on the admin-configured business type. */}
        <SiteJsonLd settings={settings} />
        <BusinessJsonLd settings={settings} />
        {/* Admin-supplied raw HTML — verification meta tags, AdSense, custom
            analytics, etc. Rendered last so it can override defaults. */}
        <CustomHeadCode html={settings.head_code} />
      </head>
      <body className="font-sans antialiased text-ink bg-bg">
        <CartDrawerProvider>
          <SiteSettingsProvider aspectClass={resolveProductCardAspectClass(settings)}>
            <main className="relative">{props.children}</main>
          </SiteSettingsProvider>
        </CartDrawerProvider>
        <ClientSmoothScroll />
        {/* Web Push — registers /sw.js and triggers the native browser
            permission prompt on first user gesture. No-op on iOS Safari
            (push not yet supported in non-PWA contexts). */}
        <ClientPushPrompt customerId={customerId} />
        {/* AI Shopping Assistant — with product search, cart actions, and
            order concierge built into the chat. Cart id is fetched lazily
            inside the widget (see note above). */}
        <ClientChatWidget
          customerId={customerId}
          whatsappNumber={settings.whatsapp_number || null}
          whatsappChatbotEnabled={settings.whatsapp_chatbot_enabled !== "false"}
        />
      </body>
    </html>
  )
}
