import {
  PageHeaderSkeleton,
  BalanceCardSkeleton,
  ListSkeleton,
} from "@modules/account/components/skeletons"

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton />
      <div className="flex flex-col gap-6">
        <BalanceCardSkeleton />
        <ListSkeleton rows={5} />
      </div>
    </div>
  )
}
