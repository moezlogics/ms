import {
  PageHeaderSkeleton,
  ListSkeleton,
} from "@modules/account/components/skeletons"

/**
 * Next.js streams this file's output while the orders page server
 * component awaits `listOrders()`. Mirrors the real page's layout so
 * there's no jump when the data resolves.
 */
export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton />
      <ListSkeleton rows={4} />
    </div>
  )
}
