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
  AdminBrand,
  createBrand,
  deleteBrand,
  listBrands,
  updateBrand,
} from "../../lib/brands-sdk"
import { uploadFile } from "../../lib/settings-sdk"
import { A } from "../../lib/admin-theme"

type EditState = Partial<AdminBrand> & { id?: string }

const emptyBrand = (nextOrder: number): EditState => ({
  name: "",
  handle: "",
  logo_url: "",
  description: "",
  website_url: "",
  seo_title: "",
  seo_description: "",
  sort_order: nextOrder,
  is_active: true,
  parent_id: null,
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
    {help && (
      <p style={{ fontSize: 11, color: A.fgMuted, marginTop: 4 }}>{help}</p>
    )}
  </div>
)

const LogoField = ({
  value,
  onChange,
}: {
  value: string
  onChange: (v: string) => void
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
    <Field label="Brand Logo" help="Recommended: square PNG/SVG, transparent background">
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        {value && (
          <img
            src={value}
            alt="Brand logo"
            style={{
              width: 80,
              height: 80,
              objectFit: "contain",
              borderRadius: 8,
              border: A.border,
              background: A.bgSubtle,
              padding: 4,
            }}
          />
        )}
        <div
          style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}
        >
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
              <Button
                variant="danger"
                size="small"
                onClick={() => onChange("")}
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
  const [brands, setBrands] = useState<AdminBrand[]>([])
  const [editing, setEditing] = useState<EditState | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const refresh = async () => {
    const list = await listBrands()
    setBrands(list)
  }

  useEffect(() => {
    refresh()
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const nextSortOrder = () =>
    brands.length === 0
      ? 0
      : Math.max(...brands.map((b) => b.sort_order || 0)) + 1

  // Brands eligible to be the *parent* of `editing`. We strip out
  // the brand itself and its descendants so the picker can't create
  // a cycle (e.g. setting Apple's parent to Mac when Mac's parent
  // is Apple). The backend re-validates this on save as a backstop.
  const eligibleParents = (() => {
    if (!editing?.id) return brands // creating new — anything goes
    const banned = new Set<string>([editing.id])
    let grew = true
    while (grew) {
      grew = false
      for (const b of brands) {
        if (b.parent_id && banned.has(b.parent_id) && !banned.has(b.id)) {
          banned.add(b.id)
          grew = true
        }
      }
    }
    return brands.filter((b) => !banned.has(b.id))
  })()

  const brandById = new Map<string, AdminBrand>(
    brands.map((b) => [b.id, b])
  )

  const onNew = () => setEditing(emptyBrand(nextSortOrder()))
  const onEdit = (b: AdminBrand) => setEditing({ ...b })

  const onSave = async () => {
    if (!editing) return
    if (!editing.name?.trim()) {
      toast.error("Brand name is required")
      return
    }
    setSaving(true)
    try {
      if (editing.id) {
        await updateBrand(editing.id, editing)
        toast.success("Brand updated")
      } else {
        await createBrand(editing)
        toast.success("Brand created")
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
    if (!window.confirm("Delete this brand? This can't be undone.")) return
    try {
      await deleteBrand(id)
      toast.success("Brand deleted")
      if (editing?.id === id) setEditing(null)
      await refresh()
    } catch (e) {
      toast.error("Delete failed: " + (e as Error).message)
    }
  }

  const toggleActive = async (b: AdminBrand) => {
    try {
      await updateBrand(b.id, { is_active: !b.is_active })
      await refresh()
    } catch (e) {
      toast.error("Update failed: " + (e as Error).message)
    }
  }

  if (loading) {
    return (
      <Container className="p-6">
        <p>Loading brands...</p>
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
          <Heading>Brands</Heading>
          <p style={{ fontSize: 13, color: A.fgSubtle, marginTop: 4 }}>
            Manage product brands. Assign brands to products from the product
            edit page.
          </p>
        </div>
        <Button variant="primary" onClick={onNew}>
          Add Brand
        </Button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: editing ? "1fr 1fr" : "1fr",
          gap: 20,
        }}
      >
        {/* Brand List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {brands.length === 0 ? (
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
                No brands yet — add your first one.
              </p>
              <Button variant="primary" size="small" onClick={onNew}>
                Add Brand
              </Button>
            </div>
          ) : (
            brands.map((b) => (
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
                  cursor: "pointer",
                }}
                onClick={() => onEdit(b)}
              >
                {b.logo_url ? (
                  <img
                    src={b.logo_url}
                    alt={b.name}
                    style={{
                      width: 48,
                      height: 48,
                      objectFit: "contain",
                      borderRadius: 6,
                      border: A.border,
                      background: A.bgSubtle,
                      padding: 2,
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 6,
                      border: A.border,
                      background: A.bgSubtle,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 18,
                      fontWeight: 700,
                      color: A.fgMuted,
                      flexShrink: 0,
                    }}
                  >
                    {b.name.charAt(0).toUpperCase()}
                  </div>
                )}

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
                    {b.name}
                  </div>
                  <div style={{ fontSize: 12, color: A.fgSubtle }}>
                    /{b.handle}
                    {b.parent_id && brandById.get(b.parent_id) && (
                      <span style={{ marginLeft: 6, color: A.fgMuted }}>
                        • sub-brand of {brandById.get(b.parent_id)!.name}
                      </span>
                    )}
                  </div>
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
                </div>

                <div
                  style={{ display: "flex", gap: 6 }}
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="secondary"
                    size="small"
                    onClick={() => toggleActive(b)}
                  >
                    {b.is_active ? "Hide" : "Show"}
                  </Button>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => onDelete(b.id)}
                  >
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
                {editing.id ? "Edit Brand" : "New Brand"}
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
              <LogoField
                value={editing.logo_url || ""}
                onChange={(v) => setEditing({ ...editing, logo_url: v })}
              />
              <Field label="Brand Name">
                <Input
                  value={editing.name || ""}
                  onChange={(e: any) =>
                    setEditing({ ...editing, name: e.target.value })
                  }
                  placeholder="e.g. Nike, Samsung, Abbott"
                />
              </Field>
              <Field label="Handle (URL slug)" help="Auto-generated from name if left empty">
                <Input
                  value={editing.handle || ""}
                  onChange={(e: any) =>
                    setEditing({ ...editing, handle: e.target.value })
                  }
                  placeholder="e.g. nike"
                />
              </Field>
              <Field
                label="Parent Brand"
                help="Leave empty for a top-level brand. Pick a parent to make this a sub-brand (e.g. Mac under Apple). Sub-brands appear at /brands/<parent>/<this-brand>."
              >
                <Select
                  value={editing.parent_id || "__none__"}
                  onValueChange={(v: string) =>
                    setEditing({
                      ...editing,
                      parent_id: v === "__none__" ? null : v,
                    })
                  }
                >
                  <Select.Trigger>
                    <Select.Value placeholder="None (top-level brand)" />
                  </Select.Trigger>
                  <Select.Content>
                    <Select.Item value="__none__">
                      None (top-level brand)
                    </Select.Item>
                    {eligibleParents.map((p) => (
                      <Select.Item key={p.id} value={p.id}>
                        {p.name}
                        {p.parent_id && brandById.get(p.parent_id)
                          ? ` — under ${brandById.get(p.parent_id)!.name}`
                          : ""}
                      </Select.Item>
                    ))}
                  </Select.Content>
                </Select>
              </Field>
              <Field label="Description">
                <Textarea
                  value={editing.description || ""}
                  onChange={(e: any) =>
                    setEditing({ ...editing, description: e.target.value })
                  }
                  rows={3}
                  placeholder="Brief description of the brand..."
                />
              </Field>
              <Field label="Website URL">
                <Input
                  value={editing.website_url || ""}
                  onChange={(e: any) =>
                    setEditing({ ...editing, website_url: e.target.value })
                  }
                  placeholder="https://brand-website.com"
                />
              </Field>
              <Field label="SEO Title" help="Custom title for search engines (defaults to brand name)">
                <Input
                  value={editing.seo_title || ""}
                  onChange={(e: any) =>
                    setEditing({ ...editing, seo_title: e.target.value })
                  }
                  placeholder="Brand Name — Your Store"
                />
              </Field>
              <Field label="SEO Description" help="Meta description for search engines">
                <Textarea
                  value={editing.seo_description || ""}
                  onChange={(e: any) =>
                    setEditing({ ...editing, seo_description: e.target.value })
                  }
                  rows={2}
                  placeholder="Browse all products from this brand..."
                />
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
                <div
                  style={{ display: "flex", alignItems: "center", gap: 10 }}
                >
                  <Switch
                    checked={editing.is_active !== false}
                    onCheckedChange={(v: boolean) =>
                      setEditing({ ...editing, is_active: v })
                    }
                  />
                  <span style={{ fontSize: 13 }}>
                    {editing.is_active !== false
                      ? "Visible on storefront"
                      : "Hidden"}
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
                <Button
                  variant="primary"
                  onClick={onSave}
                  disabled={saving}
                >
                  {saving
                    ? "Saving..."
                    : editing.id
                    ? "Save Changes"
                    : "Create Brand"}
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
  label: "Brands",
})

export default Page
