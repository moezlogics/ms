import { Metadata } from "next"
import { listBlogPosts, listBlogCategories } from "@lib/data/blog"
import { getSiteSettings } from "@lib/data/site-settings"
import { getBaseURL } from "@lib/util/env"
import { ROBOTS_INDEX } from "@lib/util/seo-url"
import BlogListClient from "@modules/blog/blog-list-client"

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSiteSettings()
  const siteName = settings.site_name || "Blog"
  const title = settings.seo_blog_title || "Journal"
  const description =
    settings.seo_blog_description ||
    "Stories, style notes and editorial picks from our team."
  const url = `${getBaseURL()}/blog`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "website",
      url,
      siteName,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
    alternates: {
      canonical: url,
    },
    robots: ROBOTS_INDEX,
  }
}

export default async function BlogPage() {
  const [{ posts }, categories, settings] = await Promise.all([
    listBlogPosts({ limit: 50 }),
    listBlogCategories(),
    getSiteSettings(),
  ])

  const siteName = settings.site_name || "Blog"
  const kicker = settings.seo_blog_kicker || "Journal"
  const heading = settings.seo_blog_heading || "Stories & Style Notes"
  const subline =
    settings.seo_blog_description ||
    "Discover our latest articles, lookbooks and style notes."

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: `${siteName} Journal`,
    description: subline,
    url: `${getBaseURL()}/blog`,
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, i) => ({
        "@type": "ListItem",
        position: i + 1,
        url: `${getBaseURL()}/blog/${post.handle}`,
        name: post.title,
      })),
    },
  }

  return (
    <div className="container-anvogue py-12 md:py-16">
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Page header */}
      <div className="text-center mb-12 md:mb-16">
        <span className="text-sub-display text-brand-secondary2 has-line-before">
          {kicker}
        </span>
        <h1 className="heading2 text-brand-black mt-3 mb-4">{heading}</h1>
        <p className="body1 text-brand-secondary max-w-2xl mx-auto">
          {subline}
        </p>
      </div>

      {/* Client-side filterable list */}
      <BlogListClient posts={posts} categories={categories} />
    </div>
  )
}
