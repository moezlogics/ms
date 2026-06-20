import { defineWidgetConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Label,
  Select,
  Badge,
  toast,
} from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { A, adminHelpText } from "../lib/admin-theme"

type CategoryMetaResponse = {
  product_category?: {
    id: string
    name?: string
    metadata?: Record<string, any> | null
    parent_category?: {
      id: string
      name?: string
      metadata?: Record<string, any> | null
      parent_category?: any
    } | null
  }
}

type StoredTemplate = {
  id: string
  name: string
  handle: string
  description: string | null
  icon: string
  template_data: any
}

const CategorySpecTemplateWidget = () => {
  const { id: categoryId } = useParams()
  const [templates, setTemplates] = useState<StoredTemplate[]>([])
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("none")
  const [ownTemplate, setOwnTemplate] = useState<StoredTemplate | null>(null)
  const [inheritedTemplate, setInheritedTemplate] = useState<{
    name: string
    fromName: string
    template_data: any
  } | null>(null)

  const [savedMeta, setSavedMeta] = useState<Record<string, any>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const loadData = async () => {
    if (!categoryId) return
    setLoading(true)
    try {
      // 1. Fetch spec templates list
      const tRes = await fetch("/admin/spec-templates", { credentials: "include" })
      if (!tRes.ok) throw new Error("Failed to load templates")
      const tData = await tRes.json()
      const templatesList = tData.spec_templates || []
      setTemplates(templatesList)

      // 2. Fetch category and parents
      const catRes = await fetch(
        `/admin/product-categories/${categoryId}?fields=*parent_category,*parent_category.parent_category,*parent_category.parent_category.parent_category`,
        { credentials: "include" }
      )
      if (!catRes.ok) throw new Error(await catRes.text())
      const { product_category } = (await catRes.json()) as CategoryMetaResponse
      const metadata = (product_category?.metadata || {}) as Record<string, any>
      setSavedMeta(metadata)

      const ownId = metadata.spec_template_id
      if (ownId) {
        setSelectedTemplateId(ownId)
        const match = templatesList.find((t: any) => t.id === ownId)
        if (match) {
          setOwnTemplate(match)
        }
      } else {
        setSelectedTemplateId("none")
        setOwnTemplate(null)
      }

      // Detect inherited template by walking parent category chain
      let parent = product_category?.parent_category
      let foundInherited: typeof inheritedTemplate = null

      while (parent) {
        const parentMeta = (parent.metadata || {}) as Record<string, any>
        const pTemplateId = parentMeta.spec_template_id
        if (pTemplateId) {
          const match = templatesList.find((t: any) => t.id === pTemplateId)
          if (match) {
            foundInherited = {
              name: match.name,
              fromName: parent.name || parent.id,
              template_data: match.template_data,
            }
            break
          }
        }
        parent = parent.parent_category
      }
      setInheritedTemplate(foundInherited)
    } catch (e: any) {
      toast.error("Failed to load: " + e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [categoryId])

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

  const onSave = async () => {
    if (!categoryId) return
    setSaving(true)
    try {
      const nextMeta = { ...savedMeta }
      if (selectedTemplateId === "none") {
        nextMeta.spec_template_id = null
      } else {
        nextMeta.spec_template_id = selectedTemplateId
      }

      const res = await fetch(`/admin/product-categories/${categoryId}`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ metadata: nextMeta }),
      })
      if (!res.ok) throw new Error(await res.text())

      setSavedMeta(nextMeta)
      toast.success("Category spec template association saved")
      loadData()
    } catch (e: any) {
      toast.error("Save failed: " + e.message)
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-4">
        <Label>Spec Template</Label>
        <p style={{ fontSize: 13, color: A.fgMuted, marginTop: 4 }}>Loading…</p>
      </Container>
    )
  }

  const activeTemplate = ownTemplate || (inheritedTemplate ? {
    name: inheritedTemplate.name,
    template_data: inheritedTemplate.template_data,
    isInherited: true
  } : null)

  const groupCount = activeTemplate?.template_data?.groups?.length || 0
  const fieldCount = activeTemplate?.template_data?.groups?.reduce((n: number, g: any) => n + (g.fields?.length || 0), 0) || 0

  return (
    <Container className="p-4">
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <Heading level="h2" className="text-base font-semibold">
            Category Specification Template
          </Heading>
          {activeTemplate && (
            <Badge size="2xsmall" color={(activeTemplate as any).isInherited ? "blue" : "green"}>
              {(activeTemplate as any).isInherited ? `Inherited: ${activeTemplate.name}` : `Active: ${activeTemplate.name}`}
            </Badge>
          )}
        </div>
        <p style={{ fontSize: 12, color: A.fgMuted, marginTop: 4 }}>
          Choose a reusable spec template for this category. Products in this category (and its sub-categories) will inherit this schema.
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 8, alignItems: "end", marginBottom: 16 }}>
        <div>
          <Label>Select Spec Template</Label>
          <div style={{ marginTop: 6 }}>
            <Select value={selectedTemplateId} onValueChange={(v: string) => setSelectedTemplateId(v)}>
              <Select.Trigger>
                <Select.Value placeholder="Select template..." />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="none">None (Inherit from parent or free-form)</Select.Item>
                {templates.map((t) => (
                  <Select.Item key={t.id} value={t.id}>
                    {t.name}
                  </Select.Item>
                ))}
              </Select.Content>
            </Select>
          </div>
        </div>
        <Button
          size="small"
          variant="primary"
          onClick={onSave}
          disabled={saving || selectedTemplateId === (savedMeta.spec_template_id || "none")}
        >
          {saving ? "Saving..." : "Save Selection"}
        </Button>
      </div>

      {inheritedTemplate && !ownTemplate && (
        <div style={{ background: A.bgSubtle, border: A.border, borderRadius: 8, padding: 12, marginBottom: 16 }}>
          <p style={{ fontSize: 12, margin: 0, color: A.fgMuted }}>
            Currently inheriting template <strong>{inheritedTemplate.name}</strong> from parent category <strong>{inheritedTemplate.fromName}</strong>.
          </p>
        </div>
      )}

      {activeTemplate && (
        <div style={{ background: A.bgCard, border: A.border, borderRadius: 8, padding: 16 }}>
          <div style={{ display: "flex", justifyContent: "between", alignItems: "center", marginBottom: 12 }}>
            <h4 style={{ fontSize: 13, fontWeight: 600, margin: 0 }}>Active Template Schema Details</h4>
            <span style={{ fontSize: 11, color: A.fgMuted }}>
              {groupCount} sections · {fieldCount} fields
            </span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {activeTemplate.template_data?.groups?.map((g: any, gi: number) => (
              <div key={gi} style={{ borderBottom: gi < groupCount - 1 ? A.border : "none", paddingBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4 }}>
                  {g.icon && <i className={`ph-fill ${g.icon}`} style={{ color: A.interactive, fontSize: 14 }} />}
                  <strong style={{ fontSize: 12 }}>{g.name}</strong>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, paddingLeft: 18 }}>
                  {g.fields?.map((f: any, fi: number) => (
                    <Badge key={fi} size="2xsmall" color={f.highlight ? "orange" : "grey"}>
                      {f.label}
                      {f.unit && ` (${f.unit})`}
                      {f.highlight && " ★"}
                    </Badge>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: 12, borderTop: A.border, paddingTop: 12, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 11, color: A.fgMuted }}>Templates can be configured globally in Spec Templates page.</span>
            <Button
              size="small"
              variant="secondary"
              onClick={() => window.open("/app/spec-templates", "_blank")}
            >
              Manage Templates Page ↗
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.after",
})

export default CategorySpecTemplateWidget
