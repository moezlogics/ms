import { getBaseURL } from "@lib/util/env"
import { SiteSettings } from "@lib/data/site-settings"

/**
 * Business / LocalBusiness JSON-LD.
 *
 * Emits Schema.org structured data describing the storefront. The exact
 * `@type` is driven by `business_type` in site settings:
 *
 *   - "grocery"     → GroceryStore
 *   - "pharmacy"    → Pharmacy + medicalSpecialty
 *   - "electronics" → ElectronicsStore (consumer electronics retail)
 *   - anything else → Store (generic LocalBusiness)
 *
 * Backward compatible — pharmacy installs that haven't migrated their
 * settings still resolve to `Pharmacy` automatically when the legacy
 * `pharmacy_license_number` field is set.
 *
 * Reads from site settings:
 *   - `business_country` / `business_locality` / `business_region` /
 *     `business_postal_code` / `business_opening_hours`
 *     (with `pharmacy_*` legacy fallbacks)
 *   - `contact_phone` / `contact_email` / `contact_address`
 *   - `social_*`
 *
 * Renders a single `<script type="application/ld+json">` tag.
 */
export default function BusinessJsonLd({ settings }: { settings: SiteSettings }) {
  const baseUrl = getBaseURL()
  const siteName = settings.site_name?.trim()
  if (!siteName) return null

  const phone = settings.contact_phone?.trim()
  const email = settings.contact_email?.trim()
  const streetAddress = settings.contact_address?.trim()

  // Resolve business type with back-compat: an explicit `business_type`
  // wins, otherwise we sniff the legacy `pharmacy_license_number` to
  // detect a pharmacy install. Defaults to "grocery".
  const explicitType = (settings as any).business_type?.trim?.().toLowerCase()
  const legacyLicense = settings.pharmacy_license_number?.trim()
  const businessType: "grocery" | "pharmacy" | "electronics" | "store" =
    explicitType === "pharmacy" || (!explicitType && legacyLicense)
      ? "pharmacy"
      : explicitType === "electronics"
      ? "electronics"
      : explicitType === "general"
      ? "store"
      : "grocery"

  // Address / hours — prefer business_* keys, fall back to pharmacy_*.
  const hours =
    (settings as any).business_opening_hours?.trim?.() ||
    settings.pharmacy_opening_hours?.trim?.() ||
    "Mo-Su 09:00-22:00"
  const country =
    (settings as any).business_country?.trim?.() ||
    settings.pharmacy_country?.trim?.() ||
    "PK"
  const locality =
    (settings as any).business_locality?.trim?.() ||
    settings.pharmacy_locality?.trim?.()
  const region =
    (settings as any).business_region?.trim?.() ||
    settings.pharmacy_region?.trim?.()
  const postalCode =
    (settings as any).business_postal_code?.trim?.() ||
    settings.pharmacy_postal_code?.trim?.()
  const license =
    (settings as any).business_license_number?.trim?.() || legacyLicense

  const sameAs: string[] = [
    settings.social_facebook,
    settings.social_instagram,
    settings.social_twitter,
    settings.social_youtube,
    settings.social_tiktok,
    settings.social_pinterest,
  ]
    .map((s) => s?.trim())
    .filter((s): s is string => Boolean(s))

  const schemaType =
    businessType === "grocery"
      ? "GroceryStore"
      : businessType === "pharmacy"
      ? "Pharmacy"
      : businessType === "electronics"
      ? "ElectronicsStore"
      : "Store"

  const data: Record<string, any> = {
    "@context": "https://schema.org",
    "@type": schemaType,
    "@id": `${baseUrl}/#business`,
    name: siteName,
    url: baseUrl,
    description:
      settings.seo_home_description?.trim() || settings.site_tagline?.trim(),
    image:
      settings.site_logo_url?.trim() || settings.seo_default_og_image?.trim(),
    logo: settings.site_logo_url?.trim(),
    openingHours: hours,
    priceRange: (settings as any).business_price_range?.trim?.() || "$$",
  }

  if (businessType === "pharmacy") {
    data.medicalSpecialty = "Pharmacy"
  }

  if (phone || email) {
    data.contactPoint = {
      "@type": "ContactPoint",
      contactType: "customer service",
      ...(phone && { telephone: phone }),
      ...(email && { email }),
      areaServed: country,
      availableLanguage: ["en", "ur"],
    }
  }

  if (streetAddress || locality || region || postalCode) {
    data.address = {
      "@type": "PostalAddress",
      ...(streetAddress && { streetAddress }),
      ...(locality && { addressLocality: locality }),
      ...(region && { addressRegion: region }),
      ...(postalCode && { postalCode }),
      addressCountry: country,
    }
  }

  if (license) {
    data.identifier = {
      "@type": "PropertyValue",
      propertyID:
        businessType === "pharmacy" ? "Pharmacy License" : "Business License",
      value: license,
    }
  }

  // Electronics-storefronts: surface accepted payment methods + currency
  // so Google can render them in the Knowledge Panel. Fixed at PKR for
  // now; revisit when the storefront expands beyond Pakistan.
  if (businessType === "electronics") {
    data.currenciesAccepted = "PKR"
    data.paymentAccepted = "Cash, Credit Card, Debit Card, Bank Transfer"
  }

  if (sameAs.length) data.sameAs = sameAs

  return (
    <script
      type="application/ld+json"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  )
}
