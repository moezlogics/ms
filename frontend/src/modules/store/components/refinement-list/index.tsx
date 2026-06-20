"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { SortOptions } from "./sort-products"

type RefinementListProps = {
  sortBy: SortOptions
  "data-testid"?: string
}

const sortOptions: { value: SortOptions; label: string }[] = [
  { value: "created_at", label: "Latest" },
  { value: "price_asc", label: "Price: Low → High" },
  { value: "price_desc", label: "Price: High → Low" },
]

const RefinementList = ({
  sortBy,
  "data-testid": dataTestId,
}: RefinementListProps) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const setSort = useCallback(
    (value: SortOptions) => {
      const params = new URLSearchParams(searchParams)
      params.set("sortBy", value)
      router.push(`${pathname}?${params.toString()}`)
    },
    [router, pathname, searchParams]
  )

  return (
    <div
      className="flex items-center gap-2 flex-wrap"
      data-testid={dataTestId}
    >
      <span className="caption2 text-secondary uppercase tracking-wider mr-1">Sort:</span>
      {sortOptions.map((opt) => (
        <button
          key={opt.value}
          onClick={() => setSort(opt.value)}
          className={`caption2 px-3 py-1.5 rounded-full border transition-colors ${
            sortBy === opt.value
              ? "border-brand-black bg-brand-black text-white"
              : "border-line text-secondary hover:border-brand-black hover:text-brand-black"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

export default RefinementList
