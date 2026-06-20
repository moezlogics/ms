import Script from "next/script"

/**
 * Renders admin-supplied raw HTML into the document <head>.
 *
 * Use cases:
 *   - Search Console / Bing / Pinterest verification meta tags
 *   - Google AdSense / publisher tags
 *   - Third-party analytics snippets (Hotjar, Clarity, Plausible, GTM)
 *   - Any custom <script>, <meta>, or <link> tags the admin needs site-wide
 *
 * Implementation note:
 *   React's `dangerouslySetInnerHTML` only works on a single element, and
 *   raw HTML can't be embedded inside a <script>. We therefore emit a tiny
 *   bootstrap script that calls `document.head.insertAdjacentHTML('beforeend', ...)`
 *   on the client. Modern crawlers (Googlebot, Bingbot) execute JavaScript
 *   and pick up the injected meta/verification tags; for visible scripts
 *   like AdSense this is the same path Shopify, WordPress and Webflow use.
 *
 * Security:
 *   This field is admin-only — the same trust boundary as `seo_home_title`
 *   or any other site-settings value. Never expose it to untrusted users.
 */
export default function CustomHeadCode({ html }: { html?: string }) {
  if (!html?.trim()) return null

  return (
    <style
      dangerouslySetInnerHTML={{
        __html: `</style>${html}<style>`,
      }}
    />
  )
}
