import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Input,
  Textarea,
  Label,
  Switch,
  Select,
  toast,
} from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import {
  AdminBanner,
  createBanner,
  deleteBanner,
  listBanners,
  updateBanner,
} from "../../lib/banners-sdk"
import { uploadFile } from "../../lib/settings-sdk"
import { A, adminSection } from "../../lib/admin-theme"

/**
 * Admin page for managing the homepage banner carousel.
 *
 * Layout: two-panel — left column is the banner list (with drag-to-reorder
 * via up/down arrows on each row), right column is the edit form for the
 * currently-selected banner. Hitting "Add Banner" opens a fresh form.
 *
 * Reordering is done via sort_order integers. Up/Down swap the selected
 * banner with its neighbor; the save-all action persists the list.
 */

type EditState = Partial<AdminBanner> & { id?: string }

const emptyBanner = (nextOrder: number): EditState => ({
  title: "",
  subtitle: "",
  image_url: "",
  image_url_mobile: "",
  link_url: "",
  cta_label: "",
  text_position: "bottom-left",
  theme: "dark",
  sort_order: nextOrder,
  is_active: true,
})

const Field = ({
  label,
  help,
  children,
}: {
  label: string
  help?: string
  children: React.ReactNode
}) => (
  <div>
    <Label>{label}</Label>
    {children}
    {help && <p style={{ fontSize: 11, color: A.fgMuted, marginTop: 4 }}>{help}</p>}
  </div>
)

const ImageField = ({
  label,
  value,
  onChange,
  help,
}: {
  label: string
  value: string
  onChange: (v: string) => void
  help?: string
}) => {
  const [uploading, setUploading] = useState(false)
  const ref = useRef<HTMLInputElement>(null)

  const onFile = async (file: File) => {
    setUploading(true)
    try {
      const uploaded = await uploadFile(file)
      if (uploaded.url) onChange(uploaded.url)
    } catch (e) {
      toast.error("Upload failed: " + (e as Error).message)
    } finally {
      setUploading(false)
    }
  }

  return (
    <Field label={label} help={help}>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {value && (
          <img
            src={value}
            alt={label}
            style={{
              width: 140,
              height: 80,
              objectFit: "cover",
              borderRadius: 6,
              border: A.border,
              background: A.bgSubtle,
            }}
          />
        )}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
          <Input
            placeholder="https://..."
            value={value || ""}
            onChange={(e: any) => onChange(e.target.value)}
          />
          <div style={{ display: "flex", gap: 6 }}>
            <Button
              variant="secondary"
              size="small"
              onClick={() => ref.current?.click()}
              disabled={uploading}
            >
              {uploading ? "Uploading..." : "Upload"}
            </Button>
            {value && (
              <Button variant="danger" size="small" onClick={() => onChange("")}>
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
              if (f) onFile(f)
              e.target.value = ""
            }}
          />
        </div>
      </div>
    </Field>
  )
}

const Page = () => {
  const [banners, setBanners] = useState<AdminBanner[]>([])
  const [editing, setEditing] = useState<EditState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [reordering, setReordering] = useState(false)

  const refresh = async () => {
    const list = await listBanners()
    setBanners(list)
  }

  useEffect(() => {
    refresh()
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const nextSortOrder = () =>
    banners.length === 0
      ? 0
      : Math.max(...banners.map((b) => b.sort_order || 0)) + 1

  const onNew = () => setEditing(emptyBanner(nextSortOrder()))

  const onEdit = (b: AdminBanner) => setEditing({ ...b })

  const onSave = async () => {
    if (!editing) return
    if (!editing.image_url) {
      toast.error("Image is required")
      return
    }
    setSaving(true)
    try {
      if (editing.id) {
        await updateBanner(editing.id, editing)
        toast.success("Banner updated")
      } else {
        await createBanner(editing)
        toast.success("Banner created")
      }
      setEditing(null)
      await refresh()
    } catch (e) {
      toast.error("Save failed: " + (e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const onDelete = async (id: string) => {
    if (!window.confirm("Delete this banner? This can't be undone.")) return
    try {
      await deleteBanner(id)
      toast.success("Banner deleted")
      if (editing?.id === id) setEditing(null)
      await refresh()
    } catch (e) {
      toast.error("Delete failed: " + (e as Error).message)
    }
  }

  // Swap sort_order of two banners and persist via two updates.
  const swapOrder = async (i: number, j: number) => {
    if (i < 0 || j < 0 || i >= banners.length || j >= banners.length) return
    setReordering(true)
    try {
      const a = banners[i]
      const b = banners[j]
      await Promise.all([
        updateBanner(a.id, { sort_order: b.sort_order }),
        updateBanner(b.id, { sort_order: a.sort_order }),
      ])
      await refresh()
    } catch (e) {
      toast.error("Reorder failed: " + (e as Error).message)
    } finally {
      setReordering(false)
    }
  }

  const toggleActive = async (b: AdminBanner) => {
    try {
      await updateBanner(b.id, { is_active: !b.is_active })
      await refresh()
    } catch (e) {
      toast.error("Update failed: " + (e as Error).message)
    }
  }

  if (loading) {
    return (
      <Container className="p-6">
        <p>Loading banners...</p>
      </Container>
    )
  }

  return (
    <Container className="p-6">
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
        }}
      >
        <div>
          <Heading>Homepage Banners</Heading>
          <p style={{ fontSize: 13, color: A.fgSubtle, marginTop: 4 }}>
            Full-width hero slider below the category row. Recommended size
            1920&times;720 (desktop) and 750&times;900 (mobile). First slide is
            preloaded for performance.
          </p>
        </div>
        <Button variant="primary" onClick={onNew}>
          Add Banner
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: editing ? "1fr 1fr" : "1fr",
          gap: 20,
        }}
      >
        {/* List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {banners.length === 0 ? (
            <div
              style={{
                border: "1px dashed " + A.borderVal,
                borderRadius: 8,
                padding: 40,
                textAlign: "center",
                color: A.fgSubtle,
              }}
            >
              <p style={{ fontSize: 14, marginBottom: 12 }}>
                No banners yet — add your first one.
              </p>
              <Button variant="primary" size="small" onClick={onNew}>
                Add Banner
              </Button>
            </div>
          ) : (
            banners.map((b, i) => (
              <div
                key={b.id}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  border: A.border,
                  borderRadius: 8,
                  padding: 12,
                  background: editing?.id === b.id ? A.bgHover : A.bgCard,
                }}
              >
                <img
                  src={b.image_url}
                  alt={b.title || "banner"}
                  style={{
                    width: 110,
                    height: 62,
                    objectFit: "cover",
                    borderRadius: 4,
                    background: A.bgSubtle,
                    flexShrink: 0,
                  }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 600,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.title || <span style={{ color: "#9ca3af" }}>(untitled)</span>}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: A.fgSubtle,
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {b.link_url || "No link"}
                  </div>
                  <div
                    style={{ display: "flex", gap: 8, marginTop: 4, alignItems: "center" }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        padding: "2px 8px",
                        borderRadius: 999,
                        background: b.is_active ? "#dcfce7" : "#f3f4f6",
                        color: b.is_active ? "#166534" : "#6b7280",
                      }}
                    >
                      {b.is_active ? "Active" : "Hidden"}
                    </span>
                    <span style={{ fontSize: 11, color: A.fgMuted }}>
                      order: {b.sort_order}
                    </span>
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => swapOrder(i, i - 1)}
                    disabled={reordering || i === 0}
                  >
                    ↑
                  </Button>
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => swapOrder(i, i + 1)}
                    disabled={reordering || i === banners.length - 1}
                  >
                    ↓
                  </Button>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  <Button variant="secondary" size="small" onClick={() => toggleActive(b)}>
                    {b.is_active ? "Hide" : "Show"}
                  </Button>
                  <Button variant="secondary" size="small" onClick={() => onEdit(b)}>
                    Edit
                  </Button>
                  <Button variant="danger" size="small" onClick={() => onDelete(b.id)}>
                    Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Editor */}
        {editing && (
          <div
            style={{
              border: A.border,
              borderRadius: 8,
              padding: 20,
              background: A.bgCard,
              alignSelf: "flex-start",
              position: "sticky",
              top: 12,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 16,
              }}
            >
              <h3 style={{ fontSize: 16, fontWeight: 600, margin: 0 }}>
                {editing.id ? "Edit Banner" : "New Banner"}
              </h3>
              <Button
                variant="secondary"
                size="small"
                onClick={() => setEditing(null)}
              >
                Close
              </Button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <ImageField
                label="Desktop Image"
                help="Wide hero image. Recommended 1920×720."
                value={editing.image_url || ""}
                onChange={(v) => setEditing({ ...editing, image_url: v })}
              />
              <ImageField
                label="Mobile Image (optional)"
                help="Shown on screens < 768px. Recommended 750×900."
                value={editing.image_url_mobile || ""}
                onChange={(v) => setEditing({ ...editing, image_url_mobile: v })}
              />
              <Field label="Headline">
                <Input
                  value={editing.title || ""}
                  onChange={(e: any) => setEditing({ ...editing, title: e.target.value })}
                  placeholder="Summer Sale — up to 50% off"
                />
              </Field>
              <Field label="Subheadline">
                <Textarea
                  value={editing.subtitle || ""}
                  onChange={(e: any) =>
                    setEditing({ ...editing, subtitle: e.target.value })
                  }
                  rows={2}
                  placeholder="Lightweight linen & breathable cotton — styles for every occasion."
                />
              </Field>
              <Field label="Link URL" help="Relative paths like /store or full URLs both work">
                <Input
                  value={editing.link_url || ""}
                  onChange={(e: any) =>
                    setEditing({ ...editing, link_url: e.target.value })
                  }
                  placeholder="/store"
                />
              </Field>
              <Field label="CTA Label">
                <Input
                  value={editing.cta_label || ""}
                  onChange={(e: any) =>
                    setEditing({ ...editing, cta_label: e.target.value })
                  }
                  placeholder="Shop Now"
                />
              </Field>
              <Field label="Text Position" help="Where the glass card appears on the banner">
                <Select
                  value={editing.text_position || "bottom-left"}
                  onValueChange={(v) => setEditing({ ...editing, text_position: v })}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="bottom-left">Bottom Left</Select.Item>
                    <Select.Item value="bottom-right">Bottom Right</Select.Item>
                    <Select.Item value="top-left">Top Left</Select.Item>
                    <Select.Item value="center">Center</Select.Item>
                  </Select.Content>
                </Select>
              </Field>
              <Field label="Glass Theme" help="The color of the frosted glass box">
                <Select
                  value={editing.theme || "dark"}
                  onValueChange={(v) => setEditing({ ...editing, theme: v })}
                >
                  <Select.Trigger>
                    <Select.Value />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="dark">Dark (White text, dark glass)</Select.Item>
                    <Select.Item value="light">Light (Black text, light glass)</Select.Item>
                  </Select.Content>
                </Select>
              </Field>
              <Field label="Sort Order" help="Lower numbers appear first">
                <Input
                  type="number"
                  value={String(editing.sort_order ?? 0)}
                  onChange={(e: any) =>
                    setEditing({
                      ...editing,
                      sort_order: parseInt(e.target.value, 10) || 0,
                    })
                  }
                />
              </Field>
              <Field label="Active">
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <Switch
                    checked={editing.is_active !== false}
                    onCheckedChange={(v: boolean) =>
                      setEditing({ ...editing, is_active: v })
                    }
                  />
                  <span style={{ fontSize: 13 }}>
                    {editing.is_active !== false ? "Visible on storefront" : "Hidden"}
                  </span>
                </div>
              </Field>

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: 8,
                  marginTop: 12,
                }}
              >
                <Button variant="secondary" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button variant="primary" onClick={onSave} disabled={saving}>
                  {saving ? "Saving..." : editing.id ? "Save Changes" : "Create Banner"}
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Banners",
})

export default Page
