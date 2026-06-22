"use client"

import { useState, useRef, useEffect } from "react"
import Link from "next/link"
import { getProductPath } from "@lib/util/product"
import { useSiteSettings } from "@lib/context/site-settings-context"

const ZIZU_AVATAR = "https://cdn.zmobiles.pk/uploads/2026/06/7551268b-d645-4cbc-a802-ae3d94f96df4-aoFCInV_.webp"

interface SearchItem {
  id: string
  title: string
  handle: string
  thumbnail?: string
  description?: string
  categories?: any[]
  metadata?: any
}

// Global cache to prevent multiple fetches
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
      console.error("[404-search] Error loading search index:", err)
      fetchPromise = null
      return []
    })

  return fetchPromise
}

// Damerau-Levenshtein distance for fuzzy matching
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

function getTypoTolerance(word: string): number {
  const len = word.length
  if (len <= 2) return 0
  if (len <= 4) return 1
  return 2
}

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

    const cleanTitleNoSpaces = title.replace(/\s+/g, "")
    if (cleanTitleNoSpaces.includes(cleanQueryNoSpaces)) {
      score += 50
    }

    const titleWords = title.split(/\s+/).filter(Boolean)
    const descWords = desc.split(/\s+/).filter(Boolean)

    for (const qWord of queryWords) {
      let wordMatched = false
      let bestWordScore = 0

      if (title === qWord) {
        bestWordScore = Math.max(bestWordScore, 100)
        wordMatched = true
      }

      for (const tWord of titleWords) {
        const cleanTWord = tWord.replace(/[^a-z0-9]/g, "")
        const cleanQWord = qWord.replace(/[^a-z0-9]/g, "")
        if (!cleanQWord) continue

        if (cleanTWord === cleanQWord) {
          bestWordScore = Math.max(bestWordScore, 80)
          wordMatched = true
        } else if (cleanTWord.startsWith(cleanQWord)) {
          const bonus = Math.round(50 * (cleanQWord.length / cleanTWord.length))
          bestWordScore = Math.max(bestWordScore, bonus)
          wordMatched = true
        } else if (cleanTWord.includes(cleanQWord)) {
          const bonus = Math.round(30 * (cleanQWord.length / cleanTWord.length))
          bestWordScore = Math.max(bestWordScore, bonus)
          wordMatched = true
        } else {
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
      if (!wordMatched) matchesAllWords = false
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

export default function NotFoundVariants() {
  const { aspectClass: globalAspectClass } = useSiteSettings()
  const [query, setQuery] = useState("")
  const [productsList, setProductsList] = useState<SearchItem[]>([])
  const [filteredHits, setFilteredHits] = useState<SearchItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const searchInputRef = useRef<HTMLInputElement>(null)

  // Fetch search products index on component load
  useEffect(() => {
    setIsLoading(true)
    fetchAllSearchProducts()
      .then((items) => {
        setProductsList(items)
        setIsLoading(false)
      })
      .catch(() => setIsLoading(false))
  }, [])

  // Filter hits as query changes
  useEffect(() => {
    if (!query.trim()) {
      setFilteredHits([])
      return
    }
    const results = searchProducts(productsList, query)
    setFilteredHits(results)
  }, [query, productsList])

  return (
    <>
      <div className="min-h-[calc(100vh-120px)] flex items-center justify-center px-4 py-12 sm:py-20 relative overflow-hidden bg-bg">
        {/* Animated matrix background sparks */}
        <div className="absolute inset-0 pointer-events-none opacity-[0.03]">
          <div className="absolute top-[10%] left-[20%] w-1.5 h-1.5 bg-primary rounded-full animate-ping" />
          <div className="absolute top-[40%] right-[30%] w-2 h-2 bg-accent rounded-full animate-ping [animation-delay:1.5s]" />
          <div className="absolute bottom-[20%] left-[45%] w-1 h-1 bg-primary rounded-full animate-ping [animation-delay:0.8s]" />
        </div>

        <div className="max-w-2xl w-full text-center relative z-10 flex flex-col items-center">
          
          {/* Zizu Floating Astronaut Illustration */}
          <div className="relative w-48 h-48 sm:w-56 sm:h-56 flex items-center justify-center select-none">
            {/* Glowing orbital ring */}
            <div className="absolute inset-0 rounded-full border-2 border-dashed border-primary/20 animate-[spin_24s_linear_infinite]" />
            <div 
              className="absolute w-[85%] h-[85%] rounded-full bg-gradient-to-tr from-primary/10 via-accent/5 to-transparent blur-xl"
              style={{ animation: "waFloat 4s ease-in-out infinite" }}
            />

            {/* Float wrapper */}
            <div 
              className="relative w-[70%] h-[70%]"
              style={{ animation: "waFloat 5s ease-in-out infinite" }}
            >
              {/* Cute digital matrix/circuit connections around Zizu */}
              <div className="absolute -top-4 -left-4 w-6 h-6 border-t-2 border-l-2 border-primary/40 rounded-tl-xl" />
              <div className="absolute -bottom-4 -right-4 w-6 h-6 border-b-2 border-r-2 border-accent/40 rounded-br-xl" />

              {/* Zizu avatar with astronaut helmet shape */}
              <div className="w-full h-full rounded-full relative overflow-hidden p-1.5 bg-surface border-3 border-line shadow-2xl">
                <img
                  src={ZIZU_AVATAR}
                  alt="Zizu"
                  className="w-full h-full rounded-full object-cover"
                />
              </div>

              {/* Glitching 404 Badge */}
              <div 
                className="absolute -bottom-2 -left-2 bg-rose-500 text-white font-mono text-[10px] sm:text-xs font-bold px-2.5 py-1 rounded-full shadow-lg border-2 border-surface tracking-wide"
                style={{ animation: "waPulse 1.8s ease-in-out infinite" }}
              >
                404 LOST
              </div>
            </div>
          </div>

          {/* Heading */}
          <div className="mt-8 space-y-3 max-w-lg">
            <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
              Oops! Zizu is lost in space... 🚀
            </h1>
            <p className="text-sm sm:text-[15px] leading-relaxed text-ink/65 font-medium">
              Lagta hai aap kisi aisi gali mein aa gaye hain jo humare map par nahi hai. Don't worry, search below or return to shop!
            </p>
          </div>

          {/* Live Search Bar */}
          <div className="mt-8 max-w-md w-full relative">
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-ink/40">
                <i className="ph-bold ph-magnifying-glass text-lg" />
              </span>
              <input
                ref={searchInputRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search products directly..."
                className="w-full bg-surface border border-line focus:border-primary focus:ring-[3.5px] focus:ring-primary/15 rounded-full py-3.5 pl-11 pr-10 text-sm font-semibold outline-none transition-all shadow-sm"
              />
              {query && (
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="absolute inset-y-0 right-4 flex items-center text-ink/30 hover:text-ink transition-colors"
                >
                  <i className="ph-bold ph-x text-sm" />
                </button>
              )}
            </div>

            {/* Dropdown Live Results */}
            {query.length > 0 && (
              <div className="absolute top-[58px] left-0 right-0 bg-surface border border-line rounded-3xl shadow-[0_16px_40px_rgba(0,0,0,0.12)] overflow-hidden z-20 text-left">
                <div className="px-4 py-2.5 bg-surface/50 border-b border-line flex items-center justify-between">
                  <span className="text-[10px] uppercase font-extrabold text-ink/45 tracking-wider">Matching Products</span>
                  {isLoading && (
                    <span className="w-4 h-4 rounded-full border-2 border-primary border-t-transparent animate-spin" />
                  )}
                </div>

                <div className="max-h-[300px] overflow-y-auto">
                  {filteredHits.length > 0 ? (
                    <ul className="p-2 space-y-1">
                      {filteredHits.slice(0, 5).map((hit) => (
                        <li key={hit.id}>
                          <Link
                            href={getProductPath(hit)}
                            className="flex items-center gap-3 p-2.5 hover:bg-bg rounded-2xl transition-all duration-200 group active:scale-[0.98]"
                          >
                            {hit.thumbnail && (
                              <div className={`relative shrink-0 overflow-hidden w-11 rounded-xl bg-bg border border-line group-hover:border-primary/40 transition-colors ${globalAspectClass}`}>
                                <img
                                  src={hit.thumbnail}
                                  alt={hit.title}
                                  className="absolute inset-0 w-full h-full object-cover"
                                />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold text-ink group-hover:text-primary transition-colors truncate">
                                {hit.title}
                              </p>
                              {hit.description && (
                                <p className="text-[10px] text-ink/50 truncate mt-0.5">
                                  {hit.description}
                                </p>
                              )}
                            </div>
                            <i className="ph-bold ph-arrow-right text-[10px] text-ink/20 group-hover:text-primary transition-colors shrink-0" />
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="p-6 text-center text-xs text-ink/50 font-medium">
                      No matching products found. Try a different term!
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="mt-8 flex flex-wrap justify-center gap-3 w-full">
            <Link
              href="/"
              className="inline-flex items-center gap-2 h-12 px-6.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 shadow-sm bg-primary text-primary-fg hover:bg-primary/95"
            >
              <i className="ph-fill ph-house text-sm" />
              Back to Home
            </Link>
            <Link
              href="/store"
              className="inline-flex items-center gap-2 h-12 px-6.5 rounded-full text-xs font-extrabold uppercase tracking-wider transition-all active:scale-95 border border-line bg-surface text-ink hover:bg-bg"
            >
              Explore Store
              <i className="ph-bold ph-arrow-right text-sm" />
            </Link>
          </div>

        </div>
      </div>

      <style>{`
        @keyframes waFloat {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        @keyframes waPulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.85; transform: scale(0.96); }
        }
      `}</style>
    </>
  )
}
