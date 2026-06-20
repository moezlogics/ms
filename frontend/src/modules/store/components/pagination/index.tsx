"use client"

import { usePathname, useRouter, useSearchParams } from "next/navigation"

export function Pagination({
  page,
  totalPages,
  "data-testid": dataTestid,
}: {
  page: number
  totalPages: number
  "data-testid"?: string
}) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams)
    params.set("page", newPage.toString())
    router.push(`${pathname}?${params.toString()}`)
  }

  const pages: (number | "...")[] = []
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pages.push(i)
  } else if (page <= 4) {
    pages.push(1, 2, 3, 4, 5, "...", totalPages)
  } else if (page >= totalPages - 3) {
    pages.push(1, "...", totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
  } else {
    pages.push(1, "...", page - 1, page, page + 1, "...", totalPages)
  }

  return (
    <div className="flex justify-center items-center gap-1 mt-12" data-testid={dataTestid}>
      <button
        onClick={() => handlePageChange(page - 1)}
        disabled={page === 1}
        className="w-9 h-9 flex items-center justify-center rounded-full border border-line text-secondary hover:border-brand-black hover:text-brand-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Previous page"
      >
        <i className="ph ph-caret-left text-sm" aria-hidden />
      </button>

      {pages.map((p, i) =>
        p === "..." ? (
          <span key={`ellipsis-${i}`} className="w-9 h-9 flex items-center justify-center caption1 text-secondary">
            …
          </span>
        ) : (
          <button
            key={p}
            onClick={() => handlePageChange(p as number)}
            disabled={p === page}
            className={`w-9 h-9 flex items-center justify-center rounded-full caption1 font-medium transition-colors ${
              p === page
                ? "bg-brand-black text-white border border-brand-black"
                : "border border-line text-secondary hover:border-brand-black hover:text-brand-black"
            }`}
            aria-label={`Page ${p}`}
            aria-current={p === page ? "page" : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        onClick={() => handlePageChange(page + 1)}
        disabled={page === totalPages}
        className="w-9 h-9 flex items-center justify-center rounded-full border border-line text-secondary hover:border-brand-black hover:text-brand-black transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        aria-label="Next page"
      >
        <i className="ph ph-caret-right text-sm" aria-hidden />
      </button>
    </div>
  )
}
