import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Input,
  Textarea,
  Label,
  toast,
} from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import RichEditor from "../components/RichEditor"
import { A, adminHelpText } from "../lib/admin-theme"

/**
 * Product SEO + Rich Description widget.
 *
 * Persists three fields on `product.metadata`:
 *   - meta_title          → <title> on the PDP (falls back to product.title)
 *   - meta_description    → <meta name="description"> (falls back to product.description)
 *   - rich_description    → HTML body shown in the storefront PDP
 *                           "Description" tab (next to "Reviews" tab)
 *
 * The plain `product.title` stays the on-page H1; meta_title only changes
 * the browser-tab / Google snippet text. The plain product.description
 * stays as the short blurb; rich_description is the long form with
 * formatting, images, headings.
 */

const TITLE_MAX = 70
const DESC_MAX = 160

async function fetchProductSeo(productId: string): Promise<{
  meta_title: string
  meta_description: string
  rich_description: string
  metadata: Record<string, any>
}> {
  const res = await fetch(`/admin/products/${productId}?fields=metadata`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(await res.text())
  const { product } = await res.json()
  const m = (product?.metadata || {}) as Record<string, any>
  return {
    meta_title: (m.meta_title || m.seo_title || "").toString(),
    meta_description: (m.meta_description || m.seo_description || "").toString(),
    rich_description: (m.rich_description || "").toString(),
    metadata: m,
  }
}

async function saveProductSeo(
  productId: string,
  patch: { meta_title: string; meta_description: string; rich_description: string },
  existingMetadata: Record<string, any>
) {
  const next = {
    ...existingMetadata,
    meta_title: patch.meta_title.trim() || null,
    meta_description: patch.meta_description.trim() || null,
    rich_description: patch.rich_description?.trim() || null,
  }
  const res = await fetch(`/admin/products/${productId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: next }),
  })
  if (!res.ok) throw new Error(await res.text())
}

const ProductSeoWidget = () => {
  const { id: productId } = useParams()
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [richDescription, setRichDescription] = useState("")
  const [savedMetadata, setSavedMetadata] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const initialRef = useRef<{ t: string; d: string; r: string }>({
    t: "",
    d: "",
    r: "",
  })

  useEffect(() => {
    if (!productId) return
    fetchProductSeo(productId)
      .then((data) => {
        setMetaTitle(data.meta_title)
        setMetaDescription(data.meta_description)
        setRichDescription(data.rich_description)
        setSavedMetadata(data.metadata)
        initialRef.current = {
          t: data.meta_title,
          d: data.meta_description,
          r: data.rich_description,
        }
      })
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [productId])

  const dirty =
    metaTitle !== initialRef.current.t ||
    metaDescription !== initialRef.current.d ||
    richDescription !== initialRef.current.r

  const onSave = async () => {
    if (!productId) return
    setSaving(true)
    try {
      await saveProductSeo(
        productId,
        {
          meta_title: metaTitle,
          meta_description: metaDescription,
          rich_description: richDescription,
        },
        savedMetadata
      )
      initialRef.current = {
        t: metaTitle,
        d: metaDescription,
        r: richDescription,
      }
      setSavedMetadata((m) => ({
        ...m,
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
        rich_description: richDescription?.trim() || null,
      }))
      toast.success("SEO + description saved")
    } catch (e: any) {
      toast.error("Save failed: " + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-4">
        <Label>SEO & Description</Label>
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
          SEO & Description
        </Heading>
        <p style={{ fontSize: 12, color: A.fgMuted, marginTop: 4 }}>
          Override the browser-tab title, search-engine snippet, and the
          long-form rich description shown in the storefront product
          tabs.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* Meta title */}
        <div>
          <Label size="small">Meta Title</Label>
          <Input
            placeholder="Leave empty to use the product name"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
          />
          <div style={charCounterStyle(metaTitle.length, TITLE_MAX)}>
            {metaTitle.length}/{TITLE_MAX} characters · ideal 50–60
          </div>
        </div>

        {/* Meta description */}
        <div>
          <Label size="small">Meta Description</Label>
          <Textarea
            rows={3}
            placeholder="Short summary shown in Google search results."
            value={metaDescription}
            onChange={(e) => setMetaDescription(e.target.value)}
          />
          <div style={charCounterStyle(metaDescription.length, DESC_MAX)}>
            {metaDescription.length}/{DESC_MAX} characters · ideal 120–155
          </div>
        </div>

        {/* Rich description */}
        <div>
          <Label size="small">Long Description (rich text)</Label>
          <p style={{ ...adminHelpText, marginTop: 2, marginBottom: 8 }}>
            Shown on the product page in the "Description" tab next to
            "Reviews". Supports headings, lists, images, links.
          </p>
          <div
            style={{
              border: A.border,
              borderRadius: 8,
              overflow: "hidden",
              background: A.bgCard,
            }}
          >
            <RichEditor
              value={richDescription}
              onChange={setRichDescription}
              placeholder="Write a detailed description of the product…"
            />
          </div>
        </div>

        {/* Save */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            alignItems: "center",
            gap: 10,
            paddingTop: 4,
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
            {saving ? "Saving…" : "Save SEO & Description"}
          </Button>
        </div>
      </div>
    </Container>
  )
}

function charCounterStyle(n: number, max: number): React.CSSProperties {
  const ratio = n / max
  return {
    fontSize: 11,
    color:
      ratio > 1
        ? A.danger
        : ratio > 0.9
          ? A.warning
          : A.fgMuted,
    marginTop: 4,
  }
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductSeoWidget
