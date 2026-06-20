import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Label, Button, toast } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { cdnUpload } from "../lib/cdn-upload"
import { A, adminHelpText } from "../lib/admin-theme"

/**
 * Category Featured Image widget.
 *
 * Persists `metadata.image` on the product category — used by the
 * storefront's homepage category carousel as the round icon, and by
 * the category page hero (if/when wired). Upload runs through the
 * shared `cdnUpload` helper so we get:
 *   - WebP conversion + thumbnail
 *   - Filename + date-based path (WordPress-style)
 *   - Auto alt/title/caption via GPT-4o-mini vision
 *
 * Sits alongside the SEO widget — both write into the same `metadata`
 * object, so we always merge with the existing payload to avoid
 * stomping on the other widget's fields.
 */
async function fetchCategory(id: string): Promise<{
  image: string | null
  metadata: Record<string, any>
}> {
  const res = await fetch(`/admin/product-categories/${id}`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(await res.text())
  const { product_category } = await res.json()
  const m = (product_category?.metadata || {}) as Record<string, any>
  return {
    image: typeof m.image === "string" ? m.image : null,
    metadata: m,
  }
}

async function saveImage(
  id: string,
  imageUrl: string | null,
  existingMetadata: Record<string, any>,
  alt: string | null
) {
  const next: Record<string, any> = { ...existingMetadata }
  if (imageUrl) {
    next.image = imageUrl
    if (alt) next.image_alt = alt
  } else {
    next.image = null
    next.image_alt = null
  }
  const res = await fetch(`/admin/product-categories/${id}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: next }),
  })
  if (!res.ok) throw new Error(await res.text())
}

const CategoryImageWidget = () => {
  const { id: categoryId } = useParams()
  const fileRef = useRef<HTMLInputElement>(null)
  const [imageUrl, setImageUrl] = useState<string | null>(null)
  const [savedMetadata, setSavedMetadata] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!categoryId) return
    fetchCategory(categoryId)
      .then(({ image, metadata }) => {
        setImageUrl(image)
        setSavedMetadata(metadata)
      })
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [categoryId])

  const handlePick = () => fileRef.current?.click()

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!categoryId) return
    const file = e.target.files?.[0]
    if (!file) return
    setBusy(true)
    try {
      const result = await cdnUpload(file)
      if (!result.url) throw new Error("CDN returned no URL")
      await saveImage(categoryId, result.url, savedMetadata, result.alt)
      setImageUrl(result.url)
      setSavedMetadata((m) => ({
        ...m,
        image: result.url,
        image_alt: result.alt || null,
      }))
      toast.success("Featured image saved")
    } catch (err: any) {
      toast.error("Upload failed: " + (err?.message || err))
    } finally {
      setBusy(false)
      if (fileRef.current) fileRef.current.value = ""
    }
  }

  const handleRemove = async () => {
    if (!categoryId) return
    setBusy(true)
    try {
      await saveImage(categoryId, null, savedMetadata, null)
      setImageUrl(null)
      setSavedMetadata((m) => ({ ...m, image: null, image_alt: null }))
      toast.success("Featured image removed")
    } catch (err: any) {
      toast.error("Remove failed: " + (err?.message || err))
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-4">
        <Label>Featured Image</Label>
        <p style={{ fontSize: 13, color: A.fgMuted, marginTop: 4 }}>Loading…</p>
      </Container>
    )
  }

  return (
    <Container className="p-4">
      <div style={{ marginBottom: 14 }}>
        <Heading level="h2" className="text-base font-semibold">
          Featured Image
        </Heading>
        <p style={{ ...adminHelpText, marginTop: 4 }}>
          Shown as the round category icon on the homepage carousel.
          Upload a transparent PNG or square image — the storefront
          renders it inside a fixed-size circle. Alt text is generated
          automatically.
        </p>
      </div>

      <input
        ref={fileRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        onChange={handleFile}
        style={{ display: "none" }}
      />

      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 96,
            height: 96,
            borderRadius: 12,
            border: A.border,
            background: A.bgCard,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element, jsx-a11y/alt-text
            <img
              src={imageUrl}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          ) : (
            <span style={{ fontSize: 11, color: A.fgMuted }}>No image</span>
          )}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Button variant="primary" size="small" onClick={handlePick} disabled={busy}>
            {busy ? "Working…" : imageUrl ? "Replace image" : "Upload image"}
          </Button>
          {imageUrl && (
            <Button variant="secondary" size="small" onClick={handleRemove} disabled={busy}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CategoryImageWidget
