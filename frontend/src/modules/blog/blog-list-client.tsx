"use client"

import { useState } from "react"
import Image from "next/image"
import type { BlogPost, BlogCategory } from "@lib/data/blog"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

function formatDate(dateStr: string | null) {
  if (!dateStr) return ""
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })
}

function stripHtml(html: string | null) {
  if (!html) return ""
  return html.replace(/<[^>]*>/g, "").substring(0, 180)
}

/**
 * Anvogue blog list — category chip row (pill-shaped, hover→green) over a
 * 3-column magazine grid. Cards use bg-surface media wells, rounded-2xl
 * thumbnails and the same hover zoom used on product previews so the visual
 * language stays consistent across the site.
 */
export default function BlogListClient({
  posts,
  categories,
}: {
  posts: BlogPost[]
  categories: BlogCategory[]
}) {
  const [activeCategory, setActiveCategory] = useState<string | null>(null)

  const filtered = activeCategory
    ? posts.filter((p) =>
        p.categories.some((c) => c.handle === activeCategory)
      )
    : posts

  const chipBase =
    "px-5 py-2 rounded-full text-button-uppercase transition-all duration-200 border"
  const chipActive = "bg-brand-black text-white border-brand-black"
  const chipIdle =
    "bg-white text-brand-black border-line hover:border-brand-black hover:bg-brand-green"

  return (
    <>
      {/* Category filter chips */}
      {categories.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-12 justify-center">
          <button
            type="button"
            onClick={() => setActiveCategory(null)}
            className={`${chipBase} ${!activeCategory ? chipActive : chipIdle}`}
          >
            All Posts
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() =>
                setActiveCategory(
                  activeCategory === cat.handle ? null : cat.handle
                )
              }
              className={`${chipBase} ${
                activeCategory === cat.handle ? chipActive : chipIdle
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Posts grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="body1 text-brand-secondary2">No posts found.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {filtered.map((post) => (
            <article
              key={post.id}
              className="group bg-white rounded-2xl overflow-hidden box-shadow-xs hover:box-shadow-sm transition-all duration-300 border border-line"
            >
              <LocalizedClientLink href={`/blog/${post.handle}`}>
                {/* Featured image */}
                <div className="relative overflow-hidden aspect-[16/10] bg-surface">
                  {post.featured_image ? (
                    <Image
                      src={post.featured_image}
                      alt={post.featured_image_alt || post.title}
                      fill
                      className="object-cover group-hover:scale-105 transition-transform duration-500"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  ) : (
                    <div className="w-full h-full bg-surface flex items-center justify-center">
                      <i
                        className="ph ph-image text-5xl text-brand-secondary2"
                        aria-hidden
                      />
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="p-6">
                  {post.categories.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {post.categories.map((cat) => (
                        <span
                          key={cat.id}
                          className="text-button-uppercase px-2.5 py-0.5 rounded-full bg-brand-green text-brand-black"
                        >
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  )}

                  <h2 className="heading6 text-brand-black mb-2 group-hover:text-brand-secondary transition-colors line-clamp-2">
                    {post.title}
                  </h2>

                  <p className="body1 text-brand-secondary mb-3 line-clamp-3">
                    {post.excerpt || stripHtml(post.content)}
                  </p>

                  <time className="caption1 text-brand-secondary2">
                    {formatDate(post.published_at || post.created_at)}
                  </time>
                </div>
              </LocalizedClientLink>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
