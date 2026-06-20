"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react"

/**
 * Compare-list state shared across the storefront.
 *
 * The picker (button on PDP / product card) writes the product
 * `handle` into the list; the floating tray reads it to render the
 * mini-cart-style preview; the `/compare` page reads it from the URL
 * query string instead so the comparison is link-shareable.
 *
 * We persist to localStorage so the user can navigate away, browse,
 * and come back to the tray without losing their selection. Cap is
 * 4 products — beyond that the comparison grid becomes unreadable
 * on mobile and Google's UX research shows shoppers don't compare
 * more than 4 SKUs side-by-side.
 */

export type CompareItem = {
  /** Product handle (slug) — primary key for the comparison page. */
  handle: string
  /** Cached display fields so the tray renders instantly without a fetch. */
  title: string
  thumbnail: string | null
  /**
   * Primary category of the product. The comparison is constrained to
   * a single category (you can't meaningfully compare a phone with a
   * fridge), so the first added product sets the category and the
   * "add more" pickers only surface products from the same one.
   * Optional for back-compat with lists saved before this field.
   */
  categoryId?: string | null
  categoryName?: string | null
}

const STORAGE_KEY = "ecomm:compare:v1"
export const COMPARE_MAX = 4

type CompareContextValue = {
  items: CompareItem[]
  has: (handle: string) => boolean
  add: (item: CompareItem) => boolean
  remove: (handle: string) => void
  toggle: (item: CompareItem) => boolean
  clear: () => void
  /** Replace the whole list at once — used to sync a /compare?h=… URL. */
  replaceAll: (items: CompareItem[]) => void
  isFull: boolean
  count: number
  /** Shared category derived from the first item (null until set). */
  categoryId: string | null
  categoryName: string | null
}

const CompareContext = createContext<CompareContextValue | null>(null)

function readStorage(): CompareItem[] {
  if (typeof window === "undefined") return []
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter(
        (x): x is CompareItem =>
          x && typeof x === "object" && typeof x.handle === "string"
      )
      .slice(0, COMPARE_MAX)
  } catch {
    return []
  }
}

function writeStorage(items: CompareItem[]) {
  if (typeof window === "undefined") return
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {
    // ignore quota / disabled storage
  }
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  // Hydration-safe: start empty on the server, then sync once on the
  // client. The brief flash of an empty tray is acceptable; mixing
  // localStorage into the initial render would crash SSR.
  const [items, setItems] = useState<CompareItem[]>([])

  useEffect(() => {
    setItems(readStorage())
  }, [])

  // Cross-tab sync: when the user toggles a product in another tab,
  // mirror the change here so the tray count stays correct.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== STORAGE_KEY) return
      setItems(readStorage())
    }
    window.addEventListener("storage", onStorage)
    return () => window.removeEventListener("storage", onStorage)
  }, [])

  const persist = useCallback((next: CompareItem[]) => {
    setItems(next)
    writeStorage(next)
  }, [])

  const has = useCallback(
    (handle: string) => items.some((i) => i.handle === handle),
    [items]
  )

  const add = useCallback(
    (item: CompareItem) => {
      if (items.some((i) => i.handle === item.handle)) return true
      if (items.length >= COMPARE_MAX) return false
      persist([...items, item])
      return true
    },
    [items, persist]
  )

  const remove = useCallback(
    (handle: string) => {
      persist(items.filter((i) => i.handle !== handle))
    },
    [items, persist]
  )

  const toggle = useCallback(
    (item: CompareItem) => {
      if (items.some((i) => i.handle === item.handle)) {
        persist(items.filter((i) => i.handle !== item.handle))
        return false
      }
      if (items.length >= COMPARE_MAX) return false
      persist([...items, item])
      return true
    },
    [items, persist]
  )

  const clear = useCallback(() => persist([]), [persist])

  const replaceAll = useCallback(
    (next: CompareItem[]) => {
      persist((next || []).slice(0, COMPARE_MAX))
    },
    [persist]
  )

  const value = useMemo<CompareContextValue>(
    () => ({
      items,
      has,
      add,
      remove,
      toggle,
      clear,
      replaceAll,
      isFull: items.length >= COMPARE_MAX,
      count: items.length,
      categoryId: items[0]?.categoryId ?? null,
      categoryName: items[0]?.categoryName ?? null,
    }),
    [items, has, add, remove, toggle, clear, replaceAll]
  )

  return (
    <CompareContext.Provider value={value}>{children}</CompareContext.Provider>
  )
}

export function useCompare(): CompareContextValue {
  const ctx = useContext(CompareContext)
  if (!ctx) {
    // Defensive: if the provider hasn't mounted yet (e.g. during a
    // server render of a client component), return a no-op shape so
    // consumers can call `useCompare()` unconditionally.
    return {
      items: [],
      has: () => false,
      add: () => false,
      remove: () => {},
      toggle: () => false,
      clear: () => {},
      replaceAll: () => {},
      isFull: false,
      count: 0,
      categoryId: null,
      categoryName: null,
    }
  }
  return ctx
}
