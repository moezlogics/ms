"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { CompareItem } from "./context"
import { useSiteSettings } from "@lib/context/site-settings-context"

/**
 * Reusable product picker for the compare system.
 *
 * Used in two places:
 *   • the floating tray's "+ Add" slot
 *   • the /compare page's empty slots
 *
 * It searches the lightweight `/api/products-search` index (cached
 * for the whole session) and filters down to products that:
 *   1. aren't already in the compare list (`excludeHandles`),
 *   2. are comparable (`metadata.comparable !== false`),
 *   3. share the active comparison category (when one is set), and
 *   4. match the typed query.
 *
 * The parent owns positioning; this component only renders the panel
 * (search box + results) and reports a pick via `onPick`.
 */

type SearchProduct = {
  id: string
  title: string
  handle: string
  thumbnail?: string | null
  categories?: { id: string; name?: string }[]
  metadata?: Record<string, any> | null
}

// Session-wide cache so opening the picker repeatedly doesn't re-fetch.
let cached: SearchProduct[] | null = null
let inflight: Promise<SearchProduct[]> | null = null

function loadIndex(): Promise<SearchProduct[]> {
  if (cached) return Promise.resolve(cached)
  if (inflight) return inflight
  inflight = fetch("/api/products-search")
    .then((r) => (r.ok ? r.json() : { products: [] }))
    .then((d) => {
      cached = (d?.products as SearchProduct[]) || []
      inflight = null
      return cached!
    })
    .catch(() => {
      inflight = null
      return []
    })
  return inflight
}

function toItem(p: SearchProduct): CompareItem {
  const cat = p.categories?.[0]
  return {
    handle: p.handle,
    title: p.title,
    thumbnail: p.thumbnail || null,
    categoryId: cat?.id ?? null,
    categoryName: cat?.name ?? null,
  }
}

type Props = {
  categoryId?: string | null
  categoryName?: string | null
  excludeHandles: string[]
  onPick: (item: CompareItem) => void
  onClose: () => void
  className?: string
}

export default function CompareSearchPopover({
  categoryId,
  categoryName,
  excludeHandles,
  onPick,
  onClose,
  className = "",
}: Props) {
  const { aspectClass: globalAspectClass } = useSiteSettings()
  const [all, setAll] = useState<SearchProduct[]>(cached || [])
  const [query, setQuery] = useState("")
  const [loading, setLoading] = useState(!cached)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let alive = true
    if (!cached) {
      loadIndex().then((list) => {
        if (alive) {
          setAll(list)
          setLoading(false)
        }
      })
    }
    // Focus the search box as soon as the popover opens.
    inputRef.current?.focus()
    return () => {
      alive = false
    }
  }, [])

  const exclude = useMemo(
    () => new Set(excludeHandles.map((h) => h)),
    [excludeHandles]
  )

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    const out: SearchProduct[] = []
    for (const p of all) {
      if (!p.handle || exclude.has(p.handle)) continue
      if (p.metadata?.comparable === false) continue
      if (categoryId && !p.categories?.some((c) => c.id === categoryId)) continue
      if (q && !(p.title || "").toLowerCase().includes(q)) continue
      out.push(p)
      if (out.length >= 30) break
    }
    return out
  }, [all, query, exclude, categoryId])

  return (
    <div
      className={`flex flex-col w-full overflow-hidden rounded-xl border border-line bg-bg shadow-[0_20px_50px_-12px_rgb(0_0_0/0.35)] ${className}`}
    >
      {/* Header / search input */}
      <div className="flex items-center gap-2 p-2.5 border-b border-line bg-surface/60">
        <div className="relative flex-1 min-w-0">
          <i
            className="ph ph-magnifying-glass absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/40 text-sm"
            aria-hidden
          />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              categoryName ? `Search in ${categoryName}…` : "Search products…"
            }
            className="w-full h-9 pl-8 pr-3 text-sm bg-bg border border-line rounded-lg focus:outline-none focus:border-primary transition-colors"
          />
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close search"
          className="shrink-0 w-8 h-8 inline-flex items-center justify-center rounded-lg text-ink/50 hover:text-ink hover:bg-surface transition-colors"
        >
          <i className="ph-bold ph-x text-sm" aria-hidden />
        </button>
      </div>

      {/* Results */}
      <div className="max-h-[280px] overflow-y-auto overscroll-contain divide-y divide-line">
        {loading ? (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-ink/50">
            <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Loading products…
          </div>
        ) : results.length === 0 ? (
          <div className="px-4 py-8 text-center text-xs text-ink/50">
            {query.trim()
              ? "No matching products found"
              : categoryName
              ? `No more products to add in ${categoryName}`
              : "No products available to add"}
          </div>
        ) : (
          results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => onPick(toItem(p))}
              className="w-full px-3 py-2.5 text-left hover:bg-primary/5 active:bg-primary/10 transition-colors flex items-center gap-3"
            >
              <span className={`relative w-10 shrink-0 rounded-lg overflow-hidden bg-surface border border-line flex items-center justify-center ${globalAspectClass}`}>
                {p.thumbnail ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={p.thumbnail}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <i className="ph ph-image text-ink/30" aria-hidden />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-ink line-clamp-2 leading-snug">
                  {p.title}
                </span>
                {p.categories?.[0]?.name && (
                  <span className="block text-[11px] text-ink/45 mt-0.5">
                    {p.categories[0].name}
                  </span>
                )}
              </span>
              <i
                className="ph-bold ph-plus text-primary text-sm shrink-0"
                aria-hidden
              />
            </button>
          ))
        )}
      </div>
    </div>
  )
}
