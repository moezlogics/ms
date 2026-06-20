import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ListBullet } from "@medusajs/icons"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Textarea,
  Select,
  Switch,
  Badge,
  toast,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { A, adminSection, adminStickyHeader, adminSectionTitle, adminDescription, adminHelpText } from "../../lib/admin-theme"
import {
  SpecTemplate,
  SpecTemplateField,
  SpecTemplateGroup,
  SPEC_TEMPLATE_PRESETS,
} from "../../lib/spec-template"

type StoredTemplate = {
  id: string
  name: string
  handle: string
  description: string | null
  icon: string
  is_preset: boolean
  sort_order: number
  template_data: SpecTemplate
}

const COMMON_PHOSPHOR_ICONS = [
  "ph-list-checks",
  "ph-monitor",
  "ph-cpu",
  "ph-database",
  "ph-camera",
  "ph-battery-full",
  "ph-wifi-high",
  "ph-ruler",
  "ph-device-mobile",
  "ph-gear",
  "ph-info",
  "ph-package",
  "ph-lightning",
  "ph-heart",
  "ph-speaker-high",
  "ph-plug",
  "ph-game-controller",
  "ph-television",
  "ph-thermometer",
  "ph-cube",
  "ph-drop",
  "ph-leaf",
  "ph-first-aid",
]

const STANDARD_KEY_LABELS: Record<string, string> = {
  pta_approved: "PTA Approved",
  release_date: "Release Date",
  warranty: "Warranty",
  price_rs: "Price in Rs",
  colors: "Colors",
  memory: "Memory (RAM + Storage)",
  expandable_storage: "Card Slot",
  battery_capacity: "Battery Capacity",
  charging_speed: "Charging Speed",
  chipset: "Chipset",
  cpu: "Processor (CPU)",
  gpu: "GPU",
  display_size: "Display Size",
  display_technology: "Panel Technology",
  display_resolution: "Resolution",
  display_protection: "Screen Protection",
  camera_main: "Rear Camera",
  camera_front: "Selfie Camera",
  camera_features: "Camera Features",
  dimensions: "Dimensions",
  weight: "Weight",
  sim: "SIM Support",
  os: "Operating System",
  connectivity_5g: "5G Support",
  connectivity_nfc: "NFC",
  connectivity_ir: "IR Blaster (Infrared)",
  sensors: "Sensors",
}

const FIELD_TYPES: { value: NonNullable<SpecTemplateField["type"]>; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "number", label: "Number" },
  { value: "select", label: "Dropdown (select)" },
  { value: "boolean", label: "Yes / No" },
  { value: "date", label: "Date" },
]

const OptionsTextarea = ({
  value,
  onChange,
}: {
  value: string[]
  onChange: (val: string[]) => void
}) => {
  const [localVal, setLocalVal] = useState(() => (value || []).join("\n"))

  useEffect(() => {
    const currentJoined = (value || []).join("\n")
    if (currentJoined !== localVal) {
      setLocalVal(currentJoined)
    }
  }, [value])

  return (
    <Textarea
      rows={2}
      value={localVal}
      onChange={(e: any) => {
        const val = e.target.value
        setLocalVal(val)
        onChange(val.split(/\r?\n/))
      }}
      placeholder={"Option 1\nOption 2"}
      style={{ fontSize: 12, marginTop: 4 }}
    />
  )
}

export const Page = () => {
  const [templates, setTemplates] = useState<StoredTemplate[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTemplate, setEditingTemplate] = useState<Partial<StoredTemplate> | null>(null)
  const [saving, setSaving] = useState(false)
  const [showIconPickerFor, setShowIconPickerFor] = useState<{ type: "template" | "group"; groupIdx?: number } | null>(null)

  const allUsedKeys = useMemo(() => {
    const keys = new Set<string>(Object.keys(STANDARD_KEY_LABELS))
    for (const t of templates) {
      if (t.template_data?.groups) {
        for (const g of t.template_data.groups) {
          if (g.fields) {
            for (const f of g.fields) {
              if (f.key) keys.add(f.key)
            }
          }
        }
      }
    }
    return Array.from(keys).sort()
  }, [templates])

  const keyToLabelMap = useMemo(() => {
    const map = new Map<string, { label: string; type?: any; unit?: string; placeholder?: string; options?: string[] }>()
    
    // Add standard key mappings
    for (const [k, label] of Object.entries(STANDARD_KEY_LABELS)) {
      map.set(k, { label })
    }

    // Scan templates to enrich with full field structures
    for (const t of templates) {
      if (t.template_data?.groups) {
        for (const g of t.template_data.groups) {
          if (g.fields) {
            for (const f of g.fields) {
              if (f.key && f.label) {
                map.set(f.key, {
                  label: f.label,
                  type: f.type,
                  unit: f.unit,
                  placeholder: f.placeholder,
                  options: f.options,
                })
              }
            }
          }
        }
      }
    }

    // Also check presets just in case they aren't seeded yet
    for (const preset of Object.values(SPEC_TEMPLATE_PRESETS)) {
      for (const g of preset.template.groups) {
        for (const f of g.fields) {
          if (f.key && f.label) {
            map.set(f.key, {
              label: f.label,
              type: f.type,
              unit: f.unit,
              placeholder: f.placeholder,
              options: f.options,
            })
          }
        }
      }
    }

    return map
  }, [templates])


  const fetchTemplates = async () => {
    setLoading(true)
    try {
      const res = await fetch("/admin/spec-templates", { credentials: "include" })
      if (!res.ok) throw new Error(await res.text())
      const data = await res.json()
      setTemplates(data.spec_templates || [])
    } catch (e: any) {
      toast.error("Failed to load templates: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTemplates()
  }, [])

  useEffect(() => {
    const urls = [
      "https://unpkg.com/@phosphor-icons/web@2.1.1/src/fill/style.css",
      "https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css",
    ]
    urls.forEach((url) => {
      if (!document.querySelector(`link[href="${url}"]`)) {
        const link = document.createElement("link")
        link.rel = "stylesheet"
        link.href = url
        document.head.appendChild(link)
      }
    })
  }, [])

  const seedPresets = async () => {
    if (!window.confirm("Do you want to seed the database with built-in presets?")) return
    setLoading(true)
    try {
      for (const [key, val] of Object.entries(SPEC_TEMPLATE_PRESETS)) {
        const payload = {
          name: val.label,
          handle: key,
          description: val.description,
          icon: val.template.groups[0]?.icon || "ph-list-checks",
          is_preset: true,
          template_data: val.template,
        }
        await fetch("/admin/spec-templates", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })
      }
      toast.success("Presets seeded successfully")
      fetchTemplates()
    } catch (e: any) {
      toast.error("Failed to seed presets: " + e.message)
      setLoading(false)
    }
  }

  const startCreate = () => {
    setEditingTemplate({
      name: "",
      handle: "",
      description: "",
      icon: "ph-list-checks",
      is_preset: false,
      sort_order: 0,
      template_data: { groups: [] },
    })
  }

  const startEdit = (t: StoredTemplate) => {
    // Deep copy to prevent direct state mutation
    setEditingTemplate(JSON.parse(JSON.stringify(t)))
  }

  const cancelEdit = () => {
    setEditingTemplate(null)
    setShowIconPickerFor(null)
  }

  const saveEditing = async () => {
    if (!editingTemplate?.name?.trim()) {
      toast.error("Template name is required")
      return
    }

    const tData = editingTemplate.template_data || { groups: [] }
    for (const g of tData.groups) {
      if (!g.name.trim()) {
        toast.error("Each section needs a name.")
        return
      }
      for (const f of g.fields) {
        if (!f.label.trim()) {
          toast.error(`Section "${g.name}" has a field with no label.`)
          return
        }
        if (!f.key.trim()) {
          toast.error(`Field "${f.label}" in "${g.name}" has no key.`)
          return
        }
        if (f.options) {
          f.options = f.options.map((o: any) => String(o).trim()).filter(Boolean)
        }
      }
    }

    // Check duplicate keys
    const keys = new Set<string>()
    for (const g of tData.groups) {
      for (const f of g.fields) {
        if (keys.has(f.key)) {
          toast.error(`Duplicate field key "${f.key}".`)
          return
        }
        keys.add(f.key)
      }
    }

    setSaving(true)
    try {
      const handle =
        editingTemplate.handle?.trim() ||
        editingTemplate.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, "-")
          .replace(/^-|-$/g, "")

      const payload = {
        name: editingTemplate.name,
        handle,
        description: editingTemplate.description || null,
        icon: editingTemplate.icon || "ph-list-checks",
        is_preset: editingTemplate.is_preset || false,
        sort_order: Number(editingTemplate.sort_order) || 0,
        template_data: tData,
      }

      const url = editingTemplate.id
        ? `/admin/spec-templates/${editingTemplate.id}`
        : "/admin/spec-templates"
      const method = editingTemplate.id ? "PATCH" : "POST"

      const res = await fetch(url, {
        method,
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const errText = await res.text()
        throw new Error(errText || "Error saving template")
      }

      toast.success("Template saved successfully")
      setEditingTemplate(null)
      fetchTemplates()
    } catch (e: any) {
      toast.error("Save failed: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  const deleteTemplate = async (id: string) => {
    if (!window.confirm("Are you sure you want to delete this template? Categories using it will fall back to default metadata.")) return
    try {
      const res = await fetch(`/admin/spec-templates/${id}`, {
        method: "DELETE",
        credentials: "include",
      })
      if (!res.ok) throw new Error(await res.text())
      toast.success("Template deleted")
      fetchTemplates()
    } catch (e: any) {
      toast.error("Failed to delete template: " + e.message)
    }
  }

  // --- Group and Field Mutators ---
  const updateTemplateData = (updater: (prev: SpecTemplate) => SpecTemplate) => {
    if (!editingTemplate) return
    const prevData = editingTemplate.template_data || { groups: [] }
    const nextData = updater(prevData)
    setEditingTemplate((prev) => prev ? { ...prev, template_data: nextData } : null)
  }

  const addGroup = () => {
    updateTemplateData((prev) => ({
      groups: [...prev.groups, { name: "New Section", icon: "ph-info", fields: [] }],
    }))
  }

  const removeGroup = (gIdx: number) => {
    updateTemplateData((prev) => ({
      groups: prev.groups.filter((_, i) => i !== gIdx),
    }))
  }

  const moveGroup = (gIdx: number, dir: number) => {
    updateTemplateData((prev) => {
      const arr = [...prev.groups]
      const target = gIdx + dir
      if (target >= 0 && target < arr.length) {
        ;[arr[gIdx], arr[target]] = [arr[target], arr[gIdx]]
      }
      return { groups: arr }
    })
  }

  const updateGroup = (gIdx: number, patch: Partial<SpecTemplateGroup>) => {
    updateTemplateData((prev) => ({
      groups: prev.groups.map((g, i) => i === gIdx ? { ...g, ...patch } : g),
    }))
  }

  const addField = (gIdx: number) => {
    updateTemplateData((prev) => {
      const groups = prev.groups.map((g, i) => {
        if (i !== gIdx) return g
        const label = "New Field"
        // Gen unique key
        const keys = new Set(prev.groups.flatMap((gr) => gr.fields.map((f) => f.key)))
        let key = "new_field"
        let count = 1
        while (keys.has(key)) {
          key = `new_field_${count++}`
        }
        return {
          ...g,
          fields: [...g.fields, { key, label, type: "text" as const }],
        }
      })
      return { groups }
    })
  }

  const removeField = (gIdx: number, fIdx: number) => {
    updateTemplateData((prev) => ({
      groups: prev.groups.map((g, i) => i === gIdx ? { ...g, fields: g.fields.filter((_, k) => k !== fIdx) } : g),
    }))
  }

  const moveField = (gIdx: number, fIdx: number, dir: number) => {
    updateTemplateData((prev) => {
      const groups = prev.groups.map((g, i) => {
        if (i !== gIdx) return g
        const arr = [...g.fields]
        const target = fIdx + dir
        if (target >= 0 && target < arr.length) {
          ;[arr[fIdx], arr[target]] = [arr[target], arr[fIdx]]
        }
        return { ...g, fields: arr }
      })
      return { groups }
    })
  }

  const updateField = (gIdx: number, fIdx: number, patch: Partial<SpecTemplateField>) => {
    updateTemplateData((prev) => ({
      groups: prev.groups.map((g, i) => {
        if (i !== gIdx) return g
        return {
          ...g,
          fields: g.fields.map((f, k) => k === fIdx ? { ...f, ...patch } : f),
        }
      }),
    }))
  }

  // --- Render Functions ---
  const renderIconPicker = () => {
    if (!showIconPickerFor) return null
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 999,
        }}
        onClick={() => setShowIconPickerFor(null)}
      >
        <div
          style={{
            background: A.bgCard,
            border: A.border,
            borderRadius: 12,
            padding: 20,
            maxWidth: 400,
            width: "90%",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <h4 style={{ ...adminSectionTitle, marginBottom: 12 }}>Choose Icon</h4>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(6, 1fr)",
              gap: 12,
              maxHeight: 250,
              overflowY: "auto",
              padding: 4,
            }}
          >
            {COMMON_PHOSPHOR_ICONS.map((ico) => (
              <button
                key={ico}
                type="button"
                onClick={() => {
                  if (showIconPickerFor.type === "template") {
                    setEditingTemplate((prev) => prev ? { ...prev, icon: ico } : null)
                  } else if (showIconPickerFor.type === "group" && showIconPickerFor.groupIdx !== undefined) {
                    updateGroup(showIconPickerFor.groupIdx, { icon: ico })
                  }
                  setShowIconPickerFor(null)
                }}
                style={{
                  height: 44,
                  borderRadius: 8,
                  border: A.border,
                  background: A.bgSubtle,
                  cursor: "pointer",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  color: A.fg,
                }}
                title={ico}
              >
                <i className={`ph-fill ${ico}`} />
              </button>
            ))}
          </div>
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
            <Button size="small" variant="secondary" onClick={() => setShowIconPickerFor(null)}>
              Cancel
            </Button>
          </div>
        </div>
      </div>
    )
  }

  if (editingTemplate) {
    // --- Render Template Editor ---
    const tData = editingTemplate.template_data || { groups: [] }
    return (
      <Container className="p-6">
        {renderIconPicker()}
        <div style={adminStickyHeader}>
          <div>
            <Heading>{editingTemplate.id ? "Edit Spec Template" : "New Spec Template"}</Heading>
            <p style={adminDescription}>Configure sections and spec fields. Changes affect categories using this template.</p>
          </div>
          <div style={{ display: "flex", gap: 10 }}>
            <Button variant="secondary" onClick={cancelEdit} disabled={saving}>
              Cancel
            </Button>
            <Button variant="primary" onClick={saveEditing} disabled={saving}>
              {saving ? "Saving..." : "Save Template"}
            </Button>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 20, alignItems: "start" }}>
          {/* Main Form */}
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* General Info Section */}
            <div style={adminSection}>
              <h3 style={{ ...adminSectionTitle, marginBottom: 12 }}>Template Details</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 14 }}>
                <div>
                  <Label>Name</Label>
                  <p style={adminHelpText}>e.g. Mobile Phone, Television</p>
                  <Input
                    value={editingTemplate.name || ""}
                    onChange={(e: any) => setEditingTemplate((prev) => prev ? { ...prev, name: e.target.value } : null)}
                    placeholder="Mobile Phone"
                    style={{ marginTop: 6 }}
                  />
                </div>
                <div>
                  <Label>Handle / Slug</Label>
                  <p style={adminHelpText}>URL-safe name (auto-generated if empty)</p>
                  <Input
                    value={editingTemplate.handle || ""}
                    onChange={(e: any) => setEditingTemplate((prev) => prev ? { ...prev, handle: e.target.value } : null)}
                    placeholder="mobile-phone"
                    style={{ marginTop: 6 }}
                  />
                </div>
              </div>
              <div style={{ marginBottom: 14 }}>
                <Label>Description</Label>
                <p style={adminHelpText}>Short helper text for admin list</p>
                <Input
                  value={editingTemplate.description || ""}
                  onChange={(e: any) => setEditingTemplate((prev) => prev ? { ...prev, description: e.target.value } : null)}
                  placeholder="Smartphones, tablets and basic mobile devices"
                  style={{ marginTop: 6 }}
                />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "100px 1fr", gap: 14, alignItems: "end" }}>
                <div>
                  <Label>Icon</Label>
                  <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6 }}>
                    <button
                      type="button"
                      onClick={() => setShowIconPickerFor({ type: "template" })}
                      style={{
                        height: 38,
                        width: 38,
                        borderRadius: 6,
                        border: A.border,
                        background: A.bgField,
                        color: A.fg,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 18,
                      }}
                    >
                      <i className={`ph-fill ${editingTemplate.icon || "ph-list-checks"}`} />
                    </button>
                    <span style={{ fontSize: 12, color: A.fgSubtle }}>Click to pick</span>
                  </div>
                </div>
                <div>
                  <Label>Sort Order</Label>
                  <Input
                    type="number"
                    value={editingTemplate.sort_order || 0}
                    onChange={(e: any) => setEditingTemplate((prev) => prev ? { ...prev, sort_order: parseInt(e.target.value, 10) || 0 } : null)}
                    style={{ marginTop: 6, maxWidth: 120 }}
                  />
                </div>
              </div>
            </div>

            {/* Template Groups/Sections Section */}
            <div style={adminSection}>
              <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 16 }}>
                <div>
                  <h3 style={adminSectionTitle}>Specifications Sections ({tData.groups.length})</h3>
                  <p style={adminDescription}>Organize fields into logical sections (e.g. Display, Camera).</p>
                </div>
                <Button size="small" variant="secondary" onClick={addGroup}>
                  + Add Section
                </Button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                {tData.groups.map((group, gIdx) => (
                  <div
                    key={gIdx}
                    style={{
                      border: A.border,
                      borderRadius: 8,
                      background: A.bgSubtle,
                      padding: 16,
                    }}
                  >
                    {/* Group Header */}
                    <div style={{ display: "flex", alignItems: "end", gap: 12, marginBottom: 16 }}>
                      <div style={{ width: 44 }}>
                        <Label>Icon</Label>
                        <button
                          type="button"
                          onClick={() => setShowIconPickerFor({ type: "group", groupIdx: gIdx })}
                          style={{
                            height: 38,
                            width: 38,
                            borderRadius: 6,
                            border: A.border,
                            background: A.bgField,
                            color: A.fg,
                            cursor: "pointer",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: 18,
                            marginTop: 6,
                          }}
                        >
                          <i className={`ph-fill ${group.icon || "ph-info"}`} />
                        </button>
                      </div>
                      <div style={{ flex: 1 }}>
                        <Label>Section Name</Label>
                        <Input
                          value={group.name}
                          onChange={(e: any) => updateGroup(gIdx, { name: e.target.value })}
                          placeholder="e.g. Display"
                          style={{ marginTop: 6 }}
                        />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <Button
                          size="small"
                          variant="transparent"
                          disabled={gIdx === 0}
                          onClick={() => moveGroup(gIdx, -1)}
                        >
                          ↑
                        </Button>
                        <Button
                          size="small"
                          variant="transparent"
                          disabled={gIdx === tData.groups.length - 1}
                          onClick={() => moveGroup(gIdx, 1)}
                        >
                          ↓
                        </Button>
                        <Button size="small" variant="danger" onClick={() => removeGroup(gIdx)}>
                          ✕
                        </Button>
                      </div>
                    </div>

                    {/* Fields List inside Group */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 10, paddingLeft: 12, borderLeft: "2px solid var(--border-base, #333)" }}>
                      {group.fields.map((field, fIdx) => {
                        const showOptions = field.type === "select"
                        return (
                          <div
                            key={fIdx}
                            style={{
                              border: A.border,
                              borderRadius: 6,
                              padding: 10,
                              background: A.bgCard,
                            }}
                          >
                            <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 0.6fr auto auto auto", gap: 8, alignItems: "end" }}>
                              <div>
                                <Label style={{ fontSize: 11 }}>Field Label</Label>
                                <Input
                                  value={field.label}
                                  onChange={(e: any) => updateField(gIdx, fIdx, { label: e.target.value })}
                                  placeholder="e.g. Size"
                                  style={{ height: 32, fontSize: 12 }}
                                />
                              </div>
                              <div>
                                <Label style={{ fontSize: 11 }}>Storage Key</Label>
                                <Input
                                  value={field.key}
                                  list="all-reusable-keys"
                                  onChange={(e: any) => {
                                    const inputVal = e.target.value
                                    const sanitizedKey = inputVal.toLowerCase().replace(/[^a-z0-9_]+/g, "_")
                                    const patch: Partial<SpecTemplateField> = { key: sanitizedKey }
                                    
                                    // Auto-fill details if key exists in map
                                    const matched = keyToLabelMap.get(sanitizedKey)
                                    if (matched) {
                                      if (!field.label || field.label === "New Field" || field.label.trim() === "") {
                                        patch.label = matched.label
                                      }
                                      if (matched.type) {
                                        patch.type = matched.type
                                      }
                                      if (matched.unit) {
                                        patch.unit = matched.unit
                                      }
                                      if (matched.placeholder) {
                                        patch.placeholder = matched.placeholder
                                      }
                                      if (matched.options) {
                                        patch.options = matched.options
                                      }
                                    }
                                    updateField(gIdx, fIdx, patch)
                                  }}
                                  placeholder="e.g. screen_size"
                                  style={{ height: 32, fontSize: 12 }}
                                />
                              </div>
                              <div>
                                <Label style={{ fontSize: 11 }}>Unit</Label>
                                <Input
                                  value={field.unit || ""}
                                  onChange={(e: any) => updateField(gIdx, fIdx, { unit: e.target.value })}
                                  placeholder="inches"
                                  style={{ height: 32, fontSize: 12 }}
                                />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <Label style={{ fontSize: 10 }}>Highlight</Label>
                                <Switch
                                  checked={!!field.highlight}
                                  onCheckedChange={(v) => updateField(gIdx, fIdx, { highlight: v })}
                                />
                              </div>
                              <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                                <Label style={{ fontSize: 10 }}>Filterable</Label>
                                <Switch
                                  checked={!!field.is_filter}
                                  onCheckedChange={(v) => updateField(gIdx, fIdx, { is_filter: v })}
                                />
                              </div>
                              <div style={{ display: "flex", gap: 4 }}>
                                <Button
                                  size="small"
                                  variant="transparent"
                                  disabled={fIdx === 0}
                                  onClick={() => moveField(gIdx, fIdx, -1)}
                                  style={{ height: 32, width: 32 }}
                                >
                                  ↑
                                </Button>
                                <Button
                                  size="small"
                                  variant="transparent"
                                  disabled={fIdx === group.fields.length - 1}
                                  onClick={() => moveField(gIdx, fIdx, 1)}
                                  style={{ height: 32, width: 32 }}
                                >
                                  ↓
                                </Button>
                                <Button
                                  size="small"
                                  variant="danger"
                                  onClick={() => removeField(gIdx, fIdx)}
                                  style={{ height: 32, width: 32 }}
                                >
                                  ✕
                                </Button>
                              </div>
                            </div>

                            {/* Additional Field Settings */}
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 2fr", gap: 8, marginTop: 8, alignItems: "end" }}>
                              <div>
                                <Label style={{ fontSize: 11 }}>Type</Label>
                                <Select
                                  value={field.type || "text"}
                                  onValueChange={(v: string) => updateField(gIdx, fIdx, { type: v as SpecTemplateField["type"] })}
                                >
                                  <Select.Trigger style={{ height: 32, fontSize: 12 }}>
                                    <Select.Value />
                                  </Select.Trigger>
                                  <Select.Content>
                                    {FIELD_TYPES.map((t) => (
                                      <Select.Item key={t.value} value={t.value} style={{ fontSize: 12 }}>
                                        {t.label}
                                      </Select.Item>
                                    ))}
                                  </Select.Content>
                                </Select>
                              </div>
                              <div>
                                <Label style={{ fontSize: 11 }}>Placeholder Hint</Label>
                                <Input
                                  value={field.placeholder || ""}
                                  onChange={(e: any) => updateField(gIdx, fIdx, { placeholder: e.target.value })}
                                  placeholder="e.g. 6.7 inches"
                                  style={{ height: 32, fontSize: 12 }}
                                />
                              </div>
                            </div>

                            {/* Select options row */}
                            {showOptions && (
                              <div style={{ marginTop: 8 }}>
                                <Label style={{ fontSize: 11 }}>Dropdown Options (one per line)</Label>
                                <OptionsTextarea
                                  value={field.options || []}
                                  onChange={(newOptions) =>
                                    updateField(gIdx, fIdx, { options: newOptions })
                                  }
                                />
                              </div>
                            )}
                          </div>
                        )
                      })}
                      {group.fields.length === 0 && (
                        <p style={{ fontSize: 11, color: A.fgMuted, fontStyle: "italic", margin: 0 }}>No fields inside this section yet.</p>
                      )}
                      <div style={{ marginTop: 6 }}>
                        <Button size="small" variant="secondary" onClick={() => addField(gIdx)}>
                          + Add Field
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                {tData.groups.length === 0 && (
                  <div style={{ textAlign: "center", padding: "20px 0", border: "1px dashed var(--border-base)", borderRadius: 8 }}>
                    <p style={{ fontSize: 13, color: A.fgMuted, margin: 0 }}>No sections defined yet. Click "+ Add Section" to start.</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar / Preview Panel */}
          <div style={{ position: "sticky", top: 80, display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={adminSection}>
              <h3 style={adminSectionTitle}>Live Preview</h3>
              <p style={adminDescription}>Below is a mockup representation of how this template's spec sheet will display.</p>
              <div
                style={{
                  background: A.bgSubtle,
                  border: A.border,
                  borderRadius: 8,
                  padding: 12,
                  marginTop: 12,
                  maxHeight: 400,
                  overflowY: "auto",
                }}
              >
                {tData.groups.map((g, gi) => (
                  <div key={gi} style={{ marginBottom: 12 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6, borderBottom: A.border, paddingBottom: 4, marginBottom: 6 }}>
                      <i className={`ph-fill ${g.icon || "ph-info"}`} style={{ color: A.interactive }} />
                      <span style={{ fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>{g.name || "Section"}</span>
                    </div>
                    {g.fields.map((f, fi) => (
                      <div key={fi} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "2px 0" }}>
                        <span style={{ color: A.fgSubtle }}>{f.label || "Field"}</span>
                        <span style={{ fontWeight: 600 }}>
                          {f.type === "boolean" ? "Yes" : `Value${f.unit ? ` ${f.unit}` : ""}`}
                          {f.highlight && <span style={{ color: A.info, marginLeft: 3 }}>★</span>}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
                {tData.groups.length === 0 && (
                  <p style={{ fontSize: 11, color: A.fgMuted, textAlign: "center", margin: 0 }}>Add sections to see preview</p>
                )}
              </div>
            </div>
          </div>
        </div>
        <datalist id="all-reusable-keys">
          {allUsedKeys.map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </Container>
    )
  }

  // --- Render Templates Listing ---
  return (
    <Container className="p-6">
      <div style={adminStickyHeader}>
        <div>
          <Heading>Specifications Templates</Heading>
          <p style={adminDescription}>Define reusable templates for product specifications. Associate them with categories to drive forms and compare sheets.</p>
        </div>
        <div style={{ display: "flex", gap: 10 }}>
          <Button variant="secondary" onClick={seedPresets}>
            Seed Presets
          </Button>
          <Button variant="primary" onClick={startCreate}>
            + Create Template
          </Button>
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        {templates.map((t) => {
          const groupCount = t.template_data?.groups?.length || 0
          const fieldCount = t.template_data?.groups?.reduce((n, g) => n + (g.fields?.length || 0), 0) || 0
          return (
            <div
              key={t.id}
              style={{
                ...adminSection,
                marginBottom: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "16px 20px",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div
                  style={{
                    height: 40,
                    width: 40,
                    borderRadius: 8,
                    background: A.bgSubtle,
                    border: A.border,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 20,
                    color: A.interactive,
                  }}
                >
                  <i className={`ph-fill ${t.icon || "ph-list-checks"}`} />
                </div>
                <div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <h4 style={{ ...adminSectionTitle, fontSize: 15 }}>{t.name}</h4>
                    {t.is_preset && (
                      <Badge size="2xsmall" color="blue">
                        Preset
                      </Badge>
                    )}
                    <Badge size="2xsmall" color="green">
                      {groupCount} sections · {fieldCount} fields
                    </Badge>
                  </div>
                  <p style={{ ...adminDescription, fontSize: 12, marginTop: 2 }}>{t.description || "No description provided"}</p>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <Button size="small" variant="secondary" onClick={() => startEdit(t)}>
                  Edit Details / Fields
                </Button>
                <Button size="small" variant="danger" onClick={() => deleteTemplate(t.id)}>
                  Delete
                </Button>
              </div>
            </div>
          );
        })}

        {templates.length === 0 && !loading && (
          <div style={{ textAlign: "center", padding: "40px 20px", border: "1px dashed var(--border-base)", borderRadius: 8 }}>
            <Heading level="h3" style={{ fontSize: 16, color: A.fg }}>No spec templates found</Heading>
            <p style={{ ...adminDescription, marginTop: 4 }}>You can seed built-in presets or create a custom spec template from scratch.</p>
            <div style={{ marginTop: 16, display: "flex", gap: 10, justifyContent: "center" }}>
              <Button size="small" variant="secondary" onClick={seedPresets}>
                Seed Default Presets
              </Button>
              <Button size="small" variant="primary" onClick={startCreate}>
                + Create Template
              </Button>
            </div>
          </div>
        )}

        {loading && (
          <div style={{ textAlign: "center", padding: "40px 0" }}>
            <p style={{ color: A.fgMuted }}>Loading spec templates...</p>
          </div>
        )}
      </div>
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Spec Templates",
  icon: ListBullet,
})

export default Page
