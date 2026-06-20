"use client"

import { usePathname } from "next/navigation"
import {
  ProductDetailSkeleton,
  ListingSkeleton,
} from "@modules/skeletons/templates/page-skeletons"

/**
 * The `[...slug]` catch-all renders BOTH single products
 * (`/brand/category/handle`) and category/brand listings (`/category`).
 * loading.tsx gets no params, so we infer the type from the URL and show
 * the matching skeleton INSTANTLY on click — this is the "page opened,
 * content loading" feedback the user wanted (vs a frozen old page).
 *
 * Heuristic: products sit under ≥1 brand/category segment, so ≥2 path
 * segments → product detail; a single segment → a listing.
 */
export default function Loading() {
  const pathname = usePathname() || ""
  const segments = pathname.split("/").filter(Boolean)
  const isProductDetail = segments.length >= 2
  return isProductDetail ? <ProductDetailSkeleton /> : <ListingSkeleton />
}
