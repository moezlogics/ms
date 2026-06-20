import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Input, Button, Label, toast } from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { uploadFile } from "../lib/settings-sdk"
import { A } from "../lib/admin-theme"

async function getCollection(id: string) {
  const res = await fetch(`/admin/collections/${id}`, { credentials: "include" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

/**
 * Merges `patch` into the existing collection.metadata so this widget
 * doesn't blow away fields owned by sibling widgets (meta_title,
 * meta_description, content from `collection-seo-widget`).
 */
async function updateCollectionMetadata(
  id: string,
  patch: Record<string, any>
) {
  const current = await getCollection(id)
  const existing = (current?.collection?.metadata || {}) as Record<string, any>
  const merged = { ...existing, ...patch }
  const res = await fetch(`/admin/collections/${id}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: merged }),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const CollectionImageWidget = () => {
  const { id: collectionId } = useParams()
  const [imageUrl, setImageUrl] = useState("")
  const [savedUrl, setSavedUrl] = useState("")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!collectionId) return
    getCollection(collectionId)
      .then(({ collection }) => {
        const url = collection?.metadata?.featured_image || ""
        setImageUrl(url)
        setSavedUrl(url)
      })
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [collectionId])

  const onUpload = async (file: File) => {
    setUploading(true)
    try {
      const result = await uploadFile(file)
      if (result.url) setImageUrl(result.url)
    } catch (e) {
      toast.error("Upload failed: " + (e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  const onSave = async () => {
    if (!collectionId) return
    setSaving(true)
    try {
      await updateCollectionMetadata(collectionId, { featured_image: imageUrl || null })
      setSavedUrl(imageUrl)
      toast.success("Collection image saved")
    } catch (e) {
      toast.error("Save failed: " + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const hasChanges = imageUrl !== savedUrl

  if (loading) {
    return (
      <Container className="p-4">
        <p style={{ fontSize: 13, color: A.fgMuted }}>Loading...</p>
      </Container>
    )
  }

  return (
    <Container className="p-4">
      <div style={{ marginBottom: 12 }}>
        <Heading level="h3">Featured Image</Heading>
        <p style={{ fontSize: 12, color: A.fgMuted, marginTop: 4 }}>
          Banner image shown at the top of this collection page. Also used as the OG image for social sharing.
          Recommended: 1920×480.
        </p>
      </div>

      {imageUrl && (
        <div
          style={{
            width: "100%",
            height: 140,
            borderRadius: 8,
            overflow: "hidden",
            marginBottom: 12,
            border: A.border,
          }}
        >
          <img
            src={imageUrl}
            alt="Collection banner preview"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        <Label>Image URL</Label>
        <Input
          placeholder="https://..."
          value={imageUrl}
          onChange={(e: any) => setImageUrl(e.target.value)}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <Button
            variant="secondary"
            size="small"
            onClick={() => ref.current?.click()}
            disabled={uploading}
          >
            {uploading ? "Uploading..." : "Upload Image"}
          </Button>
          {imageUrl && (
            <Button
              variant="danger"
              size="small"
              onClick={() => setImageUrl("")}
            >
              Clear
            </Button>
          )}
        </div>
        <input
          ref={ref}
          type="file"
          accept="image/*"
          style={{ display: "none" }}
          onChange={(e: any) => {
            const f = e.target.files?.[0]
            if (f) onUpload(f)
            e.target.value = ""
          }}
        />

        {hasChanges && (
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 4 }}>
            <Button variant="primary" size="small" onClick={onSave} disabled={saving}>
              {saving ? "Saving..." : "Save Image"}
            </Button>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_collection.details.after",
})

export default CollectionImageWidget
