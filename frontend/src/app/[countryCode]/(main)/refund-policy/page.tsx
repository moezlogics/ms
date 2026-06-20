import { Metadata } from "next"
import { getSiteSettings } from "@lib/data/site-settings"
import { publicSeo } from "@lib/util/seo-url"
import PolicyPage from "@modules/common/components/policy-page"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  const siteName = s.site_name?.trim() || undefined
  return publicSeo({
    path: "/refund-policy",
    title: s.page_refund_title?.trim() || "Refund & Return Policy",
    description: `Refund and return policy for ${siteName || "our store"} \u2014 how returns work, eligibility windows and timelines.`,
    image: s.seo_default_og_image?.trim() || undefined,
    siteName,
  })
}

export default async function RefundPolicyPage() {
  const s = await getSiteSettings()

  return (
    <PolicyPage
      title={s.page_refund_title}
      content={s.page_refund_content}
      defaultTitle="Refund & Return Policy"
      defaultContent="<p>We want you to be completely satisfied with your purchase. If you are not satisfied for any reason, you may return most items within 30 days of delivery for a full refund of the purchase price.</p><p>Please update this content from the admin panel under <strong>Site Settings → Refund &amp; Return Policy Page</strong>.</p>"
    />
  )
}
