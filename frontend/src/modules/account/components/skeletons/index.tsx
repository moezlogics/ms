/**
 * Reusable skeleton primitives for /account/* loading states.
 *
 * Pattern: thin wrappers over a `bg-surface animate-pulse` base so all
 * loading screens look unified, and `motion-reduce:animate-none` keeps
 * accessibility happy. Keep these dumb and non-interactive — Next.js
 * `loading.tsx` files import the matching list skeleton.
 */

const Bar = ({ className = "" }: { className?: string }) => (
  <div
    className={`bg-surface rounded animate-pulse motion-reduce:animate-none ${className}`}
    aria-hidden
  />
)

/** Header strip placeholder — title + subtitle line. */
export function PageHeaderSkeleton() {
  return (
    <header className="mb-5 small:mb-6 flex items-start gap-3">
      <Bar className="w-10 h-10 rounded-full shrink-0" />
      <div className="flex-1">
        <Bar className="w-40 h-5" />
        <Bar className="mt-2 w-72 max-w-full h-3" />
      </div>
    </header>
  )
}

/** Generic list-of-cards placeholder. Used for orders + transactions. */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="rounded-2xl bg-bg border border-line overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 px-5 py-4 border-b border-line last:border-b-0"
        >
          <Bar className="w-9 h-9 rounded-full shrink-0" />
          <div className="flex-1 min-w-0">
            <Bar className="w-1/2 h-3" />
            <Bar className="mt-2 w-1/3 h-2.5" />
          </div>
          <Bar className="w-16 h-3 shrink-0" />
        </div>
      ))}
    </div>
  )
}

/** Loyalty balance hero placeholder. */
export function BalanceCardSkeleton() {
  return (
    <div className="rounded-2xl bg-surface border border-line p-6 animate-pulse motion-reduce:animate-none">
      <Bar className="w-24 h-3" />
      <Bar className="mt-3 w-32 h-9" />
      <Bar className="mt-2 w-16 h-3" />
    </div>
  )
}

/** Address grid placeholder — two-column on desktop. */
export function AddressGridSkeleton() {
  return (
    <div className="grid grid-cols-1 small:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div
          key={i}
          className="rounded-2xl bg-bg border border-line p-5 flex flex-col gap-2"
        >
          <Bar className="w-32 h-3" />
          <Bar className="w-48 h-2.5" />
          <Bar className="w-40 h-2.5" />
          <Bar className="mt-2 w-24 h-3" />
        </div>
      ))}
    </div>
  )
}

/** Profile-form rows placeholder. */
export function ProfileFormSkeleton() {
  return (
    <div className="flex flex-col gap-y-8 w-full">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="flex flex-col gap-2">
          <Bar className="w-28 h-3" />
          <Bar className="w-full h-10 rounded-lg" />
        </div>
      ))}
    </div>
  )
}
