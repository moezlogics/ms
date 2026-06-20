import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Input,
  Textarea,
  Label,
  Button,
  toast,
} from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import RichEditor from "../components/RichEditor"
import { A, adminHelpText } from "../lib/admin-theme"

/**
 * Category SEO + content widget.
 *
 * Persists three fields on `product_category.metadata`:
 *   - meta_title         → <title> on the storefront category page
 *                          (falls back to category.name)
 *   - meta_description   → <meta name="description"> for the page
 *   - content            → HTML body shown after the product grid on
 *                          the storefront — useful for buyer guides,
 *                          long-tail keyword copy, FAQs.
 *
 * Sister widget to `collection-seo-widget.tsx` (same structure).
 */

const TITLE_MAX = 70
const DESC_MAX = 160

async function fetchCategory(id: string): Promise<{
  meta: { meta_title: string; meta_description: string; content: string }
  metadata: Record<string, any>
}> {
  const res = await fetch(`/admin/product-categories/${id}`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(await res.text())
  const { product_category } = await res.json()
  const m = (product_category?.metadata || {}) as Record<string, any>
  return {
    meta: {
      meta_title: (m.meta_title || "").toString(),
      meta_description: (m.meta_description || "").toString(),
      content: (m.content || "").toString(),
    },
    metadata: m,
  }
}

async function saveCategorySeo(
  id: string,
  patch: { meta_title: string; meta_description: string; content: string },
  existingMetadata: Record<string, any>
) {
  const next = {
    ...existingMetadata,
    meta_title: patch.meta_title.trim() || null,
    meta_description: patch.meta_description.trim() || null,
    content: patch.content?.trim() || null,
  }
  const res = await fetch(`/admin/product-categories/${id}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: next }),
  })
  if (!res.ok) throw new Error(await res.text())
}

const CategorySeoWidget = () => {
  const { id: categoryId } = useParams()
  const [metaTitle, setMetaTitle] = useState("")
  const [metaDescription, setMetaDescription] = useState("")
  const [content, setContent] = useState("")
  const [savedMetadata, setSavedMetadata] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const initialRef = useRef({ t: "", d: "", c: "" })

  useEffect(() => {
    if (!categoryId) return
    fetchCategory(categoryId)
      .then(({ meta, metadata }) => {
        setMetaTitle(meta.meta_title)
        setMetaDescription(meta.meta_description)
        setContent(meta.content)
        setSavedMetadata(metadata)
        initialRef.current = {
          t: meta.meta_title,
          d: meta.meta_description,
          c: meta.content,
        }
      })
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [categoryId])

  const dirty =
    metaTitle !== initialRef.current.t ||
    metaDescription !== initialRef.current.d ||
    content !== initialRef.current.c

  const onSave = async () => {
    if (!categoryId) return
    setSaving(true)
    try {
      await saveCategorySeo(
        categoryId,
        { meta_title: metaTitle, meta_description: metaDescription, content },
        savedMetadata
      )
      initialRef.current = { t: metaTitle, d: metaDescription, c: content }
      setSavedMetadata((m) => ({
        ...m,
        meta_title: metaTitle.trim() || null,
        meta_description: metaDescription.trim() || null,
        content: content?.trim() || null,
      }))
      toast.success("SEO + content saved")
    } catch (e: any) {
      toast.error("Save failed: " + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-4">
        <Label>SEO & Content</Label>
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
          SEO & Content
        </Heading>
        <p style={{ fontSize: 12, color: A.fgMuted, marginTop: 4 }}>
          Override the browser-tab title and search-engine snippet for
          this category's page. The rich content block renders below the
          product grid.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <Label size="small">Meta Title</Label>
          <Input
            placeholder="Leave empty to use the category name"
            value={metaTitle}
            onChange={(e) => setMetaTitle(e.target.value)}
          />
          <div style={charCounterStyle(metaTitle.length, TITLE_MAX)}>
            {metaTitle.length}/{TITLE_MAX} characters · ideal 50–60
          </div>
        </div>

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

        <div>
          <Label size="small">Page Content (rich text)</Label>
          <p style={{ ...adminHelpText, marginTop: 2, marginBottom: 8 }}>
            Renders below the product grid on the category page. Great
            for buyer guides, FAQs, and long-tail keyword copy.
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
              value={content}
              onChange={setContent}
              placeholder="Write a buyer's guide, FAQ, or any extra content for this category page…"
            />
          </div>
        </div>

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
            {saving ? "Saving…" : "Save SEO & Content"}
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
  zone: "product_category.details.after",
})

export default CategorySeoWidget
