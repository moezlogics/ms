"use client"

import Link from "next/link"
import React from "react"

/**
 * Use this component to create a Next.js `<Link />` with clean URLs.
 * Pakistan-only store — no country code prefix needed in URLs.
 * The middleware handles internal rewrites to /pk/... automatically.
 */
const LocalizedClientLink = ({
  children,
  href,
  prefetch = false,
  ...props
}: {
  children?: React.ReactNode
  href: string
  className?: string
  onClick?: () => void
  passHref?: true
  prefetch?: boolean
  [x: string]: any
}) => {
  return (
    <Link href={href} prefetch={prefetch} {...props}>
      {children}
    </Link>
  )
}

export default LocalizedClientLink
