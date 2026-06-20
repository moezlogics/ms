import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Text, Input, toast, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { fetchSettings, saveSettings } from "../../lib/settings-sdk"
import TopCategoryEditor from "../../components/top-category-editor"
import PageBuilderHeader from "../../components/page-builder-header"

/**
 * Homepage Builder — Page-builder-style editor for the storefront homepage.
 *
 * v1: an ordered list of CATEGORY rails. Each rail shows the category's
 * products (admin-set limit) under the category name, with a "View All"
 * link, using the same layout as the "Latest" rail. Reorder up/down,
 * set per-rail limit, add/remove.
 *
 * Stored in site_settings as `homepage_sections` (JSON string):
 *   [{ category_id, category_name, category_handle, limit }]
 *
 * The storefront homepage reads + renders these below the Latest rail.
 * Built to grow — future block types (banner, brand rail, collection,
 * rich text) can be added to the same section list with a `type` field.
 */

const SETTINGS_KEY = "homepage_sections"

type Category = { id: string; name: string; handle: string }
type Section = {
  category_id: string
  category_name: string
  category_handle: string
  limit: number
}

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(
    "/admin/product-categories?fields=id,name,handle&limit=1000",
    { credentials: "include" }
  )
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return (json.product_categories || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    handle: c.handle,
  }))
}

const HomepageBuilder = () => {
  const [categories, setCategories] = useState<Category[]>([])
  const [sections, setSections] = useState<Section[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([fetchCategories(), fetchSettings()])
      .then(([cats, settings]) => {
        setCategories(cats)
        let parsed: Section[] = []
        try {
          const raw = settings[SETTINGS_KEY]
          if (raw) {
            const arr = JSON.parse(raw)
            if (Array.isArray(arr)) {
              parsed = arr
                .filter((s: any) => s && s.category_id)
                .map((s: any) => ({
                  category_id: s.category_id,
                  category_name: s.category_name || "",
                  category_handle: s.category_handle || "",
                  limit: Number(s.limit) > 0 ? Number(s.limit) : 8,
                }))
            }
          }
        } catch {
          /* malformed — start empty */
        }
        // Refresh name/handle from the live category list (in case a
        // category was renamed since it was added).
        parsed = parsed.map((s) => {
          const cat = cats.find((c) => c.id === s.category_id)
          return cat
            ? { ...s, category_name: cat.name, category_handle: cat.handle }
            : s
        })
        setSections(parsed)
      })
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [])

  const usedIds = new Set(sections.map((s) => s.category_id))
  const availableCats = categories.filter((c) => !usedIds.has(c.id))

  const mutate = (next: Section[]) => {
    setSections(next)
    setDirty(true)
  }

  const addSection = () => {
    const first = availableCats[0]
    if (!first) {
      toast.info("All categories are already added.")
      return
    }
    mutate([
      ...sections,
      {
        category_id: first.id,
        category_name: first.name,
        category_handle: first.handle,
        limit: 8,
      },
    ])
  }

  const removeSection = (idx: number) =>
    mutate(sections.filter((_, i) => i !== idx))

  const reorder = (from: number, to: number) => {
    if (from === to || from == null || to < 0 || to >= sections.length) return
    const next = [...sections]
    const [moved] = next.splice(from, 1)
    next.splice(to, 0, moved)
    mutate(next)
  }

  const setCategory = (idx: number, categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId)
    if (!cat) return
    const next = [...sections]
    next[idx] = {
      ...next[idx],
      category_id: cat.id,
      category_name: cat.name,
      category_handle: cat.handle,
    }
    mutate(next)
  }

  const setLimit = (idx: number, limit: number) => {
    const next = [...sections]
    next[idx] = { ...next[idx], limit: Math.max(1, Math.min(24, limit || 8)) }
    mutate(next)
  }

  const onSave = async () => {
    setSaving(true)
    try {
      // Drop any section whose category no longer exists.
      const clean = sections.filter((s) =>
        categories.some((c) => c.id === s.category_id)
      )
      await saveSettings({ [SETTINGS_KEY]: JSON.stringify(clean) })
      setDirty(false)
      toast.success("Homepage layout saved")
    } catch (e: any) {
      toast.error("Save failed: " + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col gap-y-3">
      <PageBuilderHeader
        page="Homepage"
        subtitle="Compose the homepage from blocks — the top category bar and category rails. Changes go live after you save each block."
      />

      <TopCategoryEditor
        settingKey="homepage_top_categories"
        title="Top Category Bar"
        description="Choose how the top category rail behaves on the homepage: show all categories, pick specific ones (drag to reorder), or hide it completely."
      />

    <Container className="p-0 divide-y">
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2">Category Rails</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Add category rails to the homepage, drag rows to reorder, and set
            how many products each rail shows. A fixed &quot;Latest&quot; rail
            always appears at the top.
          </Text>
        </div>
        <div className="flex items-center gap-3">
          {dirty && (
            <Badge color="orange" size="small">
              Unsaved
            </Badge>
          )}
          <Button
            variant="primary"
            onClick={onSave}
            disabled={loading || saving || !dirty}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      <div className="px-6 py-4 flex flex-col gap-3">
        {loading ? (
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        ) : sections.length === 0 ? (
          <div className="rounded-lg border border-dashed border-ui-border-base py-10 text-center">
            <Text size="small" className="text-ui-fg-subtle">
              No category rails yet. Click &quot;Add category rail&quot; to
              build your homepage.
            </Text>
          </div>
        ) : (
          sections.map((s, idx) => (
            <div
              key={`${s.category_id}-${idx}`}
              draggable
              onDragStart={() => setDragIndex(idx)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => {
                if (dragIndex !== null) reorder(dragIndex, idx)
                setDragIndex(null)
              }}
              onDragEnd={() => setDragIndex(null)}
              className={
                "flex items-center gap-3 rounded-lg border bg-ui-bg-subtle px-3 py-2.5 transition-colors " +
                (dragIndex === idx
                  ? "border-ui-border-interactive opacity-60"
                  : "border-ui-border-base")
              }
            >
              {/* Drag handle */}
              <span
                className="cursor-grab active:cursor-grabbing text-ui-fg-muted select-none px-1"
                title="Drag to reorder"
                aria-hidden
              >
                ⠿
              </span>

              <Badge size="small" className="shrink-0">
                {idx + 1}
              </Badge>

              {/* Category picker (native select for robustness) */}
              <div className="flex-1 min-w-0">
                <label className="block text-[11px] text-ui-fg-subtle mb-1">
                  Category
                </label>
                <select
                  value={s.category_id}
                  onChange={(e) => setCategory(idx, e.target.value)}
                  style={{
                    width: "100%",
                    height: 36,
                    padding: "0 10px",
                    borderRadius: 8,
                    border: "1px solid var(--border-base, #e5e7eb)",
                    background: "var(--bg-field, #fff)",
                    fontSize: 13,
                  }}
                >
                  {/* current (even if duplicate-guarded elsewhere) */}
                  {!categories.some((c) => c.id === s.category_id) && (
                    <option value={s.category_id}>
                      {s.category_name || "(deleted category)"}
                    </option>
                  )}
                  {categories.map((c) => (
                    <option
                      key={c.id}
                      value={c.id}
                      disabled={usedIds.has(c.id) && c.id !== s.category_id}
                    >
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Limit */}
              <div className="w-24 shrink-0">
                <label className="block text-[11px] text-ui-fg-subtle mb-1">
                  Products
                </label>
                <Input
                  type="number"
                  min={1}
                  max={24}
                  value={s.limit}
                  onChange={(e) => setLimit(idx, parseInt(e.target.value, 10))}
                />
              </div>

              {/* Remove */}
              <div className="shrink-0 self-end">
                <Button
                  variant="danger"
                  size="small"
                  onClick={() => removeSection(idx)}
                >
                  Remove
                </Button>
              </div>
            </div>
          ))
        )}

        <div className="pt-1">
          <Button
            variant="secondary"
            onClick={addSection}
            disabled={loading || availableCats.length === 0}
          >
            + Add category rail
            {!loading && availableCats.length === 0 && " (all added)"}
          </Button>
        </div>
      </div>
    </Container>
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Homepage",
})

export default HomepageBuilder
