import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Label,
  Input,
  Select,
  Switch,
  Badge,
  toast,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { A, adminHelpText } from "../lib/admin-theme"
import {
  SpecTemplate,
  SpecTemplateField,
  templateFieldKeys,
} from "../lib/spec-template"

type ProductWithCategories = {
  id: string
  metadata?: Record<string, any> | null
  categories?: Array<{
    id: string
    name?: string
    metadata?: Record<string, any> | null
    parent_category?: any | null
  }> | null
}

type StoredTemplate = {
  id: string
  name: string
  template_data: SpecTemplate
}

async function fetchProductAndTemplates(productId: string): Promise<{
  comparable: boolean
  specs: Record<string, any>
  template: SpecTemplate | null
  templateId: string | null
  templateSource: string | null
  metadata: Record<string, any>
}> {
  // 1. Fetch spec templates list
  const tRes = await fetch("/admin/spec-templates", { credentials: "include" })
  if (!tRes.ok) throw new Error("Failed to load spec templates")
  const tData = await tRes.json()
  const templatesList: StoredTemplate[] = tData.spec_templates || []

  // 2. Fetch product details
  const res = await fetch(
    `/admin/products/${productId}?fields=metadata,*categories,*categories.parent_category,*categories.parent_category.parent_category,*categories.parent_category.parent_category.parent_category`,
    { credentials: "include" }
  )
  if (!res.ok) throw new Error(await res.text())
  const { product } = (await res.json()) as { product: ProductWithCategories }
  const m = (product?.metadata || {}) as Record<string, any>

  const comparable = m.comparable !== false // defaults to TRUE (only an explicit false disables compare)

  const specs =
    m.specs && typeof m.specs === "object" && !Array.isArray(m.specs)
      ? { ...m.specs }
      : {}

  // 3. Resolve spec template from product's categories
  let template: SpecTemplate | null = null
  let templateIdVal: string | null = null
  let templateSource: string | null = null

  for (const cat of product?.categories || []) {
    let cur: any = cat
    while (cur) {
      const meta = (cur.metadata || {}) as Record<string, any>
      const tempId = meta.spec_template_id
      if (tempId) {
        const match = templatesList.find((t) => t.id === tempId)
        if (match) {
          template = match.template_data
          templateIdVal = match.id
          templateSource = match.name
          break
        }
      }
      // Backward compatibility check for inline template
      if (meta.spec_template && Array.isArray(meta.spec_template.groups)) {
        template = meta.spec_template
        templateSource = cur.name || "Legacy Category Template"
        break
      }
      cur = cur.parent_category
    }
    if (template) break
  }

  return { comparable, specs, template, templateId: templateIdVal, templateSource, metadata: m }
}

async function saveProductSpecs(
  productId: string,
  comparable: boolean,
  specs: Record<string, any>,
  keySpecs: string[],
  existingMetadata: Record<string, any>
) {
  const next: Record<string, any> = {
    ...existingMetadata,
    comparable,
    // Drop empty values from specs
    specs: Object.keys(specs).length
      ? Object.fromEntries(
          Object.entries(specs).filter(
            ([, v]) => v !== null && v !== undefined && String(v).trim() !== ""
          )
        )
      : null,
    key_specs: keySpecs.length ? keySpecs : null,
  }
  const res = await fetch(`/admin/products/${productId}`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ metadata: next }),
  })
  if (!res.ok) throw new Error(await res.text())
}

const ProductTechSpecWidget = () => {
  const { id: productId } = useParams()
  const [comparable, setComparable] = useState(false)
  const [specs, setSpecs] = useState<Record<string, any>>({})
  const [template, setTemplate] = useState<SpecTemplate | null>(null)
  const [templateId, setTemplateId] = useState<string | null>(null)
  const [templateSource, setTemplateSource] = useState<string | null>(null)
  const [savedMeta, setSavedMeta] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [suggestedValues, setSuggestedValues] = useState<Record<string, string[]>>({})
  const [aiText, setAiText] = useState("")
  const [aiParsing, setAiParsing] = useState(false)

  const handleAiParse = async () => {
    if (!template) return
    setAiParsing(true)
    try {
      const fieldsToParse: SpecTemplateField[] = []
      for (const g of template.groups) {
        for (const f of g.fields) {
          if (f.key === "price_rs") continue
          fieldsToParse.push(f)
        }
      }

      const res = await fetch("/admin/parse-specs-ai", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: aiText,
          fields: fieldsToParse,
        }),
      })

      if (!res.ok) {
        const errText = await res.text()
        let errMsg = errText
        try {
          const errObj = JSON.parse(errText)
          if (errObj.error) {
            errMsg = errObj.error
          }
        } catch (e) {}
        throw new Error(errMsg)
      }

      const data = await res.json()

      const parsedSpecs = data.specs || {}
      setSpecs((prev) => {
        const next = { ...prev }
        for (const [k, v] of Object.entries(parsedSpecs)) {
          if (v !== null && v !== undefined && String(v).trim() !== "") {
            next[k] = v
          }
        }
        return next
      })
      setDirty(true)
      toast.success("Specs filled with AI. Please review and save changes.")
    } catch (e: any) {
      toast.error("AI parsing failed: " + e.message)
    } finally {
      setAiParsing(false)
    }
  }

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
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(["__settings", "__custom"])
  )

  useEffect(() => {
    if (!productId) return
    setLoading(true)
    fetchProductAndTemplates(productId)
      .then(({ comparable, specs, template, templateId: tId, templateSource, metadata }) => {
        setComparable(comparable)
        setSpecs(specs)
        setTemplate(template)
        setTemplateId(tId)
        setTemplateSource(templateSource)
        setSavedMeta(metadata)
        if (template) {
          setOpenSections((prev) => {
            const n = new Set(prev)
            if (template.groups[0]) n.add(template.groups[0].name)
            return n
          })
        }
      })
      .catch((e) => toast.error("Load failed: " + e.message))
      .finally(() => setLoading(false))

    // Fetch previously-used spec values for autocomplete
    fetch("/admin/products?limit=1000&fields=metadata", { credentials: "include" })
      .then((res) => {
        if (!res.ok) throw new Error("Search list failed")
        return res.json()
      })
      .then((data) => {
        const products = data.products || []
        const valMap: Record<string, Set<string>> = {}
        for (const p of products) {
          const pSpecs = p.metadata?.specs
          if (pSpecs && typeof pSpecs === 'object' && !Array.isArray(pSpecs)) {
            for (const [k, v] of Object.entries(pSpecs)) {
              if (v !== null && v !== undefined && String(v).trim() !== "") {
                if (!valMap[k]) valMap[k] = new Set()
                valMap[k].add(String(v).trim())
              }
            }
          }
        }
        const suggestions: Record<string, string[]> = {}
        for (const [k, set] of Object.entries(valMap)) {
          suggestions[k] = Array.from(set).sort((a, b) =>
            a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' })
          )
        }
        setSuggestedValues(suggestions)
      })
      .catch((err) => console.error("[specs-autocomplete] Failed to load specs:", err))
  }, [productId])

  const updateSpec = (key: string, value: any) => {
    setSpecs((s) => ({ ...s, [key]: value }))
    setDirty(true)
  }

  const removeSpec = (key: string) => {
    setSpecs((s) => {
      const next = { ...s }
      delete next[key]
      return next
    })
    setDirty(true)
  }

  const toggleSection = (name: string) => {
    setOpenSections((prev) => {
      const n = new Set(prev)
      if (n.has(name)) n.delete(name)
      else n.add(name)
      return n
    })
  }

  const templateKeys = useMemo(
    () => (template ? new Set(templateFieldKeys(template)) : new Set<string>()),
    [template]
  )

  const customSpecEntries = useMemo(
    () =>
      Object.entries(specs).filter(
        ([k]) => !templateKeys.has(k) && k !== "" && !k.startsWith("_")
      ),
    [specs, templateKeys]
  )

  const derivedKeySpecs = useMemo(() => {
    if (!template) return []
    const out: string[] = []
    for (const g of template.groups) {
      for (const f of g.fields) {
        if (!f.highlight) continue
        const raw = specs[f.key]
        if (raw === null || typeof raw === "undefined") continue
        const s =
          typeof raw === "boolean"
            ? raw
              ? f.label
              : ""
            : String(raw).trim()
        if (!s) continue
        out.push(f.unit && !s.toLowerCase().endsWith(f.unit.toLowerCase()) ? `${s} ${f.unit}` : s)
      }
    }
    return out
  }, [template, specs])

  const onSave = async () => {
    if (!productId) return
    setSaving(true)
    try {
      // Check if we need to update the template's options with any newly typed select values
      if (template && templateId) {
        let templateUpdated = false
        const updatedGroups = template.groups.map((group) => {
          const updatedFields = group.fields.map((field) => {
            if (field.type === "select") {
              const val = specs[field.key]
              if (val && typeof val === "string" && val.trim() !== "") {
                const currentOptions = field.options || []
                const valParts = val.split(",").map((s) => s.trim()).filter(Boolean)
                const newParts = valParts.filter((p) => !currentOptions.includes(p))
                if (newParts.length > 0) {
                  templateUpdated = true
                  return {
                    ...field,
                    options: [...currentOptions, ...newParts],
                  }
                }
              }
            }
            return field
          })
          return { ...group, fields: updatedFields }
        })

        if (templateUpdated) {
          const updatedTemplate = { groups: updatedGroups }
          const tRes = await fetch(`/admin/spec-templates/${templateId}`, {
            method: "PATCH",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ template_data: updatedTemplate }),
          })
          if (tRes.ok) {
            setTemplate(updatedTemplate)
            toast.success("Spec template options updated with new choice")
          } else {
            console.error("Failed to update spec template options:", await tRes.text())
          }
        }
      }

      await saveProductSpecs(productId, comparable, specs, derivedKeySpecs, savedMeta)
      setSavedMeta((m) => ({
        ...m,
        comparable,
        specs,
        key_specs: derivedKeySpecs,
      }))
      setDirty(false)
      toast.success("Product specs saved")
    } catch (e: any) {
      toast.error("Save failed: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-4">
        <Label>Product Specifications</Label>
        <p style={{ fontSize: 13, color: A.fgMuted, marginTop: 4 }}>Loading…</p>
      </Container>
    )
  }

  return (
    <Container className="p-4">
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Heading level="h2" className="text-base font-semibold">
            Product Specifications
          </Heading>
          {template ? (
            <Badge size="2xsmall" color="green">
              Template: {templateSource}
            </Badge>
          ) : (
            <Badge size="2xsmall" color="grey">
              No category template
            </Badge>
          )}
          {derivedKeySpecs.length > 0 && (
            <Badge size="2xsmall" color="blue">
              {derivedKeySpecs.length} highlights
            </Badge>
          )}
        </div>
        <p style={{ fontSize: 12, color: A.fgMuted, marginTop: 4 }}>
          {template
            ? "Fill specifications based on the category's template schema."
            : "Assign a template to this product's category to get a structured specifications form."}
        </p>
      </div>

      {/* settings section */}
      <SectionHeader
        title="Settings"
        subtitle="Compare settings."
        open={openSections.has("__settings")}
        onToggle={() => toggleSection("__settings")}
      />
      {openSections.has("__settings") && (
        <div
          style={{
            padding: 12,
            border: A.border,
            borderRadius: 8,
            background: A.bgCard,
            marginBottom: 14,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <Switch
              checked={comparable}
              onCheckedChange={(v) => {
                setComparable(v)
                setDirty(true)
              }}
              id="comparable-toggle"
            />
            <div>
              <Label htmlFor="comparable-toggle" style={{ cursor: "pointer" }}>
                Comparable Product
              </Label>
              <p style={{ ...adminHelpText, marginTop: 2 }}>
                Allows customers to compare this product against others within its category.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* AI Spec Auto-Filler Section */}
      {template && (
        <div style={{ marginBottom: 14 }}>
          <SectionHeader
            title="AI Specs Auto-Filler (OpenAI)"
            subtitle="Paste raw specs text to auto-fill fields."
            open={openSections.has("__ai_filler")}
            onToggle={() => toggleSection("__ai_filler")}
          />
          {openSections.has("__ai_filler") && (
            <div
              style={{
                padding: 12,
                border: A.border,
                borderRadius: 8,
                background: A.bgCard,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div>
                <Label htmlFor="ai-raw-text">Raw Specs Text</Label>
                <p style={{ ...adminHelpText, marginTop: 2 }}>
                  Paste raw specifications article or text (e.g. from GSMArena).
                </p>
                <textarea
                  id="ai-raw-text"
                  value={aiText}
                  onChange={(e) => setAiText(e.target.value)}
                  placeholder="Paste raw specs text here..."
                  rows={6}
                  style={{
                    width: "100%",
                    marginTop: 6,
                    padding: "8px 12px",
                    borderRadius: 6,
                    border: "1px solid rgb(228, 228, 231)",
                    background: "rgb(255, 255, 255)",
                    fontSize: 12,
                    fontFamily: "inherit",
                    color: "rgb(9, 9, 11)",
                    resize: "vertical",
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={handleAiParse}
                  disabled={aiParsing || !aiText.trim()}
                >
                  {aiParsing ? "Parsing Specs..." : "Fill Specs with AI"}
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* template groups dynamic fields */}
      {template &&
        template.groups.map((group) => {
          const isOpen = openSections.has(group.name)
          return (
            <div key={group.name} style={{ marginBottom: 14 }}>
              <SectionHeader
                title={group.name}
                subtitle={`${group.fields.length} field${group.fields.length === 1 ? "" : "s"}`}
                open={isOpen}
                onToggle={() => toggleSection(group.name)}
                icon={group.icon}
              />
              {isOpen && (
                <div
                  style={{
                    padding: 12,
                    border: A.border,
                    borderRadius: 8,
                    background: A.bgCard,
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
                      gap: 12,
                    }}
                  >
                    {group.fields.map((field) => {
                      if (field.key === "price_rs") return null
                      return (
                        <SpecFieldInput
                          key={field.key}
                          field={field}
                          value={specs[field.key]}
                          onChange={(v) => updateSpec(field.key, v)}
                          suggestions={suggestedValues[field.key] || []}
                        />
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          )
        })}

      {/* custom free-form specs */}
      <SectionHeader
        title="Custom Specifications"
        subtitle="Add free-form key/value specs."
        open={openSections.has("__custom")}
        onToggle={() => toggleSection("__custom")}
      />
      {openSections.has("__custom") && (
        <CustomSpecsEditor
          entries={customSpecEntries as [string, any][]}
          existingKeys={new Set([...templateKeys, ...Object.keys(specs)])}
          onAdd={(k, v) => updateSpec(k, v)}
          onChange={(k, v) => updateSpec(k, v)}
          onRemove={(k) => removeSpec(k)}
          suggestions={suggestedValues}
        />
      )}

      {/* Save bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "flex-end",
          gap: 8,
          alignItems: "center",
          marginTop: 16,
          paddingTop: 12,
          borderTop: A.border,
        }}
      >
        {dirty && (
          <span style={{ fontSize: 11, color: A.warning }}>Unsaved changes</span>
        )}
        <Button
          variant="primary"
          size="small"
          onClick={onSave}
          disabled={saving || !dirty}
        >
          {saving ? "Saving…" : "Save Specifications"}
        </Button>
      </div>
    </Container>
  )
}

function SectionHeader({
  title,
  subtitle,
  open,
  onToggle,
  icon,
}: {
  title: string
  subtitle?: string
  open: boolean
  onToggle: () => void
  icon?: string
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      style={{
        width: "100%",
        textAlign: "left",
        background: A.bgSubtle,
        border: A.border,
        borderRadius: 8,
        padding: "8px 12px",
        marginBottom: 8,
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <span style={{ color: A.fg, fontWeight: 600, fontSize: 13 }}>
        {open ? "▾" : "▸"} {icon ? <i className={`ph-fill ${icon}`} aria-hidden /> : null} {title}
      </span>
      {subtitle && (
        <span style={{ color: A.fgMuted, fontSize: 11, fontWeight: 400, marginLeft: "auto" }}>
          {subtitle}
        </span>
      )}
    </button>
  )
}

function SpecFieldInput({
  field,
  value,
  onChange,
  suggestions,
}: {
  field: SpecTemplateField
  value: any
  onChange: (v: any) => void
  suggestions: string[]
}) {
  const type = field.type || "text"
  const labelEl = (
    <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
      <Label>{field.label}</Label>
      {field.unit && (
        <span style={{ fontSize: 11, color: A.fgMuted }}>({field.unit})</span>
      )}
      {field.highlight && (
        <span title="Highlighted field" style={{ fontSize: 11, color: A.info }}>
          ★
        </span>
      )}
    </div>
  )
  const help = field.placeholder ? (
    <p style={adminHelpText}>{field.placeholder}</p>
  ) : null

  if (type === "boolean") {
    const checked = value === true || value === "true"
    return (
      <div>
        {labelEl}
        {help}
        <div style={{ marginTop: 6 }}>
          <Switch
            id={`spec-${field.key}`}
            checked={checked}
            onCheckedChange={(v) => onChange(v)}
          />
        </div>
      </div>
    )
  }

  if (type === "select") {
    const [isOpen, setIsOpen] = useState(false)
    const [customMode, setCustomMode] = useState(false)
    const [newChoiceText, setNewChoiceText] = useState("")

    const options = field.options || []
    const selectedValues = value
      ? String(value)
          .split(",")
          .map((s) => s.trim())
          .filter(Boolean)
      : []

    const allChoices = Array.from(
      new Set([
        ...options,
        ...(suggestions || []),
        ...selectedValues,
      ])
    ).filter((opt) => typeof opt === "string" && opt.trim().length > 0)

    const handleToggleVal = (choice: string) => {
      let nextVals: string[]
      if (selectedValues.includes(choice)) {
        nextVals = selectedValues.filter((v) => v !== choice)
      } else {
        nextVals = [...selectedValues, choice]
      }
      onChange(nextVals.join(", "))
    }

    const handleAddCustom = () => {
      const trimmed = newChoiceText.trim()
      if (trimmed) {
        if (!selectedValues.includes(trimmed)) {
          const nextVals = [...selectedValues, trimmed]
          onChange(nextVals.join(", "))
        }
        setNewChoiceText("")
        setCustomMode(false)
      }
    }

    return (
      <div style={{ position: "relative" }}>
        {labelEl}
        {help}
        <div style={{ marginTop: 6 }}>
          {customMode ? (
            <div style={{ display: "flex", gap: 8 }}>
              <Input
                type="text"
                value={newChoiceText}
                onChange={(e) => setNewChoiceText(e.target.value)}
                placeholder="Enter new choice..."
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault()
                    handleAddCustom()
                  }
                }}
                autoFocus
              />
              <Button type="button" variant="primary" size="small" onClick={handleAddCustom}>
                Add
              </Button>
              <Button type="button" variant="secondary" size="small" onClick={() => setCustomMode(false)}>
                Cancel
              </Button>
            </div>
          ) : (
            <div>
              {/* Trigger Button */}
              <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                style={{
                  width: "100%",
                  minHeight: 32,
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "1px solid rgb(228, 228, 231)",
                  background: "rgb(255, 255, 255)",
                  color: "rgb(9, 9, 11)",
                  fontSize: 12,
                  textAlign: "left",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  cursor: "pointer",
                }}
              >
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginRight: 8 }}>
                  {selectedValues.length > 0 ? selectedValues.join(", ") : "Select options..."}
                </span>
                <span style={{ fontSize: 10, color: "rgb(113, 113, 122)" }}>{isOpen ? "▲" : "▼"}</span>
              </button>

              {/* Dropdown Menu */}
              {isOpen && (
                <>
                  {/* Backdrop to close dropdown on click outside */}
                  <div
                    onClick={() => setIsOpen(false)}
                    style={{
                      position: "fixed",
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      zIndex: 40,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      top: "100%",
                      left: 0,
                      right: 0,
                      marginTop: 4,
                      background: "#ffffff",
                      border: "1px solid rgb(228, 228, 231)",
                      borderRadius: 6,
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
                      maxHeight: 200,
                      overflowY: "auto",
                      zIndex: 50,
                      padding: 4,
                    }}
                  >
                    {/* Clear Selection */}
                    {selectedValues.length > 0 && (
                      <button
                        type="button"
                        onClick={() => onChange("")}
                        style={{
                          width: "100%",
                          textAlign: "left",
                          padding: "6px 8px",
                          fontSize: 11,
                          color: "#ef4444",
                          borderBottom: "1px solid rgb(244, 244, 245)",
                          background: "none",
                          borderTop: "none",
                          borderLeft: "none",
                          borderRight: "none",
                          cursor: "pointer",
                          marginBottom: 4,
                        }}
                      >
                        Clear Selection
                      </button>
                    )}

                    {/* Choices List */}
                    {allChoices.map((opt) => {
                      const isChecked = selectedValues.includes(opt)
                      return (
                        <label
                          key={opt}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: 8,
                            padding: "6px 8px",
                            borderRadius: 4,
                            cursor: "pointer",
                            fontSize: 12,
                            userSelect: "none",
                            background: isChecked ? "rgb(244, 244, 245)" : "transparent",
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.background = "rgb(244, 244, 245)"
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.background = isChecked ? "rgb(244, 244, 245)" : "transparent"
                          }}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleVal(opt)}
                            style={{
                              cursor: "pointer",
                              width: 14,
                              height: 14,
                            }}
                          />
                          <span style={{ color: "rgb(9, 9, 11)" }}>{opt}</span>
                        </label>
                      )
                    })}

                    {/* Custom mode trigger */}
                    <button
                      type="button"
                      onClick={() => {
                        setCustomMode(true)
                        setIsOpen(false)
                      }}
                      style={{
                        width: "100%",
                        textAlign: "left",
                        padding: "6px 8px",
                        fontSize: 12,
                        color: "rgb(59, 130, 246)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        borderTop: "1px solid rgb(244, 244, 245)",
                        marginTop: 4,
                      }}
                    >
                      + Add new choice...
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div>
      {labelEl}
      {help}
      <div style={{ marginTop: 6 }}>
        <Input
          type={type === "number" ? "number" : type === "date" ? "date" : "text"}
          value={value === null || typeof value === "undefined" ? "" : String(value)}
          onChange={(e) => onChange((e.target as HTMLInputElement).value)}
          placeholder={field.placeholder || ""}
          list={`datalist-${field.key}`}
        />
        {suggestions.length > 0 && (
          <datalist id={`datalist-${field.key}`}>
            {suggestions.map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        )}
      </div>
    </div>
  )
}

function CustomSpecsEditor({
  entries,
  existingKeys,
  onAdd,
  onChange,
  onRemove,
  suggestions,
}: {
  entries: [string, any][]
  existingKeys: Set<string>
  onAdd: (key: string, value: any) => void
  onChange: (key: string, value: any) => void
  onRemove: (key: string) => void
  suggestions: Record<string, string[]>
}) {
  const [newKey, setNewKey] = useState("")
  const [newValue, setNewValue] = useState("")

  const addNew = () => {
    const key = newKey
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9_]+/g, "_")
      .replace(/^_+|_+$/g, "")
    if (!key) {
      toast.error("Key is required")
      return
    }
    if (existingKeys.has(key)) {
      toast.error(`Key "${key}" already exists`)
      return
    }
    onAdd(key, newValue)
    setNewKey("")
    setNewValue("")
  }

  return (
    <div
      style={{
        padding: 12,
        border: A.border,
        borderRadius: 8,
        background: A.bgCard,
      }}
    >
      {entries.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 12 }}>
          {entries.map(([key, val]) => (
            <div
              key={key}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 2fr auto",
                gap: 8,
                alignItems: "end",
              }}
            >
              <div>
                <Label>Key</Label>
                <Input value={key} disabled />
              </div>
              <div>
                <Label>Value</Label>
                <Input
                  value={
                    val === null || typeof val === "undefined" ? "" : String(val)
                  }
                  onChange={(e) =>
                    onChange(key, (e.target as HTMLInputElement).value)
                  }
                  list={`datalist-${key}`}
                />
                {suggestions[key] && suggestions[key].length > 0 && (
                  <datalist id={`datalist-${key}`}>
                    {suggestions[key].map((v) => (
                      <option key={v} value={v} />
                    ))}
                  </datalist>
                )}
              </div>
              <Button size="small" variant="danger" onClick={() => onRemove(key)}>
                ✕
              </Button>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 2fr auto",
          gap: 8,
          alignItems: "end",
        }}
      >
        <div>
          <Label>New key</Label>
          <p style={adminHelpText}>snake_case</p>
          <Input
            value={newKey}
            onChange={(e) => setNewKey((e.target as HTMLInputElement).value)}
            placeholder="key_name"
            style={{ marginTop: 6 }}
          />
        </div>
        <div>
          <Label>Value</Label>
          <Input
            value={newValue}
            onChange={(e) => setNewValue((e.target as HTMLInputElement).value)}
            placeholder="Value"
            style={{ marginTop: 6 }}
            list={`datalist-${newKey}`}
          />
          {newKey && suggestions[newKey] && suggestions[newKey].length > 0 && (
            <datalist id={`datalist-${newKey}`}>
              {suggestions[newKey].map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>
          )}
        </div>
        <Button size="small" variant="secondary" onClick={addNew}>
          + Add
        </Button>
      </div>
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details.after",
})

export default ProductTechSpecWidget
