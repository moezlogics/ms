import Image from "next/image"
import { getSiteSettings } from "@lib/data/site-settings"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

/**
 * Anvogue-style full-bleed hero.
 *
 * Copy is pulled from site-settings where possible:
 *   - tagline → kicker
 *   - seo_home_title / site_name → headline
 *   - seo_home_description → subline
 *
 * Background can be overridden by setting `seo_default_og_image`.
 */
export default async function Hero() {
  const settings = await getSiteSettings()

  const kicker = settings.site_tagline?.trim() || "Spring / Summer 2026"
  const headline =
    settings.seo_home_title?.trim() ||
    settings.site_name?.trim() ||
    "New Season. New You."
  const subline =
    settings.seo_home_description?.trim() ||
    "Discover the latest arrivals — crafted for modern living. Enjoy free shipping on every order."
  const heroImage = settings.seo_default_og_image?.trim()

  return (
    <section className="relative overflow-hidden bg-linear">
      {heroImage && (
        <Image
          src={heroImage}
          alt=""
          aria-hidden
          fill
          className="object-cover opacity-60"
          priority
          sizes="100vw"
        />
      )}
      <div className="absolute inset-0 bg-gradient-to-r from-white/80 via-white/40 to-transparent" />

      <div className="container-anvogue relative z-10 py-20 md:py-32 max-w-3xl">
        <div className="text-sub-display has-line-before text-brand-black/70 mb-4">
          {kicker}
        </div>
        <h1 className="heading1 text-brand-black mb-5">{headline}</h1>
        <p className="body1 text-secondary max-w-xl mb-8">{subline}</p>
        <div className="flex flex-wrap items-center gap-3">
          <LocalizedClientLink href="/store" className="button-main">
            Shop Now
          </LocalizedClientLink>
          <LocalizedClientLink href="/blog" className="button-outline">
            Read The Journal
          </LocalizedClientLink>
        </div>
      </div>
    </section>
  )
}
