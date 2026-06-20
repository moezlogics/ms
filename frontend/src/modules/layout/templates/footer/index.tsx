import { getSiteSettings } from "@lib/data/site-settings"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Ultra-minimal footer — just a hairline, a single row of links, and
 * a whisper-quiet copyright. No perks strip, no accordion columns, no
 * heavy chrome. The idea is that the footer signals "end of page"
 * without competing with the product grid above it.
 *
 * Desktop & mobile share the same single-row layout; the links just
 * wrap naturally on narrow screens.
 */
export default async function Footer() {
  const settings = await getSiteSettings()

  const siteName = settings.site_name?.trim() || "Store"
  const year = new Date().getFullYear()

  const links = [
    { href: "/store", label: "Shop" },
    { href: "/about", label: "About" },
    { href: "/contact", label: "Contact" },
    { href: "/privacy", label: "Privacy" },
    { href: "/terms", label: "Terms" },
    { href: "/refund-policy", label: "Refunds" },
  ]

  return (
    <footer
      className="relative mt-12 md:mt-20 pb-mobile-nav cv-section"
      style={{ backgroundColor: "rgb(var(--color-footer-bg))" }}
      role="contentinfo"
    >
      {/* Hairline — fades in from the edges so it feels lighter than
          a solid 1px border. */}
      <div
        className="h-px"
        style={{
          background: "linear-gradient(to right, transparent, rgb(var(--color-footer-border)), transparent)",
        }}
      />

      <div className="container-anvogue py-8 md:py-10 flex flex-col items-center gap-5">
        {/* Single link row — tiny, airy, centred. */}
        <nav className="flex flex-wrap justify-center gap-x-5 gap-y-1.5">
          {links.map((l) => (
            <LocalizedClientLink
              key={l.href}
              href={l.href}
              className="text-[11px] transition-colors duration-200 hover:opacity-80"
              style={{ color: "rgb(var(--color-footer-fg))" }}
            >
              {l.label}
            </LocalizedClientLink>
          ))}
        </nav>

        {/* Copyright — smaller than the links, almost a watermark. */}
        <p
          className="text-[10px] tracking-wide"
          style={{ color: "rgb(var(--color-footer-fg))", opacity: 0.65 }}
        >
          © {year} {siteName}. All rights reserved.
        </p>
      </div>
    </footer>
  )
}
