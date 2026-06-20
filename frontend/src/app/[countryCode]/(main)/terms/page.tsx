import { Metadata } from "next"
import { getSiteSettings } from "@lib/data/site-settings"
import { publicSeo } from "@lib/util/seo-url"
import PolicyPage from "@modules/common/components/policy-page"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  const siteName = s.site_name?.trim() || undefined
  return publicSeo({
    path: "/terms",
    title: s.page_terms_title?.trim() || "Terms & Conditions",
    description: `Terms and conditions for using ${siteName || "this site"} \u2014 the rules, your rights and our obligations.`,
    image: s.seo_default_og_image?.trim() || undefined,
    siteName,
  })
}

export default async function TermsPage() {
  const s = await getSiteSettings()

  return (
    <PolicyPage
      title={s.page_terms_title}
      content={s.page_terms_content}
      defaultTitle="Terms & Conditions"
      defaultContent="<p>By accessing and using this website, you accept and agree to be bound by the terms and provisions of this agreement.</p><p>Please update this content from the admin panel under <strong>Site Settings → Terms &amp; Conditions Page</strong>.</p>"
    />
  )
}
