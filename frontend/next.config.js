const checkEnvVariables = require("./check-env-variables")

checkEnvVariables()

/**
 * Medusa Cloud-related environment variables
 */
const S3_HOSTNAME = process.env.MEDUSA_CLOUD_S3_HOSTNAME
const S3_PATHNAME = process.env.MEDUSA_CLOUD_S3_PATHNAME

/**
 * @type {import('next').NextConfig}
 */
const nextConfig = {
  reactStrictMode: true,
  // Don't advertise the framework (minor hardening) + keep gzip on origin.
  poweredByHeader: false,
  compress: true,
  // Tree-shake big "barrel" packages so importing one helper/icon doesn't
  // pull the whole library into the shared bundle (cuts unused JS).
  experimental: {
    // Inline each route's CSS into the HTML <head> instead of shipping a
    // render-blocking <link rel="stylesheet">. PageSpeed flagged the 30KB
    // CSS bundle as the #1 render-blocking request (~1.7s on Slow 4G,
    // pushing FCP to 4.5s). Inlining removes that round-trip so first
    // paint can start the moment the HTML arrives. (Next 15.3+)
    inlineCss: true,
    // Client-side router cache. Without this (Next 15 default = 0s for
    // dynamic pages) EVERY navigation — even going BACK to a page you
    // just saw — re-renders on the server and shows the skeleton again.
    // With it, pages visited in the last N seconds are served instantly
    // from the in-browser cache, which is what makes navigation feel
    // like a native app. Prices/stock can be up to 60s stale during a
    // session — acceptable for this store.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
    // Route-specific CSS chunks instead of one big shared stylesheet — each
    // page only loads the CSS it actually needs (smaller, faster first
    // paint). Same setting our fast sister-site foodiespakistan uses.
    cssChunking: "strict",
    optimizePackageImports: [
      "lucide-react",
      "lodash",
      "@medusajs/icons",
      "@medusajs/ui",
      "@headlessui/react",
      "react-country-flag",
      "yet-another-react-lightbox",
    ],
  },
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    // Serve optimized images INLINE (display in browser) instead of Next's
    // default `attachment` — which forced a DOWNLOAD when an image was
    // opened in a new tab. Safe: we only optimize our own product images
    // from our own CDN, not arbitrary user uploads.
    contentDispositionType: "inline",
    // Allowed `quality` values for /_next/image. IMPORTANT: any `quality`
    // prop NOT in this list makes the optimizer return HTTP 400 → a BROKEN
    // image (this exact footgun blanked the mobile PDP main image when a
    // component used q=80). Keep this permissive so no quality value can
    // break an image.
    qualities: [50, 60, 70, 75, 80, 85, 90, 95, 100],
    // WebP ONLY — AVIF dropped on purpose. This origin is a single VPS
    // that ALSO runs the backend + CDN, and Next resizes images on-demand
    // with sharp. AVIF encoding costs 5-10× the CPU of WebP, so rapid
    // navigation (each PDP = gallery + thumbs + related + FBT images)
    // generated a burst of expensive AVIF jobs that saturated the CPU and
    // queued the actual SSR page renders behind them — the exact "stuck
    // skeleton after 6-7 pages, worst on PDP" symptom. WebP is ~smaller
    // than the JPEG/PNG source and decodes everywhere; the tiny size
    // difference vs AVIF is irrelevant once Cloudflare caches the result.
    formats: ["image/webp"],
    // Fewer candidate widths = fewer distinct resize jobs AND a higher CDN
    // cache-hit rate (every extra width is another cold sharp job). Dropped
    // only the huge 2048/3840 desktop-retina widths — pointless on a
    // mobile-first store and the most expensive to encode. imageSizes is
    // LEFT at Next's default so tiny icons (flags/avatars at 16-32px) stay
    // crisp; the real CPU win is AVIF-drop + dropping 2048/3840.
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
    minimumCacheTTL: 60 * 60 * 24 * 30,
    remotePatterns: [
      // This store's production CDN — explicit so optimization works even
      // if NEXT_PUBLIC_CDN_URL isn't present at build time.
      { protocol: "https", hostname: "cdn.mobilestore.pk" },
      {
        protocol: "http",
        hostname: "localhost",
      },
      {
        // Self-hosted CDN (development)
        protocol: "http",
        hostname: "localhost",
        port: "3061",
      },
      {
        protocol: "https",
        hostname: "medusa-public-images.s3.eu-west-1.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.amazonaws.com",
      },
      {
        protocol: "https",
        hostname: "medusa-server-testing.s3.us-east-1.amazonaws.com",
      },
      ...(S3_HOSTNAME && S3_PATHNAME
        ? [
            {
              protocol: "https",
              hostname: S3_HOSTNAME,
              pathname: S3_PATHNAME,
            },
          ]
        : []),
      // Self-hosted CDN (production) — add your CDN domain here
      ...(process.env.NEXT_PUBLIC_CDN_URL
        ? [
            {
              protocol: new URL(process.env.NEXT_PUBLIC_CDN_URL).protocol.replace(":", ""),
              hostname: new URL(process.env.NEXT_PUBLIC_CDN_URL).hostname,
            },
          ]
        : []),
    ],
    dangerouslyAllowSVG: true,
  },
  /**
   * The `/account/setup` onboarding wizard was retired in May 2026 in
   * favour of inline "finish your profile" nudges on the dashboard.
   * The page used to live at `src/app/[countryCode]/(main)/account/
   * @dashboard/setup/page.tsx`, but since it sat inside a parallel
   * route slot (`@dashboard`), calling `redirect()` from it during
   * static prerender crashed Next.js with
   * `Cannot read properties of undefined (reading 'entryCSSFiles')`.
   *
   * Doing the redirect at the framework level (here) avoids the slot
   * prerender path entirely. Any old bookmark or email link still
   * lands the shopper on the account dashboard.
   */
  /**
   * Baseline security headers for every storefront response.
   *
   * Deliberately conservative — no Content-Security-Policy here, since
   * a wrong CSP silently breaks inline scripts / analytics / payment
   * widgets. Add CSP at the nginx layer once it can be tested against
   * the live page. These headers are all safe with the current app.
   */
  async headers() {
    return [
      {
        // Self-hosted icon fonts — versioned-by-path, safe to cache
        // forever (browser + Cloudflare). Saves ~460KB on repeat visits.
        source: "/icons/phosphor/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        source: "/:path*",
        headers: [
          {
            key: "Strict-Transport-Security",
            value: "max-age=31536000; includeSubDomains",
          },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          {
            key: "Referrer-Policy",
            value: "strict-origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
    ]
  },
  async redirects() {
    return [
      // Retired /account/setup wizard — points old links at the
      // dashboard instead of crashing the parallel-slot prerender.
      {
        source: "/account/setup",
        destination: "/account",
        permanent: true,
      },
      {
        source: "/:country([a-z]{2})/account/setup",
        destination: "/:country/account",
        permanent: true,
      },
      // The standalone /search page was removed in favour of the
      // inline SmartSearchBar overlay. Doing the redirect at the
      // framework level (instead of `redirect()` inside a server
      // component) keeps the build path simpler and avoids any
      // chance of the same prerender crash class biting a future
      // refactor.
      {
        source: "/search",
        destination: "/",
        permanent: true,
      },
      {
        source: "/:country([a-z]{2})/search",
        destination: "/:country",
        permanent: true,
      },
    ]
  },
}

module.exports = nextConfig
