import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Switch, Label, Button, toast } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"

/**
 * Product "Selling" widget.
 *
 * Single flag on `product.metadata.for_sale` that controls whether the
 * STOREFRONT shows purchase controls for this product:
 *   ON  → Buy Now + Add to Cart + quantity stepper + WhatsApp-order +
 *         mobile sticky add button all show.
 *   OFF → all of the above are hidden; the product still renders as a
 *         full, indexable PDP (price, variants, specs, stock, reviews,
 *         compare). Backend stock/inventory management is unaffected.
 *
 * DEFAULT = OFF. A product with no flag set is NOT sellable online until
 * an operator turns this on — so newly imported / unconfigured products
 * are display-only by default.
 *
 * (The "Show in Compare" toggle lives in the Specs widget and defaults ON.)
 */

async function fetchForSale(productId: string): Promise<{
  forSale: boolean
  metadata: Record<string, any>
}> {
  const res = await fetch(`/admin/products/${productId}?fields=metadata`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(await res.text())
  const { product } = await res.json()
  const m = (product?.metadata || {}) as Record<string, any>
  // Default OFF — only an explicit true (or "true") is sellable.
  const forSale = m.for_sale === true || m.for_sale === "true"
  return { forSale, metadata: m }
}

async function saveForSale(
  productId: string,
  forSale: boolean,
  existingMetadata: Record<string, any>
) {
  const next = { ...existingMetadata, for_sale: forSale }
  const res = await fetch(`/admin/products/${productId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: next }),
  })
  if (!res.ok) throw new Error(await res.text())
}

const ProductSellingWidget = () => {
  const { id: productId } = useParams()
  const [forSale, setForSale] = useState(false)
  const [savedMetadata, setSavedMetadata] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const initialRef = useRef(false)

  useEffect(() => {
    if (!productId) return
    fetchForSale(productId)
      .then((data) => {
        setForSale(data.forSale)
        setSavedMetadata(data.metadata)
        initialRef.current = data.forSale
      })
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [productId])

  const dirty = forSale !== initialRef.current

  const onSave = async () => {
    if (!productId) return
    setSaving(true)
    try {
      await saveForSale(productId, forSale, savedMetadata)
      initialRef.current = forSale
      setSavedMetadata((m) => ({ ...m, for_sale: forSale }))
      toast.success(
        forSale
          ? "Product is now FOR SALE on the storefront"
          : "Purchase buttons are now HIDDEN on the storefront"
      )
    } catch (e: any) {
      toast.error("Save failed: " + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Container className="p-4">
      <div style={{ marginBottom: 14 }}>
        <Heading level="h2" className="text-base font-semibold">
          Selling
        </Heading>
        <p style={{ fontSize: 12, color: "#6b7280", marginTop: 4 }}>
          Controls whether the storefront shows Buy Now / Add to Cart /
          quantity for this product. Off = display-only (full page, no
          purchase). Stock &amp; variants are unaffected.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 16,
          padding: "12px 14px",
          border: "1px solid #e5e7eb",
          borderRadius: 8,
        }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
          <Label htmlFor="for-sale-switch" size="small">
            Available for sale on storefront
          </Label>
          <span style={{ fontSize: 11, color: "#6b7280" }}>
            {loading
              ? "Loading…"
              : forSale
                ? "Buy / Add-to-Cart buttons are SHOWN."
                : "Buy / Add-to-Cart buttons are HIDDEN (default)."}
          </span>
        </div>
        <Switch
          id="for-sale-switch"
          checked={forSale}
          onCheckedChange={setForSale}
          disabled={loading || saving}
        />
      </div>

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
          <span style={{ fontSize: 11, color: "#d97706" }}>Unsaved changes</span>
        )}
        <Button
          variant="primary"
          size="small"
          onClick={onSave}
          disabled={loading || saving || !dirty}
        >
          {saving ? "Saving…" : "Save"}
        </Button>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSellingWidget
