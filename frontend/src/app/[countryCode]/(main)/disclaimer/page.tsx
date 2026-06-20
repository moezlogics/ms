import { Metadata } from "next"
import { getSiteSettings } from "@lib/data/site-settings"
import { publicSeo } from "@lib/util/seo-url"
import PolicyPage from "@modules/common/components/policy-page"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  const siteName = s.site_name?.trim() || undefined
  return publicSeo({
    path: "/disclaimer",
    title: s.page_disclaimer_title?.trim() || "Disclaimer",
    description: `Disclaimer for ${siteName || "this site"} \u2014 limits of liability and the scope of information we publish.`,
    image: s.seo_default_og_image?.trim() || undefined,
    siteName,
  })
}

export default async function DisclaimerPage() {
  const s = await getSiteSettings()

  return (
    <PolicyPage
      title={s.page_disclaimer_title}
      content={s.page_disclaimer_content}
      defaultTitle="Disclaimer"
      defaultContent="<p>The information provided on this website is for general informational purposes only. We make no representations or warranties of any kind, express or implied, about the completeness, accuracy, or reliability of the information.</p><p>Please update this content from the admin panel under <strong>Site Settings → Disclaimer Page</strong>.</p>"
    />
  )
}
