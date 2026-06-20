/**
 * Reusable layout for admin-managed static pages (Privacy, Terms, etc.)
 * Content is rendered as HTML (set by admin via site-settings).
 */
export default function PolicyPage({
  title,
  content,
  defaultTitle,
  defaultContent,
}: {
  title?: string
  content?: string
  defaultTitle: string
  defaultContent: string
}) {
  const pageTitle = title?.trim() || defaultTitle
  const pageContent = content?.trim() || defaultContent

  return (
    <div className="container-anvogue py-12 md:py-16">
      <div className="max-w-3xl mx-auto">
        <h1 className="heading2 mb-8">{pageTitle}</h1>
        <div
          className="prose prose-sm md:prose-base max-w-none text-secondary leading-relaxed"
          dangerouslySetInnerHTML={{ __html: pageContent }}
        />
      </div>
    </div>
  )
}
