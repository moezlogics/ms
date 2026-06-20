import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  IconButton,
  toast,
} from "@medusajs/ui"
import {
  ArrowUpMini,
  ArrowDownMini,
  Trash,
  CloudArrowUp,
  Link as LinkIcon,
  PlaySolid,
} from "@medusajs/icons"
import { useEffect, useRef, useState } from "react"
import { useParams } from "react-router-dom"
import { cdnUpload } from "../lib/cdn-upload"
import { A, adminHelpText } from "../lib/admin-theme"

/**
 * Product Videos widget — injected on the product detail page in the
 * admin. Lets operators upload product videos to the CDN, attach
 * optional poster images, reorder, and delete. Persists to
 * `product.metadata.videos` as an array of `{ url, poster? }` objects.
 *
 * The storefront PDP gallery (image-gallery component) reads the same
 * field and renders the videos with a native HTML5 player + lightbox.
 */
type VideoEntry = {
  url: string
  poster?: string
}

const VIDEO_ACCEPT = "video/mp4,video/webm,video/ogg,video/quicktime"
const IMAGE_ACCEPT = "image/*"

// ── Helpers ─────────────────────────────────────────────────────────
function parseVideos(raw: any): VideoEntry[] {
  if (!raw) return []
  if (Array.isArray(raw)) {
    return raw
      .map((v: any) => {
        if (typeof v === "string" && v.trim()) return { url: v.trim() }
        if (v && typeof v === "object" && v.url) {
          return { url: v.url, poster: v.poster || undefined }
        }
        return null
      })
      .filter(Boolean) as VideoEntry[]
  }
  if (typeof raw === "string") {
    const t = raw.trim()
    if (t.startsWith("[")) {
      try {
        return parseVideos(JSON.parse(t))
      } catch {
        return []
      }
    }
    return t
      .split(",")
      .map((u) => u.trim())
      .filter(Boolean)
      .map((url) => ({ url }))
  }
  return []
}

async function fetchProductVideos(productId: string): Promise<{
  videos: VideoEntry[]
  metadata: Record<string, any>
}> {
  const res = await fetch(`/admin/products/${productId}?fields=metadata`, {
    credentials: "include",
  })
  if (!res.ok) throw new Error(await res.text())
  const { product } = await res.json()
  const metadata = product?.metadata || {}
  return { videos: parseVideos(metadata.videos), metadata }
}

async function saveProductVideos(
  productId: string,
  videos: VideoEntry[],
  existingMetadata: Record<string, any>
): Promise<void> {
  const res = await fetch(`/admin/products/${productId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      metadata: {
        ...existingMetadata,
        videos: videos.length > 0 ? videos : null,
      },
    }),
  })
  if (!res.ok) throw new Error(await res.text())
}

// ── Component ───────────────────────────────────────────────────────
const ProductVideosWidget = () => {
  const { id: productId } = useParams()
  const [videos, setVideos] = useState<VideoEntry[]>([])
  const [savedMetadata, setSavedMetadata] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [uploadingIdx, setUploadingIdx] = useState<number | null>(null)
  const [uploadingNew, setUploadingNew] = useState(false)
  const [dirty, setDirty] = useState(false)

  const videoInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!productId) return
    fetchProductVideos(productId)
      .then(({ videos, metadata }) => {
        setVideos(videos)
        setSavedMetadata(metadata)
      })
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [productId])

  const onUploadVideo = async (file: File) => {
    if (!file) return
    if (!file.type.startsWith("video/")) {
      toast.error("Please select a video file (mp4, webm, mov, ogg)")
      return
    }
    setUploadingNew(true)
    try {
      const r = await cdnUpload(file)
      if (!r.url) throw new Error("Upload returned no URL")
      const next = [...videos, { url: r.url }]
      setVideos(next)
      setDirty(true)
      toast.success("Video uploaded — remember to save")
    } catch (e: any) {
      toast.error("Upload failed: " + (e?.message || e))
    } finally {
      setUploadingNew(false)
      if (videoInputRef.current) videoInputRef.current.value = ""
    }
  }

  const onUploadPoster = async (idx: number, file: File) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      toast.error("Poster must be an image")
      return
    }
    setUploadingIdx(idx)
    try {
      const r = await cdnUpload(file)
      if (!r.url) throw new Error("Upload returned no URL")
      const next = [...videos]
      next[idx] = { ...next[idx], poster: r.url }
      setVideos(next)
      setDirty(true)
      toast.success("Poster updated — remember to save")
    } catch (e: any) {
      toast.error("Upload failed: " + (e?.message || e))
    } finally {
      setUploadingIdx(null)
    }
  }

  const onUrlChange = (idx: number, value: string) => {
    const next = [...videos]
    next[idx] = { ...next[idx], url: value }
    setVideos(next)
    setDirty(true)
  }

  const onPosterUrlChange = (idx: number, value: string) => {
    const next = [...videos]
    next[idx] = { ...next[idx], poster: value || undefined }
    setVideos(next)
    setDirty(true)
  }

  const onAddByUrl = () => {
    setVideos((v) => [...v, { url: "" }])
    setDirty(true)
  }

  const onRemove = (idx: number) => {
    if (!window.confirm("Remove this video from the gallery?")) return
    const next = videos.filter((_, i) => i !== idx)
    setVideos(next)
    setDirty(true)
  }

  const onMove = (idx: number, dir: -1 | 1) => {
    const j = idx + dir
    if (j < 0 || j >= videos.length) return
    const next = [...videos]
    ;[next[idx], next[j]] = [next[j], next[idx]]
    setVideos(next)
    setDirty(true)
  }

  const onSave = async () => {
    if (!productId) return
    // Validate URLs
    const invalid = videos.find((v) => !v.url || !/^https?:\/\//.test(v.url))
    if (invalid) {
      toast.error("Every video needs a valid URL")
      return
    }
    setSaving(true)
    try {
      await saveProductVideos(productId, videos, savedMetadata)
      setSavedMetadata((m) => ({
        ...m,
        videos: videos.length > 0 ? videos : null,
      }))
      setDirty(false)
      toast.success("Videos saved")
    } catch (e: any) {
      toast.error("Save failed: " + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-4">
        <Label>Product Videos</Label>
        <p style={{ fontSize: 13, color: A.fgMuted, marginTop: 4 }}>
          Loading…
        </p>
      </Container>
    )
  }

  return (
    <Container className="p-4">
      <div style={{ marginBottom: 12 }}>
        <Heading level="h2" className="text-base font-semibold">
          Product Videos
        </Heading>
        <p style={{ fontSize: 12, color: A.fgMuted, marginTop: 4 }}>
          Upload short videos (mp4 / webm / mov) to play in the storefront
          gallery alongside images. Optional poster image shows before the
          video starts.
        </p>
      </div>

      {videos.length === 0 ? (
        <div
          style={{
            border: `1px dashed ${A.borderVal}`,
            borderRadius: 8,
            padding: 24,
            textAlign: "center",
            color: A.fgSubtle,
            background: A.bgField,
          }}
        >
          <PlaySolid
            style={{
              width: 28,
              height: 28,
              color: A.fgMuted,
              display: "block",
              margin: "0 auto 8px",
            }}
          />
          <p style={{ fontSize: 13, margin: 0 }}>
            No videos yet — upload one below.
          </p>
        </div>
      ) : (
        <ul style={{ display: "flex", flexDirection: "column", gap: 12, listStyle: "none", padding: 0, margin: 0 }}>
          {videos.map((v, idx) => (
            <li
              key={idx}
              style={{
                border: A.border,
                borderRadius: 10,
                padding: 12,
                background: A.bgCard,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "flex-start",
                  gap: 12,
                  marginBottom: 10,
                }}
              >
                {/* Preview */}
                <div
                  style={{
                    position: "relative",
                    width: 96,
                    height: 96,
                    flexShrink: 0,
                    borderRadius: 8,
                    overflow: "hidden",
                    background: "#000",
                  }}
                >
                  {v.url ? (
                    <video
                      src={v.url}
                      poster={v.poster}
                      muted
                      preload="metadata"
                      playsInline
                      style={{
                        width: "100%",
                        height: "100%",
                        objectFit: "cover",
                      }}
                    />
                  ) : (
                    <div
                      style={{
                        width: "100%",
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: A.fgMuted,
                      }}
                    >
                      <PlaySolid />
                    </div>
                  )}
                </div>

                {/* Order + remove controls */}
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: 6,
                    marginLeft: "auto",
                  }}
                >
                  <IconButton
                    size="small"
                    variant="transparent"
                    onClick={() => onMove(idx, -1)}
                    disabled={idx === 0}
                    aria-label="Move up"
                  >
                    <ArrowUpMini />
                  </IconButton>
                  <IconButton
                    size="small"
                    variant="transparent"
                    onClick={() => onMove(idx, 1)}
                    disabled={idx === videos.length - 1}
                    aria-label="Move down"
                  >
                    <ArrowDownMini />
                  </IconButton>
                  <IconButton
                    size="small"
                    variant="transparent"
                    onClick={() => onRemove(idx)}
                    aria-label="Remove"
                  >
                    <Trash style={{ color: A.danger }} />
                  </IconButton>
                </div>
              </div>

              {/* URL fields */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <div>
                  <Label size="xsmall">Video URL</Label>
                  <Input
                    placeholder="https://cdn.example.com/video.mp4"
                    value={v.url}
                    onChange={(e) => onUrlChange(idx, e.target.value)}
                  />
                </div>
                <div>
                  <Label size="xsmall">Poster URL (optional)</Label>
                  <div style={{ display: "flex", gap: 8 }}>
                    <Input
                      placeholder="https://cdn.example.com/poster.jpg"
                      value={v.poster || ""}
                      onChange={(e) => onPosterUrlChange(idx, e.target.value)}
                    />
                    <PosterUploadButton
                      onFile={(f) => onUploadPoster(idx, f)}
                      busy={uploadingIdx === idx}
                    />
                  </div>
                  <p style={adminHelpText}>
                    Frame shown before playback starts. If empty, the first
                    video frame is used.
                  </p>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* Upload + add-by-URL controls */}
      <div
        style={{
          marginTop: 14,
          display: "flex",
          flexWrap: "wrap",
          gap: 8,
          alignItems: "center",
        }}
      >
        <input
          ref={videoInputRef}
          type="file"
          accept={VIDEO_ACCEPT}
          style={{ display: "none" }}
          onChange={(e) => {
            const f = e.target.files?.[0]
            if (f) onUploadVideo(f)
          }}
        />
        <Button
          variant="primary"
          size="small"
          onClick={() => videoInputRef.current?.click()}
          disabled={uploadingNew}
        >
          {uploadingNew ? (
            <>Uploading…</>
          ) : (
            <>
              <CloudArrowUp /> Upload video
            </>
          )}
        </Button>
        <Button variant="secondary" size="small" onClick={onAddByUrl}>
          <LinkIcon /> Add by URL
        </Button>

        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          {dirty && (
            <span style={{ fontSize: 11, color: A.warning, alignSelf: "center" }}>
              Unsaved changes
            </span>
          )}
          <Button
            variant="primary"
            size="small"
            onClick={onSave}
            disabled={saving || !dirty}
          >
            {saving ? "Saving…" : "Save Videos"}
          </Button>
        </div>
      </div>

      <p style={{ ...adminHelpText, marginTop: 10 }}>
        Tip: keep videos under 30 seconds and ~10 MB for best mobile
        performance. Use mp4 (h.264) for the widest browser support.
      </p>
    </Container>
  )
}

const PosterUploadButton = ({
  onFile,
  busy,
}: {
  onFile: (f: File) => void
  busy: boolean
}) => {
  const ref = useRef<HTMLInputElement>(null)
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept={IMAGE_ACCEPT}
        style={{ display: "none" }}
        onChange={(e) => {
          const f = e.target.files?.[0]
          if (f) onFile(f)
          if (ref.current) ref.current.value = ""
        }}
      />
      <Button
        variant="secondary"
        size="small"
        onClick={() => ref.current?.click()}
        disabled={busy}
        type="button"
      >
        {busy ? "Uploading…" : "Upload"}
      </Button>
    </>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductVideosWidget
