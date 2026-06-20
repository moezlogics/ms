import Script from "next/script"

/**
 * Meta (Facebook) Pixel client-side tracker.
 *
 * Injects the Pixel base code in the root <head>. Once loaded, the global
 * `fbq` function is available — `lib/analytics.ts` calls into it from the
 * same helpers that fire GA4 events, so admins get both platforms wired
 * up automatically.
 *
 * Pixel ID resolution order:
 *   1. `pixelId` prop (from admin site-settings — `meta_pixel_id`)
 *   2. NEXT_PUBLIC_META_PIXEL_ID env var
 *
 * Renders nothing when no ID is available.
 */
export default function MetaPixel({
  pixelId: propPixelId,
}: {
  pixelId?: string
}) {
  const pixelId =
    propPixelId?.trim() || process.env.NEXT_PUBLIC_META_PIXEL_ID

  if (!pixelId) {
    return null
  }

  return (
    <>
      <Script id="meta-pixel-init" strategy="lazyOnload">
        {`
          !function(f,b,e,v,n,t,s)
          {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
          n.callMethod.apply(n,arguments):n.queue.push(arguments)};
          if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
          n.queue=[];t=b.createElement(e);t.async=!0;
          t.src=v;s=b.getElementsByTagName(e)[0];
          s.parentNode.insertBefore(t,s)}(window, document,'script',
          'https://connect.facebook.net/en_US/fbevents.js');
          fbq('init', '${pixelId}');
          fbq('track', 'PageView');
        `}
      </Script>
      {/* Standard <noscript> fallback so the pixel still records a hit for
          users with JS disabled. Image is 1x1 transparent. */}
      <noscript>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          height="1"
          width="1"
          style={{ display: "none" }}
          src={`https://www.facebook.com/tr?id=${pixelId}&ev=PageView&noscript=1`}
          alt=""
        />
      </noscript>
    </>
  )
}
