import { Metadata } from "next"
import { getSiteSettings } from "@lib/data/site-settings"
import { publicSeo } from "@lib/util/seo-url"
import PolicyPage from "@modules/common/components/policy-page"

export async function generateMetadata(): Promise<Metadata> {
  const s = await getSiteSettings()
  const siteName = s.site_name?.trim() || undefined
  return publicSeo({
    path: "/about",
    title: s.page_about_title?.trim() || "About Us",
    description:
      s.site_tagline?.trim() ||
      `Learn more about ${siteName || "us"} \u2014 our story, values and mission.`,
    image: s.seo_default_og_image?.trim() || undefined,
    siteName,
  })
}

export default async function AboutPage() {
  const s = await getSiteSettings()

  return (
    <PolicyPage
      title={s.page_about_title}
      content={s.page_about_content}
      defaultTitle="About Us"
      defaultContent="<p>We are a passionate team dedicated to bringing you the best products and shopping experience. Our story, values, and mission will be shared here.</p>"
    />
  )
}
