import { Metadata } from "next"
import { getSiteSettings } from "@lib/data/site-settings"
import { publicSeo } from "@lib/util/seo-url"
import PolicyPage from "@modules/common/components/policy-page"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  const siteName = s.site_name?.trim() || undefined
  return publicSeo({
    path: "/privacy",
    title: s.page_privacy_title?.trim() || "Privacy Policy",
    description: `Read the ${siteName || "store"} privacy policy \u2014 how we collect, use and protect your personal information.`,
    image: s.seo_default_og_image?.trim() || undefined,
    siteName,
  })
}

export default async function PrivacyPage() {
  const s = await getSiteSettings()

  return (
    <PolicyPage
      title={s.page_privacy_title}
      content={s.page_privacy_content}
      defaultTitle="Privacy Policy"
      defaultContent="<p>Your privacy is important to us. This Privacy Policy explains how we collect, use, and protect your personal information when you use our services.</p><p>Please update this content from the admin panel under <strong>Site Settings → Privacy Policy Page</strong>.</p>"
    />
  )
}
