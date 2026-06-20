import { Metadata } from "next"
import NotFoundVariants from "@modules/common/components/not-found-variants"

/**
 * Global 404. Next.js renders this with HTTP status 404 automatically
 * when `notFound()` is called from a server component or when no route
 * matches. The actual UI is a client component that randomly picks one
 * of several creative layouts on every visit so the page never feels
 * stale.
 */
export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist.",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return <NotFoundVariants />
}
