  "use client"

  import { useState, useRef, useEffect } from "react"
  import { createPortal } from "react-dom"
  import { MagnifyingGlass, XMark } from "@medusajs/icons"
  import LocalizedClientLink from "@modules/common/components/localized-client-link"

  import { getProductPath } from "@lib/util/product"
  import { useSiteSettings } from "@lib/context/site-settings-context"

  interface SearchItem {
    id: string
    title: string
    handle: string
    thumbnail?: string
    description?: string
    categories?: any[]
    metadata?: any
  }

  // Global cache to prevent multiple fetches during session
  let cachedProducts: SearchItem[] | null = null
  let fetchPromise: Promise<SearchItem[]> | null = null

  function fetchAllSearchProducts(): Promise<SearchItem[]> {
    if (cachedProducts) return Promise.resolve(cachedProducts)
    if (fetchPromise) return fetchPromise

    fetchPromise = fetch("/api/products-search")
      .then((res) => {
        if (!res.ok) throw new Error("Search list failed")
        return res.json()
      })
      .then((data) => {
        cachedProducts = data?.products || []
        fetchPromise = null
        return cachedProducts!
      })
      .catch((err) => {
        console.error("[search-cache] Error loading search index:", err)
        fetchPromise = null
        return []
      })

    return fetchPromise
  }

  // Helper to escape regex special chars
  function escapeRegExp(string: string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  }

  // Helper to get allowed typo distance based on query word length
  function getTypoTolerance(word: string): number {
    const len = word.length
    if (len <= 2) return 0 // exact match only for very short words
    if (len <= 4) return 1 // 1 typo allowed for short-medium words
    return 2 // 2 typos allowed for longer words
  }

  // Damerau-Levenshtein distance for fuzzy matching (handles transpositions)
  function damerauLevenshteinDistance(a: string, b: string): number {
    const al = a.length
    const bl = b.length
    const d: number[][] = []
    
    for (let i = 0; i <= al; i++) {
      d[i] = []
      d[i][0] = i
    }
    for (let j = 0; j <= bl; j++) {
      d[0][j] = j
    }
    
    for (let i = 1; i <= al; i++) {
      for (let j = 1; j <= bl; j++) {
        const cost = a[i - 1] === b[j - 1] ? 0 : 1
        d[i][j] = Math.min(
          d[i - 1][j] + 1, // deletion
          d[i][j - 1] + 1, // insertion
          d[i - 1][j - 1] + cost // substitution
        )
        if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
          d[i][j] = Math.min(
            d[i][j],
            d[i - 2][j - 2] + cost // transposition
          )
        }
      }
    }
    return d[al][bl]
  }

  // Custom scoring search engine
  function searchProducts(products: SearchItem[], query: string): SearchItem[] {
    const cleanQuery = query.toLowerCase().trim()
    if (!cleanQuery) return []

    const queryWords = cleanQuery.split(/\s+/).filter(Boolean)
    if (queryWords.length === 0) return []

    const cleanQueryNoSpaces = cleanQuery.replace(/\s+/g, "")

    const scored = products.map((product) => {
      const title = (product.title || "").toLowerCase()
      const desc = (product.description || "").toLowerCase()
      let score = 0
      let matchesAllWords = true

      // Check if the space-omitted query matches space-omitted title directly as a substring
      // (e.g., "iphone13" matches "Apple iPhone 13")
      const cleanTitleNoSpaces = title.replace(/\s+/g, "")
      if (cleanTitleNoSpaces.includes(cleanQueryNoSpaces)) {
        score += 50
      }

      const titleWords = title.split(/\s+/).filter(Boolean)
      const descWords = desc.split(/\s+/).filter(Boolean)

      for (const qWord of queryWords) {
        let wordMatched = false
        let bestWordScore = 0

        // Exact match of title with the query word
        if (title === qWord) {
          bestWordScore = Math.max(bestWordScore, 100)
          wordMatched = true
        }

        // Check title words
        for (const tWord of titleWords) {
          const cleanTWord = tWord.replace(/[^a-z0-9]/g, "")
          const cleanQWord = qWord.replace(/[^a-z0-9]/g, "")
          if (!cleanQWord) continue

          if (cleanTWord === cleanQWord) {
            bestWordScore = Math.max(bestWordScore, 80)
            wordMatched = true
          } else if (cleanTWord.startsWith(cleanQWord)) {
            // prefix match
            const bonus = Math.round(50 * (cleanQWord.length / cleanTWord.length))
            bestWordScore = Math.max(bestWordScore, bonus)
            wordMatched = true
          } else if (cleanTWord.includes(cleanQWord)) {
            // substring match
            const bonus = Math.round(30 * (cleanQWord.length / cleanTWord.length))
            bestWordScore = Math.max(bestWordScore, bonus)
            wordMatched = true
          } else {
            // fuzzy match with Damerau-Levenshtein
            const maxDistance = getTypoTolerance(cleanQWord)
            const dist = damerauLevenshteinDistance(cleanQWord, cleanTWord)
            if (dist <= maxDistance) {
              const ratio = 1 - dist / Math.max(cleanQWord.length, cleanTWord.length)
              const bonus = Math.round(40 * ratio)
              bestWordScore = Math.max(bestWordScore, bonus)
              wordMatched = true
            }
          }
        }

        // If not matched in title words, check description
        if (!wordMatched) {
          for (const dWord of descWords) {
            const cleanDWord = dWord.replace(/[^a-z0-9]/g, "")
            const cleanQWord = qWord.replace(/[^a-z0-9]/g, "")
            if (!cleanQWord) continue

            if (cleanDWord === cleanQWord) {
              bestWordScore = Math.max(bestWordScore, 10)
              wordMatched = true
            } else if (cleanDWord.startsWith(cleanQWord)) {
              bestWordScore = Math.max(bestWordScore, 7)
              wordMatched = true
            } else {
              const maxDistance = getTypoTolerance(cleanQWord)
              const dist = damerauLevenshteinDistance(cleanQWord, cleanDWord)
              if (dist <= maxDistance) {
                bestWordScore = Math.max(bestWordScore, 5)
                wordMatched = true
              }
            }
          }
        }

        score += bestWordScore

        if (!wordMatched) {
          matchesAllWords = false
        }
      }

      if (matchesAllWords) score += 25
      if (title.startsWith(cleanQuery)) score += 40

      return { product, score }
    })

    return scored
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((item) => item.product)
  }

  // React custom Highlighter with fuzzy word highlighting
  function Highlight({ text, query }: { text: string; query: string }) {
    if (!query) return <>{text}</>
    const cleanQuery = query.trim().toLowerCase()
    if (!cleanQuery) return <>{text}</>
    
    const queryWords = cleanQuery.split(/\s+/).filter(Boolean)
    if (queryWords.length === 0) return <>{text}</>

    // Split text by whitespace to preserve spacings
    const parts = text.split(/(\s+)/)

    return (
      <>
        {parts.map((part, i) => {
          const cleanPart = part.toLowerCase().replace(/[^a-z0-9]/g, "")
          if (!cleanPart) return part // return whitespace/punctuation as is
          
          let isMatch = false
          for (const qWord of queryWords) {
            const cleanQWord = qWord.toLowerCase().replace(/[^a-z0-9]/g, "")
            if (!cleanQWord) continue

            const maxDistance = getTypoTolerance(cleanQWord)
            if (
              cleanPart.includes(cleanQWord) ||
              cleanQWord.includes(cleanPart) ||
              damerauLevenshteinDistance(cleanQWord, cleanPart) <= maxDistance
            ) {
              isMatch = true
              break
            }
          }

          if (isMatch) {
            return (
              <mark key={i} className="bg-primary/10 text-primary font-semibold rounded-[2px] px-0.5">
                {part}
              </mark>
            )
          }
          return part
        })}
      </>
    )
  }

  const RECENT_KEY = "recent_searches"
  const MAX_RECENT = 5

  const BACKEND_URL = process.env.NEXT_PUBLIC_MEDUSA_BACKEND_URL || ""
  const PUBLISHABLE_KEY = process.env.NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY || ""

  function getRecentSearches(): string[] {
    if (typeof window === "undefined") return []
    try {
      const raw = localStorage.getItem(RECENT_KEY)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  }

  function logSearchToBackend(query: string) {
    const q = (query || "").trim()
    if (!q || !BACKEND_URL) return
    try {
      fetch(`${BACKEND_URL}/store/search/log`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(PUBLISHABLE_KEY ? { "x-publishable-api-key": PUBLISHABLE_KEY } : {}),
        },
        body: JSON.stringify({ query: q }),
        keepalive: true,
      }).catch(() => {})
    } catch {}
  }

  async function fetchTrendingSearches(): Promise<string[]> {
    if (!BACKEND_URL) return []
    try {
      const res = await fetch(`${BACKEND_URL}/store/search/trending?limit=8`, {
        headers: PUBLISHABLE_KEY
          ? { "x-publishable-api-key": PUBLISHABLE_KEY }
          : undefined,
        cache: "default",
      })
      if (!res.ok) return []
      const data = (await res.json()) as { queries?: string[] }
      return Array.isArray(data?.queries) ? data.queries : []
    } catch {
      return []
    }
  }

  function saveRecentSearch(query: string) {
    if (!query.trim()) return
    try {
      const existing = getRecentSearches().filter(
        (s) => s.toLowerCase() !== query.toLowerCase()
      )
      existing.unshift(query.trim())
      localStorage.setItem(
        RECENT_KEY,
        JSON.stringify(existing.slice(0, MAX_RECENT))
      )
    } catch {}
    logSearchToBackend(query)
  }

  export default function SmartSearchBar() {
    const { aspectClass: globalAspectClass } = useSiteSettings()
    const [isOpen, setIsOpen] = useState(false)
    const [isMobileOpen, setIsMobileOpen] = useState(false)
    const [query, setQuery] = useState("")
    const [productsList, setProductsList] = useState<SearchItem[]>([])
    const [filteredHits, setFilteredHits] = useState<SearchItem[]>([])
    const [isLoading, setIsLoading] = useState(false)

    const dropdownRef = useRef<HTMLDivElement>(null)
    const desktopInputRef = useRef<HTMLInputElement>(null)
    const mobileInputRef = useRef<HTMLInputElement>(null)

    const [mounted, setMounted] = useState(false)
    const [recentSearches, setRecentSearches] = useState<string[]>([])
    const [trending, setTrending] = useState<string[]>([])

    useEffect(() => {
      setMounted(true)
      setRecentSearches(getRecentSearches())
      fetchTrendingSearches().then((q) => setTrending(q))
    }, [])

    const startLoadingProducts = () => {
      if (cachedProducts) {
        setProductsList(cachedProducts)
        return
      }
      setIsLoading(true)
      fetchAllSearchProducts()
        .then((items) => {
          setProductsList(items)
          setIsLoading(false)
        })
        .catch(() => setIsLoading(false))
    }

    // Trigger fuzzy filtering when query or productsList changes
    useEffect(() => {
      if (!query.trim()) {
        setFilteredHits([])
        return
      }
      const results = searchProducts(productsList, query)
      setFilteredHits(results)
    }, [query, productsList])

    // Auto-focus mobile input
    useEffect(() => {
      if (isMobileOpen && mobileInputRef.current) {
        setTimeout(() => mobileInputRef.current?.focus(), 80)
      }
    }, [isMobileOpen])

    // Lock body scroll when mobile search is open
    useEffect(() => {
      if (isMobileOpen) {
        document.body.style.overflow = "hidden"
      } else {
        document.body.style.overflow = ""
      }
      return () => { document.body.style.overflow = "" }
    }, [isMobileOpen])

    // Click outside — desktop only
    useEffect(() => {
      function handleClickOutside(event: MouseEvent) {
        if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
          setIsOpen(false)
        }
      }
      document.addEventListener("mousedown", handleClickOutside)
      return () => document.removeEventListener("mousedown", handleClickOutside)
    }, [])

    // Keyboard shortcut: Ctrl+K / Cmd+K to open search, Escape to close
    useEffect(() => {
      function handleShortcut(e: KeyboardEvent) {
        if ((e.metaKey || e.ctrlKey) && e.key === "k") {
          e.preventDefault()
          startLoadingProducts()
          if (window.innerWidth < 768) {
            setIsMobileOpen(true)
          } else {
            desktopInputRef.current?.focus()
            setIsOpen(true)
          }
        }
        if (e.key === "Escape") {
          setIsOpen(false)
          setIsMobileOpen(false)
        }
      }
      document.addEventListener("keydown", handleShortcut)
      return () => document.removeEventListener("keydown", handleShortcut)
    }, [])

    // Public method to open mobile search (used by bottom nav)
    useEffect(() => {
      const handler = () => {
        startLoadingProducts()
        setIsMobileOpen(true)
      }
      window.addEventListener("open-mobile-search", handler)
      return () => window.removeEventListener("open-mobile-search", handler)
    }, [])

    const closeMobile = () => {
      setIsMobileOpen(false)
      setQuery("")
    }

    const commitQuery = () => {
      const q = query.trim()
      if (q.length < 3) return
      saveRecentSearch(q)
      setRecentSearches(getRecentSearches())
    }

    const handleEnterKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === "Enter") {
        e.preventDefault()
        commitQuery()
      }
    }

    const renderHits = (compact?: boolean) => {
      const hits = filteredHits.slice(0, compact ? 8 : 10)

      if (hits.length === 0) {
        if (isLoading) {
          return (
            <div className="p-8 text-center text-sm text-ink/40">
              <div className="inline-block animate-spin rounded-full h-4 w-4 border-2 border-primary border-t-transparent mr-2 align-middle"></div>
              Loading search index...
            </div>
          )
        }
        return (
          <div className="p-8 text-center">
            <div className="flex flex-col items-center gap-2">
              <i className="ph ph-magnifying-glass text-2xl text-ink/30" aria-hidden />
              <span className="text-sm text-ink/55">No products found</span>
              <span className="text-[11px] text-ink/40">Try a different keyword</span>
            </div>
          </div>
        )
      }

      return (
        <ul className="grid grid-cols-1 p-2 gap-1">
          {hits.map((hit) => (
            <li key={hit.id}>
              <LocalizedClientLink
                href={getProductPath(hit)}
                onClick={() => {
                  saveRecentSearch(query)
                  setIsOpen(false)
                  setIsMobileOpen(false)
                  setQuery("")
                }}
                className="flex flex-row items-center gap-3 p-2.5 hover:bg-surface rounded-xl transition-all duration-200 group active:scale-[0.98]"
              >
                {hit.thumbnail && (
                  <div className={`relative shrink-0 overflow-hidden w-14 rounded-lg bg-surface border border-line group-hover:border-primary/40 transition-colors ${globalAspectClass}`}>
                    <img
                      src={hit.thumbnail}
                      alt={hit.title}
                      className="absolute inset-0 w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="flex flex-col gap-0.5 overflow-hidden flex-1 min-w-0">
                  <span className="text-sm font-semibold text-ink group-hover:text-primary transition-colors truncate">
                    <Highlight text={hit.title} query={query} />
                  </span>
                  {hit.description && (
                    <span className="text-[11px] text-ink/50 line-clamp-1">
                      <Highlight text={hit.description} query={query} />
                    </span>
                  )}
                </div>
                <i className="ph ph-arrow-right text-[12px] text-ink/25 group-hover:text-primary transition-colors shrink-0" aria-hidden />
              </LocalizedClientLink>
            </li>
          ))}
        </ul>
      )
    }

    const EmptyState = ({ onSelect }: { onSelect: (q: string) => void }) => (
      <div className="p-4 space-y-4">
        {recentSearches.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <i className="ph ph-clock-counter-clockwise text-[12px] text-ink/40" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">
                Recent
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {recentSearches.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => onSelect(s)}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-surface text-ink/70 text-[12px] font-medium border border-line hover:border-primary hover:text-primary hover:bg-primary/5 transition-all active:scale-95"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}

        {trending.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <i className="ph-fill ph-trend-up text-[12px] text-primary" aria-hidden />
              <span className="text-[11px] font-semibold uppercase tracking-wider text-ink/40">
                Trending
              </span>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {trending.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => onSelect(t)}
                  className="inline-flex items-center gap-1 h-7 px-3 rounded-full bg-primary/5 text-primary text-[12px] font-medium border border-primary/15 hover:bg-primary/10 hover:border-primary/30 transition-all active:scale-95"
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )

    return (
      <>
        {/* DESKTOP */}
        <div className="hidden medium:flex w-full max-w-xl relative group z-50" ref={dropdownRef}>
          <div className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
              <MagnifyingGlass className="text-ui-fg-muted" />
            </div>
            <input
              ref={desktopInputRef}
              type="search"
              value={query}
              onFocus={() => {
                setIsOpen(true)
                startLoadingProducts()
              }}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleEnterKey}
              className="w-full bg-ui-bg-subtle hover:bg-ui-bg-base border border-ui-border-base focus:border-ui-border-interactive focus:bg-white focus:ring-[3px] focus:ring-ui-border-interactive/20 rounded-search py-2.5 pl-10 pr-16 text-sm font-medium outline-none transition-all duration-300 shadow-sm"
              placeholder="Search products..."
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery("")}
                className="absolute inset-y-0 right-10 flex items-center text-ink/30 hover:text-ink transition-colors"
              >
                <XMark />
              </button>
            )}
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <kbd className="hidden lg:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-surface border border-line text-[10px] font-mono text-ink/40">
                ⌘K
              </kbd>
            </div>
          </div>
          
          {isOpen && (
            <div className="absolute top-[52px] left-0 right-0 bg-bg border border-line rounded-search shadow-[0_8px_30px_rgb(0,0,0,0.12)] overflow-hidden mt-1 animate-in fade-in slide-in-from-top-2 duration-200">
              {query.length > 0 ? (
                <>
                  <div className="px-4 py-2.5 bg-surface border-b border-line">
                    <span className="text-[11px] uppercase font-bold text-ink/50 tracking-wide">Products</span>
                  </div>
                  <div className="max-h-[60vh] overflow-y-auto">
                    {renderHits(false)}
                  </div>
                </>
              ) : (
                <EmptyState onSelect={(s) => {
                  setQuery(s)
                  startLoadingProducts()
                }} />
              )}
            </div>
          )}
        </div>

        {/* MOBILE ICON */}
        <div className="medium:hidden flex items-center">
          <button
            onClick={() => {
              setIsMobileOpen(true)
              startLoadingProducts()
            }}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-header-hover text-header-fg hover:text-header-accent transition-all active:scale-90"
            aria-label="Search"
          >
            <i className="ph-bold ph-magnifying-glass text-[18px]" aria-hidden />
          </button>
        </div>

        {/* MOBILE FULL-SCREEN OVERLAY */}
        {isMobileOpen && mounted && createPortal(
          <div
            className="fixed inset-0 z-[9999] bg-bg flex flex-col"
            style={{ animation: "fadeSlideDown 0.2s ease-out" }}
          >
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-line bg-bg shrink-0">
              <div className="relative flex-1">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <MagnifyingGlass className="text-ink/40" />
                </div>
                <input
                  ref={mobileInputRef}
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleEnterKey}
                  className="w-full bg-surface border border-line focus:border-primary focus:ring-[3px] focus:ring-primary/15 rounded-search py-2.5 pl-10 pr-10 text-base font-medium outline-none transition-all"
                  placeholder="Search products..."
                  autoComplete="off"
                  autoCapitalize="off"
                  spellCheck={false}
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-ink/40 hover:text-ink"
                  >
                    <XMark />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={closeMobile}
                className="shrink-0 text-sm font-medium text-primary px-2 py-1 active:scale-95 transition-transform"
              >
                Cancel
              </button>
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain">
              {query.length > 0 ? (
                <>
                  <div className="px-4 py-2 border-b border-line/60 bg-surface/50">
                    <span className="text-[11px] uppercase font-bold text-ink/50 tracking-wide">Products</span>
                  </div>
                  {renderHits(true)}
                </>
              ) : (
                <EmptyState onSelect={(s) => {
                  setQuery(s)
                  startLoadingProducts()
                }} />
              )}
            </div>

            <style>{`
              @keyframes fadeSlideDown {
                from { opacity: 0; transform: translateY(-8px); }
                to { opacity: 1; transform: translateY(0); }
              }
            `}</style>
          </div>,
          document.body
        )}
      </>
    )
  }
