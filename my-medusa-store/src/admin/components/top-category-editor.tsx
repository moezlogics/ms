import { Container, Heading, Button, Text, toast, Badge } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { fetchSettings, saveSettings } from "../lib/settings-sdk"

/**
 * Page-builder block for a page's "Top Category Bar".
 *
 * Three modes, chosen with a segmented control:
 *   • "all"    → show all top-level categories (default).
 *   • "custom" → show exactly the chosen categories, in a drag-to-reorder
 *                order. Pick from clickable category pills.
 *   • "hidden" → don't render the category bar on this page at all.
 *
 * A live preview mirrors how the storefront bar will look. Stored in
 * site_settings under `settingKey` as `{ mode, ids }` (a legacy bare array
 * of ids is still read as "custom"). Self-contained (own fetch + Save,
 * partial upsert) so it drops into any admin route without clobbering
 * other settings.
 */

type Mode = "all" | "custom" | "hidden"
type Category = { id: string; name: string; handle: string; image: string | null }

async function fetchCategories(): Promise<Category[]> {
  const res = await fetch(
    "/admin/product-categories?fields=id,name,handle,metadata&limit=1000",
    { credentials: "include" }
  )
  if (!res.ok) throw new Error(await res.text())
  const json = await res.json()
  return (json.product_categories || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    handle: c.handle,
    image:
      (typeof c.metadata?.image === "string" && c.metadata.image) ||
      (typeof c.metadata?.thumbnail === "string" && c.metadata.thumbnail) ||
      null,
  }))
}

/* ── Small presentational helpers ── */

function Thumb({ cat, size = 28 }: { cat: Category; size?: number }) {
  return (
    <span
      className="rounded-full overflow-hidden bg-ui-bg-component border border-ui-border-base flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {cat.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={cat.image}
          alt=""
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      ) : (
        <span className="text-ui-fg-muted font-semibold" style={{ fontSize: size * 0.4 }}>
          {(cat.name || "?").charAt(0).toUpperCase()}
        </span>
      )}
    </span>
  )
}

function PreviewCircle({ cat }: { cat: Category }) {
  return (
    <div className="flex flex-col items-center gap-1 shrink-0" style={{ width: 64 }}>
      <Thumb cat={cat} size={48} />
      <span className="text-[10px] text-ui-fg-subtle text-center w-full truncate">
        {cat.name}
      </span>
    </div>
  )
}

export default function TopCategoryEditor({
  settingKey,
  title,
  description,
}: {
  settingKey: string
  title: string
  description: string
}) {
  const [categories, setCategories] = useState<Category[]>([])
  const [selected, setSelected] = useState<Category[]>([])
  const [mode, setModeState] = useState<Mode>("all")
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [dragIndex, setDragIndex] = useState<number | null>(null)

  useEffect(() => {
    Promise.all([fetchCategories(), fetchSettings()])
      .then(([cats, settings]) => {
        setCategories(cats)
        const byId = new Map(cats.map((c) => [c.id, c]))
        let m: Mode = "all"
        let ids: string[] = []
        try {
          const raw = settings[settingKey]
          if (raw) {
            const v = JSON.parse(raw)
            if (Array.isArray(v)) {
              ids = v.filter((x: any) => typeof x === "string")
              m = ids.length ? "custom" : "all"
            } else if (v && typeof v === "object") {
              m = v.mode === "hidden" ? "hidden" : v.mode === "custom" ? "custom" : "all"
              ids = Array.isArray(v.ids)
                ? v.ids.filter((x: any) => typeof x === "string")
                : []
            }
          }
        } catch {
          /* malformed — defaults */
        }
        setModeState(m)
        setSelected(ids.map((id) => byId.get(id)).filter(Boolean) as Category[])
      })
      .catch((e) => toast.error("Load failed: " + (e as Error).message))
      .finally(() => setLoading(false))
  }, [settingKey])

  const selectedIds = new Set(selected.map((c) => c.id))
  const available = categories.filter((c) => !selectedIds.has(c.id))
  const topLevelPreview = categories.slice(0, 16) // "all" mode preview sample

  const setMode = (m: Mode) => {
    setModeState(m)
    setDirty(true)
  }
  const mutate = (next: Category[]) => {
    setSelected(next)
    setDirty(true)
  }
  const add = (cat: Category) => {
    if (!selectedIds.has(cat.id)) mutate([...selected, cat])
  }
  const remove = (idx: number) => mutate(selected.filter((_, i) => i !== idx))
  const reorder = (from: number, to: number) => {
    if (from === to || from == null) return
    const next = [...selected]
    const [m] = next.splice(from, 1)
    next.splice(to, 0, m)
    mutate(next)
  }

  const onSave = async () => {
    setSaving(true)
    try {
      const value =
        mode === "hidden"
          ? { mode: "hidden" }
          : mode === "custom"
          ? {
              mode: "custom",
              ids: selected
                .filter((s) => categories.some((c) => c.id === s.id))
                .map((c) => c.id),
            }
          : { mode: "all" }
      await saveSettings({ [settingKey]: JSON.stringify(value) })
      setDirty(false)
      toast.success("Top category bar saved")
    } catch (e: any) {
      toast.error("Save failed: " + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  const MODE_OPTS: { value: Mode; label: string; icon: string }[] = [
    { value: "all", label: "All categories", icon: "▦" },
    { value: "custom", label: "Choose specific", icon: "✓" },
    { value: "hidden", label: "Hide bar", icon: "⦸" },
  ]

  const previewCats =
    mode === "custom" ? selected : mode === "all" ? topLevelPreview : []

  return (
    <Container className="p-0 divide-y">
      {/* Block header — grip + label, builder-style */}
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-start gap-3">
          <span
            className="mt-0.5 flex items-center justify-center rounded-md bg-ui-bg-base border border-ui-border-base text-ui-fg-muted select-none"
            style={{ width: 28, height: 28, fontSize: 14 }}
            aria-hidden
          >
            ⠿
          </span>
          <div>
            <Heading level="h2">{title}</Heading>
            <Text size="small" className="text-ui-fg-subtle mt-1">
              {description}
            </Text>
          </div>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          {dirty && (
            <Badge color="orange" size="small">
              Unsaved
            </Badge>
          )}
          <Button variant="primary" onClick={onSave} disabled={loading || saving || !dirty}>
            {saving ? "Saving…" : "Save"}
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="px-6 py-6">
          <Text size="small" className="text-ui-fg-subtle">
            Loading…
          </Text>
        </div>
      ) : (
        <>
          {/* Mode segmented control */}
          <div className="px-6 py-4">
            <Text size="xsmall" weight="plus" className="text-ui-fg-subtle mb-2 uppercase">
              Display
            </Text>
            <div className="inline-flex gap-1 rounded-lg bg-ui-bg-subtle p-1 border border-ui-border-base">
              {MODE_OPTS.map((opt) => {
                const active = mode === opt.value
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMode(opt.value)}
                    className={
                      "flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                      (active
                        ? "bg-ui-bg-base text-ui-fg-base shadow-sm"
                        : "text-ui-fg-subtle hover:text-ui-fg-base")
                    }
                  >
                    <span aria-hidden>{opt.icon}</span>
                    {opt.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Live preview canvas */}
          <div className="px-6 py-4">
            <Text size="xsmall" weight="plus" className="text-ui-fg-subtle mb-2 uppercase">
              Live preview
            </Text>
            <div className="rounded-xl border border-ui-border-base bg-ui-bg-subtle px-4 py-4">
              {mode === "hidden" ? (
                <div className="flex items-center justify-center gap-2 py-3 text-ui-fg-muted">
                  <span aria-hidden>⦸</span>
                  <Text size="small" className="text-ui-fg-muted">
                    Category bar is hidden on this page.
                  </Text>
                </div>
              ) : previewCats.length === 0 ? (
                <Text size="small" className="text-ui-fg-muted">
                  {mode === "custom"
                    ? "No categories chosen yet — add some below."
                    : "No categories found."}
                </Text>
              ) : (
                <div className="flex gap-3 overflow-x-auto pb-1">
                  {previewCats.map((c) => (
                    <PreviewCircle key={c.id} cat={c} />
                  ))}
                  {mode === "all" && categories.length > topLevelPreview.length && (
                    <div className="flex items-center text-ui-fg-muted text-xs shrink-0 px-2">
                      +{categories.length - topLevelPreview.length} more
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Custom mode: reorderable selection + add pills */}
          {mode === "custom" && (
            <div className="px-6 py-4 flex flex-col gap-5">
              {/* Selected — drag to reorder */}
              <div>
                <Text size="xsmall" weight="plus" className="text-ui-fg-subtle mb-2 uppercase">
                  Selected — drag to reorder
                </Text>
                {selected.length === 0 ? (
                  <div className="rounded-lg border border-dashed border-ui-border-base py-6 text-center">
                    <Text size="small" className="text-ui-fg-muted">
                      Nothing selected. Click categories below to add them.
                    </Text>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {selected.map((c, idx) => (
                      <div
                        key={c.id}
                        draggable
                        onDragStart={() => setDragIndex(idx)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={() => {
                          if (dragIndex !== null) reorder(dragIndex, idx)
                          setDragIndex(null)
                        }}
                        onDragEnd={() => setDragIndex(null)}
                        className={
                          "flex items-center gap-3 rounded-lg border bg-ui-bg-base px-3 py-2 cursor-grab active:cursor-grabbing transition-colors " +
                          (dragIndex === idx
                            ? "border-ui-border-interactive opacity-60"
                            : "border-ui-border-base")
                        }
                      >
                        <span className="text-ui-fg-muted select-none" aria-hidden>
                          ⠿
                        </span>
                        <Badge size="small" className="shrink-0">
                          {idx + 1}
                        </Badge>
                        <Thumb cat={c} size={28} />
                        <div className="flex-1 min-w-0">
                          <Text size="small" weight="plus" className="truncate">
                            {c.name}
                          </Text>
                          <Text size="xsmall" className="text-ui-fg-subtle truncate">
                            /{c.handle}
                          </Text>
                        </div>
                        <Button variant="transparent" size="small" onClick={() => remove(idx)}>
                          Remove
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Available — click to add */}
              <div>
                <Text size="xsmall" weight="plus" className="text-ui-fg-subtle mb-2 uppercase">
                  Add categories
                </Text>
                {available.length === 0 ? (
                  <Text size="small" className="text-ui-fg-muted">
                    All categories added.
                  </Text>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {available.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => add(c)}
                        className="flex items-center gap-1.5 rounded-full border border-ui-border-base bg-ui-bg-base px-2.5 py-1.5 text-xs text-ui-fg-base hover:bg-ui-bg-base-hover transition-colors"
                      >
                        <Thumb cat={c} size={20} />
                        <span className="truncate" style={{ maxWidth: 140 }}>
                          {c.name}
                        </span>
                        <span className="text-ui-fg-muted" aria-hidden>
                          ＋
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {mode === "all" && (
            <div className="px-6 py-4">
              <Text size="small" className="text-ui-fg-subtle">
                All top-level categories appear automatically — newly added
                categories show up without any change here.
              </Text>
            </div>
          )}
        </>
      )}
    </Container>
  )
}
