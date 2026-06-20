import { Metadata } from "next"
import { notFound } from "next/navigation"
import Image from "next/image"
import { getBlogPostByHandle } from "@lib/data/blog"
import { getSiteSettings } from "@lib/data/site-settings"
import { canonicalUrl } from "@lib/util/seo-url"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

type Props = {
  params: Promise<{ countryCode: string; handle: string }>
}

// Generate metadata dynamically for each blog post (SEO)
export async function generateMetadata(props: Props): Promise<Metadata> {
  const params = await props.params
  const [post, settings] = await Promise.all([
    getBlogPostByHandle(params.handle),
    getSiteSettings(),
  ])

  if (!post) {
    return { title: "Post Not Found" }
  }

  const siteName = settings.site_name || "Blog"
  const title = post.seo_title || post.title
  const description =
    post.seo_description ||
    post.excerpt ||
    (post.content ? post.content.replace(/<[^>]*>/g, "").substring(0, 160) : "")
  const url = canonicalUrl(`/blog/${post.handle}`)
  const keywords = post.seo_keywords
    ? post.seo_keywords.split(",").map((k: string) => k.trim())
    : undefined

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: "article",
      url,
      siteName,
      publishedTime: post.published_at || post.created_at,
      modifiedTime: post.updated_at,
      authors: [siteName],
      tags: post.categories.map((c) => c.name),
      ...(post.featured_image
        ? {
            images: [
              {
                url: post.featured_image,
                alt: post.featured_image_alt || post.title,
                width: 1200,
                height: 630,
              },
            ],
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(post.featured_image
        ? { images: [post.featured_image] }
        : {}),
    },
    alternates: { canonical: url },
    robots: {
      index: true,
      follow: true,
      googleBot: {
        index: true,
        follow: true,
        "max-image-preview": "large",
        "max-snippet": -1,
      },
    },
  }
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function estimateReadTime(html: string | null) {
  if (!html) return "1 min read"
  const text = html.replace(/<[^>]*>/g, "")
  const words = text.split(/\s+/).length
  const minutes = Math.max(1, Math.ceil(words / 200))
  return `${minutes} min read`
}

export default async function BlogPostPage(props: Props) {
  const params = await props.params
  const [post, settings] = await Promise.all([
    getBlogPostByHandle(params.handle),
    getSiteSettings(),
  ])

  if (!post) {
    notFound()
  }

  const baseUrl = canonicalUrl("/").replace(/\/$/, "")
  const siteName = settings.site_name || "Blog"

  // JSON-LD structured data for BlogPosting — uses live site settings so the
  // publisher reflects whatever the admin has configured (name + logo).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description:
      post.seo_description ||
      post.excerpt ||
      (post.content
        ? post.content.replace(/<[^>]*>/g, "").substring(0, 160)
        : ""),
    url: `${baseUrl}/blog/${post.handle}`,
    datePublished: post.published_at || post.created_at,
    dateModified: post.updated_at,
    author: {
      "@type": "Organization",
      name: siteName,
    },
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: baseUrl,
      ...(settings.site_logo_url
        ? {
            logo: {
              "@type": "ImageObject",
              url: settings.site_logo_url,
            },
          }
        : {}),
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `${baseUrl}/blog/${post.handle}`,
    },
    ...(post.featured_image
      ? {
          image: {
            "@type": "ImageObject",
            url: post.featured_image,
            caption: post.featured_image_alt || post.title,
          },
        }
      : {}),
    ...(post.seo_keywords
      ? {
          keywords: post.seo_keywords,
        }
      : {}),
    articleSection: post.categories.map((c) => c.name).join(", "),
  }

  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: baseUrl,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Blog",
        item: `${baseUrl}/blog`,
      },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${baseUrl}/blog/${post.handle}`,
      },
    ],
  }

  return (
    <div className="bg-white">
      {/* JSON-LD */}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      {/* Hero / Featured Image */}
      {post.featured_image && (
        <div className="relative w-full overflow-hidden bg-surface" style={{ height: 520 }}>
          <Image
            src={post.featured_image}
            alt={post.featured_image_alt || post.title}
            fill
            style={{ objectFit: "cover" }}
            priority
            sizes="100vw"
          />
        </div>
      )}

      {/* Article */}
      <article className="container-anvogue max-w-3xl mx-auto py-10 md:py-16">
        {/* Breadcrumb */}
        <nav
          className="mb-6 caption1 text-brand-secondary2"
          aria-label="Breadcrumb"
        >
          <ol className="flex items-center gap-1.5">
            <li>
              <LocalizedClientLink
                href="/"
                className="hover:text-brand-black transition-colors"
              >
                Home
              </LocalizedClientLink>
            </li>
            <li aria-hidden>/</li>
            <li>
              <LocalizedClientLink
                href="/blog"
                className="hover:text-brand-black transition-colors"
              >
                Blog
              </LocalizedClientLink>
            </li>
            <li aria-hidden>/</li>
            <li className="text-brand-secondary truncate max-w-[200px]">
              {post.title}
            </li>
          </ol>
        </nav>

        {/* Categories */}
        {post.categories.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {post.categories.map((cat) => (
              <span
                key={cat.id}
                className="text-button-uppercase px-3 py-1 rounded-full bg-brand-green text-brand-black"
              >
                {cat.name}
              </span>
            ))}
          </div>
        )}

        {/* Title */}
        <h1 className="heading1 text-brand-black mb-4">{post.title}</h1>

        {/* Meta: date + read time */}
        <div className="flex items-center gap-3 caption1 text-brand-secondary mb-8 pb-8 border-b border-line">
          <time dateTime={post.published_at || post.created_at}>
            {formatDate(post.published_at || post.created_at)}
          </time>
          <span aria-hidden>·</span>
          <span>{estimateReadTime(post.content)}</span>
        </div>

        {/* Excerpt */}
        {post.excerpt && (
          <p className="body1 text-brand-secondary leading-relaxed mb-8 italic border-l-4 border-brand-green pl-4">
            {post.excerpt}
          </p>
        )}

        {/* Content */}
        <div
          className="prose prose-lg max-w-none
            prose-headings:font-semibold prose-headings:text-brand-black
            prose-p:text-brand-black prose-p:leading-relaxed
            prose-a:text-brand-black prose-a:underline hover:prose-a:text-brand-secondary
            prose-img:rounded-2xl prose-img:shadow-anvogue-xs
            prose-blockquote:border-l-brand-green prose-blockquote:text-brand-secondary
            prose-code:bg-surface prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded
            prose-pre:bg-brand-black prose-pre:text-white
            prose-strong:text-brand-black"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: post.content || "" }}
        />

        {/* Bottom navigation */}
        <div className="mt-12 pt-8 border-t border-line">
          <LocalizedClientLink
            href="/blog"
            className="inline-flex items-center gap-2 text-button-uppercase text-brand-black hover:text-brand-secondary transition-colors"
          >
            <i className="ph-bold ph-arrow-left text-base" aria-hidden />
            Back to all posts
          </LocalizedClientLink>
        </div>
      </article>
    </div>
  )
}
