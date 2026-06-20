import {
  PageHeaderSkeleton,
  AddressGridSkeleton,
} from "@modules/account/components/skeletons"

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton />
      <AddressGridSkeleton />
    </div>
  )
}
