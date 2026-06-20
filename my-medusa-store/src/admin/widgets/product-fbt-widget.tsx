import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  toast,
  IconButton,
} from "@medusajs/ui"
import { useEffect, useState, useRef, useCallback } from "react"
import { useParams } from "react-router-dom"
import { A, adminHelpText } from "../lib/admin-theme"

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ProductHit = {
  id: string
  title: string
  handle: string
  thumbnail: string | null
}

/* ------------------------------------------------------------------ */
/*  Admin API helpers                                                  */
/* ------------------------------------------------------------------ */

async function fetchProductMetadata(
  productId: string
): Promise<Record<string, any>> {
  const res = await fetch(`/admin/products/${productId}?fields=metadata`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(await res.text())
  const { product } = await res.json()
  return (product?.metadata || {}) as Record<string, any>
}

async function saveMetadata(
  productId: string,
  metadata: Record<string, any>
) {
  const res = await fetch(`/admin/products/${productId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata }),
  })
  if (!res.ok) throw new Error(await res.text())
}

async function searchProducts(query: string): Promise<ProductHit[]> {
  if (!query.trim()) return []
  const params = new URLSearchParams({
    q: query.trim(),
    limit: "10",
    fields: "id,title,handle,thumbnail",
  })
  const res = await fetch(`/admin/products?${params.toString()}`, {
    credentials: "include",
  })
  if (!res.ok) return []
  const { products } = await res.json()
  return (products || []) as ProductHit[]
}

async function fetchProductsByIds(ids: string[]): Promise<ProductHit[]> {
  if (ids.length === 0) return []
  const params = new URLSearchParams({
    id: ids.join(","),
    limit: String(ids.length),
    fields: "id,title,handle,thumbnail",
  })
  const res = await fetch(`/admin/products?${params.toString()}`, {
    credentials: "include",
  })
  if (!res.ok) return []
  const { products } = await res.json()
  return (products || []) as ProductHit[]
}

/* ------------------------------------------------------------------ */
/*  Widget                                                             */
/* ------------------------------------------------------------------ */

const ProductFbtWidget = () => {
  const { id: productId } = useParams()

  /* State */
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedMetadata, setSavedMetadata] = useState<Record<string, any>>({})
  const [fbtIds, setFbtIds] = useState<string[]>([])
  const [fbtProducts, setFbtProducts] = useState<ProductHit[]>([])
  const initialIds = useRef<string[]>([])

  /* Search state */
  const [query, setQuery] = useState("")
  const [results, setResults] = useState<ProductHit[]>([])
  const [searching, setSearching] = useState(false)
  const [showResults, setShowResults] = useState(false)
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  /* Load saved FBT IDs on mount */
  useEffect(() => {
    if (!productId) return
    fetchProductMetadata(productId)
      .then(async (meta) => {
        setSavedMetadata(meta)
        const ids: string[] = Array.isArray(meta.fbt_ids)
          ? meta.fbt_ids
          : []
        initialIds.current = [...ids]
        setFbtIds(ids)

        if (ids.length > 0) {
          const products = await fetchProductsByIds(ids)
          /* Maintain the saved order */
          const map = new Map(products.map((p) => [p.id, p]))
          setFbtProducts(ids.map((id) => map.get(id)!).filter(Boolean))
        }
      })
      .catch((e) =>
        toast.error("Failed to load FBT data: " + (e as Error).message)
      )
      .finally(() => setLoading(false))
  }, [productId])

  /* Debounced search */
  const onQueryChange = useCallback(
    (value: string) => {
      setQuery(value)
      if (searchTimeout.current) clearTimeout(searchTimeout.current)
      if (!value.trim()) {
        setResults([])
        setShowResults(false)
        return
      }
      setSearching(true)
      setShowResults(true)
      searchTimeout.current = setTimeout(async () => {
        const hits = await searchProducts(value)
        /* Exclude current product and already-selected products */
        setResults(
          hits.filter(
            (h) => h.id !== productId && !fbtIds.includes(h.id)
          )
        )
        setSearching(false)
      }, 350)
    },
    [productId, fbtIds]
  )

  /* Close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setShowResults(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  /* Add product */
  const addProduct = (hit: ProductHit) => {
    setFbtIds((prev) => [...prev, hit.id])
    setFbtProducts((prev) => [...prev, hit])
    setResults((prev) => prev.filter((r) => r.id !== hit.id))
    setQuery("")
    setShowResults(false)
  }

  /* Remove product */
  const removeProduct = (id: string) => {
    setFbtIds((prev) => prev.filter((x) => x !== id))
    setFbtProducts((prev) => prev.filter((p) => p.id !== id))
  }

  /* Move product up */
  const moveUp = (index: number) => {
    if (index === 0) return
    setFbtIds((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
    setFbtProducts((prev) => {
      const next = [...prev]
      ;[next[index - 1], next[index]] = [next[index], next[index - 1]]
      return next
    })
  }

  /* Move product down */
  const moveDown = (index: number) => {
    if (index >= fbtIds.length - 1) return
    setFbtIds((prev) => {
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
    setFbtProducts((prev) => {
      const next = [...prev]
      ;[next[index], next[index + 1]] = [next[index + 1], next[index]]
      return next
    })
  }

  /* Save */
  const onSave = async () => {
    if (!productId) return
    setSaving(true)
    try {
      const nextMeta = {
        ...savedMetadata,
        fbt_ids: fbtIds.length > 0 ? fbtIds : null,
      }
      await saveMetadata(productId, nextMeta)
      setSavedMetadata(nextMeta)
      initialIds.current = [...fbtIds]
      toast.success("Frequently Bought Together saved")
    } catch (e: any) {
      toast.error("Save failed: " + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  const dirty =
    JSON.stringify(fbtIds) !== JSON.stringify(initialIds.current)

  /* ── Render ── */

  if (loading) {
    return (
      <Container className="p-4">
        <Label>Frequently Bought Together</Label>
        <p style={{ fontSize: 13, color: A.fgMuted, marginTop: 4 }}>
          Loading…
        </p>
      </Container>
    )
  }

  return (
    <Container className="p-4">
      <div style={{ marginBottom: 14 }}>
        <Heading level="h2" className="text-base font-semibold">
          Frequently Bought Together
        </Heading>
        <p style={{ ...adminHelpText, marginTop: 4 }}>
          Select products to show in the &quot;Frequently Bought Together&quot;
          section on this product&apos;s page. If no products are selected the
          section will not appear.
        </p>
      </div>

      {/* Search input */}
      <div ref={containerRef} style={{ position: "relative", marginBottom: 16 }}>
        <Input
          placeholder="Search products to add..."
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          onFocus={() => {
            if (results.length > 0) setShowResults(true)
          }}
        />

        {showResults && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              zIndex: 50,
              maxHeight: 280,
              overflowY: "auto",
              border: A.border,
              borderRadius: 8,
              background: A.bgCard,
              marginTop: 4,
              boxShadow: "0 8px 24px rgba(0,0,0,0.25)",
            }}
          >
            {searching && (
              <div
                style={{
                  padding: "10px 14px",
                  fontSize: 13,
                  color: A.fgMuted,
                }}
              >
                Searching…
              </div>
            )}
            {!searching && results.length === 0 && query.trim() && (
              <div
                style={{
                  padding: "10px 14px",
                  fontSize: 13,
                  color: A.fgMuted,
                }}
              >
                No products found
              </div>
            )}
            {results.map((hit) => (
              <button
                key={hit.id}
                type="button"
                onClick={() => addProduct(hit)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  width: "100%",
                  padding: "8px 14px",
                  border: "none",
                  background: "transparent",
                  cursor: "pointer",
                  textAlign: "left",
                  fontSize: 13,
                  color: A.fg,
                  transition: "background 0.15s",
                }}
                onMouseEnter={(e) =>
                  (e.currentTarget.style.background = A.bgHover)
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.background = "transparent")
                }
              >
                {hit.thumbnail ? (
                  <img
                    src={hit.thumbnail}
                    alt=""
                    style={{
                      width: 36,
                      height: 36,
                      objectFit: "cover",
                      borderRadius: 6,
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 6,
                      background: A.bgField,
                      flexShrink: 0,
                    }}
                  />
                )}
                <span style={{ flex: 1, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {hit.title}
                </span>
                <span style={{ fontSize: 18, color: A.success, flexShrink: 0 }}>+</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected products list */}
      {fbtProducts.length > 0 ? (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {fbtProducts.map((p, idx) => (
            <div
              key={p.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 10px",
                border: A.border,
                borderRadius: 8,
                background: A.bgCard,
              }}
            >
              {p.thumbnail ? (
                <img
                  src={p.thumbnail}
                  alt=""
                  style={{
                    width: 40,
                    height: 40,
                    objectFit: "cover",
                    borderRadius: 6,
                    flexShrink: 0,
                  }}
                />
              ) : (
                <div
                  style={{
                    width: 40,
                    height: 40,
                    borderRadius: 6,
                    background: A.bgField,
                    flexShrink: 0,
                  }}
                />
              )}

              <span
                style={{
                  flex: 1,
                  fontSize: 13,
                  color: A.fg,
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {p.title}
              </span>

              {/* Reorder buttons */}
              <div style={{ display: "flex", gap: 2 }}>
                <IconButton
                  variant="transparent"
                  size="small"
                  onClick={() => moveUp(idx)}
                  disabled={idx === 0}
                >
                  <span style={{ fontSize: 14 }}>↑</span>
                </IconButton>
                <IconButton
                  variant="transparent"
                  size="small"
                  onClick={() => moveDown(idx)}
                  disabled={idx === fbtProducts.length - 1}
                >
                  <span style={{ fontSize: 14 }}>↓</span>
                </IconButton>
              </div>

              {/* Remove button */}
              <IconButton
                variant="transparent"
                size="small"
                onClick={() => removeProduct(p.id)}
              >
                <span style={{ fontSize: 16, color: A.danger }}>×</span>
              </IconButton>
            </div>
          ))}
        </div>
      ) : (
        <p
          style={{
            fontSize: 13,
            color: A.fgMuted,
            fontStyle: "italic",
            marginTop: 4,
          }}
        >
          No products selected — the section will not show on the storefront.
        </p>
      )}

      {/* Save */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          alignItems: "center",
          gap: 10,
          paddingTop: 14,
        }}
      >
        {dirty && (
          <span style={{ fontSize: 11, color: A.warning }}>
            Unsaved changes
          </span>
        )}
        <Button
          variant="primary"
          size="small"
          onClick={onSave}
          disabled={saving || !dirty}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.side.after",
})

export default ProductFbtWidget
