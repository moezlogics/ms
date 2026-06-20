import {
  PageHeaderSkeleton,
  ProfileFormSkeleton,
} from "@modules/account/components/skeletons"

export default function Loading() {
  return (
    <div className="w-full" aria-busy="true" aria-live="polite">
      <PageHeaderSkeleton />
      <ProfileFormSkeleton />
    </div>
  )
}
