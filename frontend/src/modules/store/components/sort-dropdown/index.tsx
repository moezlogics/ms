"use client"

import { Popover, PopoverButton, PopoverPanel, Transition } from "@headlessui/react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { Fragment, useCallback, useMemo } from "react"
import type { SortOptions } from "../refinement-list/sort-products"

const OPTIONS: { value: SortOptions; label: string }[] = [
  { value: "created_at", label: "Latest" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
]

/**
 * Sort dropdown — Shopify-style trigger showing the active sort and
 * opening a floating menu with the options. Replaces the previous row
 * of chip buttons for a more professional, space-efficient UI.
 */
const SortDropdown = ({ sortBy }: { sortBy: SortOptions }) => {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const current = useMemo(
    () => OPTIONS.find((o) => o.value === sortBy) || OPTIONS[0],
    [sortBy]
  )

  const setSort = useCallback(
    (value: SortOptions) => {
      const params = new URLSearchParams(searchParams)
      params.set("sortBy", value)
      params.delete("page")
      router.push(`${pathname}?${params.toString()}`, { scroll: false })
    },
    [router, pathname, searchParams]
  )

  return (
    <Popover as="div" className="relative">
      <PopoverButton className="inline-flex items-center gap-1.5 h-9 px-4 rounded-full border border-line text-sm text-ink hover:border-ink/50 transition-colors focus:outline-none">
        <span className="text-ink/55">Sort:</span>
        <span className="font-medium">{current.label}</span>
        <i className="ph ph-caret-down text-[11px]" aria-hidden />
      </PopoverButton>
      <Transition
        as={Fragment}
        enter="transition ease-out duration-150"
        enterFrom="opacity-0 -translate-y-1"
        enterTo="opacity-100 translate-y-0"
        leave="transition ease-in duration-100"
        leaveFrom="opacity-100 translate-y-0"
        leaveTo="opacity-0 -translate-y-1"
      >
        <PopoverPanel className="absolute right-0 mt-2 w-52 bg-bg border border-line rounded-large shadow-pop z-30 p-1 focus:outline-none">
          {({ close }) => (
            <ul className="flex flex-col">
              {OPTIONS.map((opt) => (
                <li key={opt.value}>
                  <button
                    onClick={() => {
                      setSort(opt.value)
                      close()
                    }}
                    className={`w-full flex items-center justify-between gap-3 px-3 py-2 rounded-base text-sm text-left transition-colors ${
                      opt.value === sortBy
                        ? "bg-surface text-ink font-medium"
                        : "text-ink/80 hover:bg-surface"
                    }`}
                  >
                    {opt.label}
                    {opt.value === sortBy && (
                      <i className="ph-bold ph-check text-[12px]" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </PopoverPanel>
      </Transition>
    </Popover>
  )
}

export default SortDropdown
