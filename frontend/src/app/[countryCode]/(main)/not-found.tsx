import { Metadata } from "next"
import NotFoundVariants from "@modules/common/components/not-found-variants"

export const metadata: Metadata = {
  title: "Page not found",
  description: "The page you're looking for doesn't exist.",
  robots: { index: false, follow: true },
}

export default function NotFound() {
  return <NotFoundVariants />
}
