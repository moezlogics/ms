import { Metadata } from "next"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist.",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return (
    <div className="container-anvogue min-h-[calc(100vh-64px)] flex flex-col items-center justify-center text-center py-16">
      <h1 className="heading2 text-brand-black mb-3">Page not found</h1>
      <p className="body1 text-brand-secondary max-w-md mb-6">
        We couldn&rsquo;t find the page you tried to reach.
      </p>
      <LocalizedClientLink href="/" className="button-main">
        Back to Home
      </LocalizedClientLink>
    </div>
  )
}
