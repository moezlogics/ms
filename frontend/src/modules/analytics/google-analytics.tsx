import Script from "next/script"

/**
 * Google Analytics (GA4) client-side tracker.
 * Inject in the root <head> via next/script (afterInteractive).
 *
 * Measurement ID resolution order:
 *   1. `measurementId` prop (from admin site-settings)
 *   2. NEXT_PUBLIC_GA_MEASUREMENT_ID env var
 *
 * Renders nothing when no ID is available.
 */
export default function GoogleAnalytics({
  measurementId: propMeasurementId,
}: {
  measurementId?: string
}) {
  const measurementId =
    propMeasurementId?.trim() || process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID

  if (!measurementId) {
    return null
  }

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${measurementId}`}
        strategy="lazyOnload"
      />
      <Script id="ga-init" strategy="lazyOnload">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${measurementId}', {
            page_path: window.location.pathname,
          });
        `}
      </Script>
    </>
  )
}
