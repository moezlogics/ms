import { getBaseURL } from "@lib/util/env"

export type BreadcrumbItem = {
  name: string
  href?: string
}

type Props = {
  items: BreadcrumbItem[]
  countryCode: string
}

export default function BreadcrumbJsonLd({ items, countryCode }: Props) {
  const baseURL = getBaseURL()

  const itemListElement = items.map((item, i) => ({
    "@type": "ListItem",
    position: i + 1,
    name: item.name,
    ...(item.href
      ? {
          item: item.href.startsWith("http")
            ? item.href
            : `${baseURL}/${countryCode}${item.href}`,
        }
      : {}),
  }))

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement,
  }

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
    />
  )
}
