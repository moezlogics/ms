import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Input,
  Label,
  Textarea,
  Badge,
  toast,
} from "@medusajs/ui"
import { useEffect, useRef, useState } from "react"
import { uploadFile } from "../../../lib/settings-sdk"
import {
  A,
  adminSection,
  adminSectionTitle,
  adminDescription,
  adminHelpText,
} from "../../../lib/admin-theme"

type Campaign = {
  id: string
  title: string
  body: string
  icon_url: string | null
  image_url: string | null
  action_url: string | null
  filter_cities: string | null
  filter_states: string | null
  filter_countries: string | null
  filter_device_types: string | null
  filter_os: string | null
  filter_browsers: string | null
  filter_genders: string | null
  filter_customers_only: boolean
  total_targeted: number
  total_sent: number
  total_failed: number
  total_clicked: number
  status: "draft" | "sending" | "sent" | "failed"
  sent_at: string | null
  created_at: string
}

type Facet = { key: string; count: number }
type Facets = {
  cities: Facet[]
  states: Facet[]
  countries: Facet[]
  device_types: Facet[]
  os: Facet[]
  browsers: Facet[]
  locales: Facet[]
  genders: Facet[]
  total_active: number
  with_customer: number
  anonymous: number
}

type Form = {
  title: string
  body: string
  icon_url: string
  image_url: string
  action_url: string
  filter_cities: string[]
  filter_states: string[]
  filter_countries: string[]
  filter_device_types: string[]
  filter_os: string[]
  filter_browsers: string[]
  filter_genders: string[]
  filter_customers_only: boolean
}

const EMPTY_FORM: Form = {
  title: "",
  body: "",
  icon_url: "",
  image_url: "",
  action_url: "",
  filter_cities: [],
  filter_states: [],
  filter_countries: [],
  filter_device_types: [],
  filter_os: [],
  filter_browsers: [],
  filter_genders: [],
  filter_customers_only: false,
}

async function fetchCampaigns(): Promise<{ campaigns: Campaign[] }> {
  const res = await fetch("/admin/push-campaigns", { credentials: "include" })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function fetchFacets(): Promise<Facets> {
  const res = await fetch("/admin/push-subscriptions/facets", {
    credentials: "include",
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function sendCampaign(form: Form, dryRun = false) {
  const body = {
    title: form.title.trim(),
    body: form.body.trim(),
    icon_url: form.icon_url.trim() || undefined,
    image_url: form.image_url.trim() || undefined,
    action_url: form.action_url.trim() || undefined,
    filter_cities: form.filter_cities,
    filter_states: form.filter_states,
    filter_countries: form.filter_countries,
    filter_device_types: form.filter_device_types,
    filter_os: form.filter_os,
    filter_browsers: form.filter_browsers,
    filter_genders: form.filter_genders,
    filter_customers_only: form.filter_customers_only,
    dry_run: dryRun,
  }
  const res = await fetch("/admin/push-campaigns", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

async function sendTest(form: Form) {
  const body = {
    title: form.title.trim() || "Test Notification",
    body: form.body.trim() || "If you can read this, push is working.",
    icon_url: form.icon_url.trim() || undefined,
    image_url: form.image_url.trim() || undefined,
    action_url: form.action_url.trim() || undefined,
  }
  const res = await fetch("/admin/push-campaigns/test", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(await res.text())
  return res.json()
}

const STATUS_COLORS: Record<string, "green" | "blue" | "orange" | "red" | "grey"> = {
  draft: "grey",
  sending: "blue",
  sent: "green",
  failed: "red",
}

const Page = () => {
  const [form, setForm] = useState<Form>(EMPTY_FORM)
  const [history, setHistory] = useState<Campaign[]>([])
  const [facets, setFacets] = useState<Facets | null>(null)
  const [busy, setBusy] = useState(false)
  const [loading, setLoading] = useState(true)
  const iconRef = useRef<HTMLInputElement>(null)
  const imageRef = useRef<HTMLInputElement>(null)

  // Debounced live "would target N subscribers" estimate. Re-runs on
  // every audience-filter change so the marketer sees reach in real time.
  const [estimateTargeted, setEstimateTargeted] = useState<number | null>(null)
  const [estimating, setEstimating] = useState(false)

  const refresh = async () => {
    try {
      const [c, f] = await Promise.all([fetchCampaigns(), fetchFacets()])
      setHistory(c.campaigns)
      setFacets(f)
    } catch (e) {
      toast.error("Load failed: " + (e as Error).message)
    }
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [])

  // Live reach estimate — debounce 350ms. Server has hard cap on result
  // size so this is cheap. Only audience filters trigger it; copy/media
  // changes don't.
  useEffect(() => {
    let cancelled = false
    setEstimating(true)
    const t = setTimeout(async () => {
      try {
        // Server requires title + body. Send placeholders for the dry run
        // — they're ignored when `dry_run: true`.
        const r = await sendCampaign(
          {
            ...form,
            title: form.title.trim() || "preview",
            body: form.body.trim() || "preview",
          },
          true
        )
        if (!cancelled) setEstimateTargeted(r.total_targeted ?? 0)
      } catch {
        if (!cancelled) setEstimateTargeted(null)
      } finally {
        if (!cancelled) setEstimating(false)
      }
    }, 350)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [
    form.filter_cities,
    form.filter_states,
    form.filter_countries,
    form.filter_device_types,
    form.filter_os,
    form.filter_browsers,
    form.filter_genders,
    form.filter_customers_only,
  ])

  const onUpload = async (
    file: File,
    field: "icon_url" | "image_url"
  ) => {
    try {
      const r = await uploadFile(file)
      setForm((f) => ({ ...f, [field]: r.url }))
      toast.success("Image uploaded")
    } catch (e) {
      toast.error("Upload failed: " + (e as Error).message)
    }
  }

  const onDryRun = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required")
      return
    }
    setBusy(true)
    try {
      const r = await sendCampaign(form, true)
      toast.success(`Would target ${r.total_targeted} subscribers`)
    } catch (e) {
      toast.error("Failed: " + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onSend = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required")
      return
    }
    if (
      !window.confirm(
        "Send this push notification now? This cannot be undone."
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const r = await sendCampaign(form, false)
      toast.success(
        `Campaign sent — ${r.total_sent}/${r.total_targeted} delivered (${r.total_failed} failed${r.expired_pruned ? `, ${r.expired_pruned} pruned` : ""})`
      )
      setForm(EMPTY_FORM)
      await refresh()
    } catch (e) {
      toast.error("Failed: " + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const onTest = async () => {
    setBusy(true)
    try {
      const r = await sendTest(form)
      if (r.success) toast.success("Test push sent — check your device")
      else toast.error("Test failed: " + (r.error || "unknown"))
    } catch (e) {
      toast.error("Failed: " + (e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  if (loading) {
    return (
      <Container className="p-6">
        <p>Loading…</p>
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
          <Heading>Push Campaign Composer</Heading>
          <p style={{ fontSize: 13, color: A.fgSubtle, marginTop: 4 }}>
            Compose and send a rich-media push to your subscribers.
          </p>
        </div>
        <a href="/app/push-notifications" style={{ textDecoration: "none" }}>
          <Button variant="secondary">← Subscribers</Button>
        </a>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.2fr 1fr",
          gap: 20,
          alignItems: "flex-start",
        }}
      >
        {/* Composer form */}
        <div>
          <div style={adminSection}>
            <h3 style={adminSectionTitle}>Notification Content</h3>
            <p style={adminDescription}>What subscribers will see.</p>

            <div style={{ display: "flex", flexDirection: "column", gap: 12, marginTop: 14 }}>
              <Field label="Title *">
                <Input
                  placeholder="🎉 New arrivals just dropped"
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                />
                <p style={adminHelpText}>{form.title.length}/80 characters</p>
              </Field>

              <Field label="Body *">
                <Textarea
                  rows={3}
                  placeholder="Tap to explore the latest collection — limited stock available."
                  value={form.body}
                  onChange={(e) => setForm({ ...form, body: e.target.value })}
                />
                <p style={adminHelpText}>{form.body.length}/200 characters</p>
              </Field>

              <Field label="Action URL">
                <Input
                  placeholder="/collections/new-arrivals"
                  value={form.action_url}
                  onChange={(e) => setForm({ ...form, action_url: e.target.value })}
                />
                <p style={adminHelpText}>
                  Where the user goes when the notification is clicked. Defaults to the homepage.
                </p>
              </Field>
            </div>
          </div>

          <div style={adminSection}>
            <h3 style={adminSectionTitle}>Media</h3>
            <p style={adminDescription}>
              Icon shows beside the title. The large image is rich-media (Chrome / Edge only).
            </p>

            <div style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}>
              <Field label="Icon (96×96 or 192×192 recommended)">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Input
                    placeholder="https://…/icon.png"
                    value={form.icon_url}
                    onChange={(e) => setForm({ ...form, icon_url: e.target.value })}
                  />
                  <input
                    ref={iconRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onUpload(f, "icon_url")
                    }}
                  />
                  <Button variant="secondary" onClick={() => iconRef.current?.click()}>
                    Upload
                  </Button>
                </div>
                {form.icon_url && (
                  <img
                    src={form.icon_url}
                    alt=""
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 8,
                      marginTop: 8,
                      objectFit: "cover",
                      border: A.border,
                    }}
                  />
                )}
              </Field>

              <Field label="Large image (banner — optional)">
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Input
                    placeholder="https://…/banner.jpg"
                    value={form.image_url}
                    onChange={(e) => setForm({ ...form, image_url: e.target.value })}
                  />
                  <input
                    ref={imageRef}
                    type="file"
                    accept="image/*"
                    style={{ display: "none" }}
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (f) onUpload(f, "image_url")
                    }}
                  />
                  <Button variant="secondary" onClick={() => imageRef.current?.click()}>
                    Upload
                  </Button>
                </div>
                {form.image_url && (
                  <img
                    src={form.image_url}
                    alt=""
                    style={{
                      width: "100%",
                      maxHeight: 160,
                      borderRadius: 8,
                      marginTop: 8,
                      objectFit: "cover",
                      border: A.border,
                    }}
                  />
                )}
              </Field>
            </div>
          </div>

          <div style={adminSection}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h3 style={adminSectionTitle}>Audience</h3>
                <p style={adminDescription}>
                  Pick segments below — leave any group empty to include all.
                  Filters are AND-combined across groups, OR within a group.
                </p>
              </div>
              {/* Live reach badge */}
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 12px",
                  borderRadius: 999,
                  background: A.bgField,
                  border: A.border,
                  fontSize: 12,
                  fontWeight: 600,
                  color: A.fg,
                  whiteSpace: "nowrap",
                }}
              >
                {estimating ? (
                  <span style={{ color: A.fgSubtle }}>Estimating…</span>
                ) : estimateTargeted == null ? (
                  <span style={{ color: A.fgSubtle }}>—</span>
                ) : (
                  <>
                    <span>🎯</span>
                    <span>
                      {estimateTargeted.toLocaleString()} subscriber
                      {estimateTargeted === 1 ? "" : "s"}
                    </span>
                    {facets && facets.total_active > 0 && (
                      <span style={{ color: A.fgSubtle, fontWeight: 400 }}>
                        of {facets.total_active.toLocaleString()}
                      </span>
                    )}
                  </>
                )}
              </div>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: 14, marginTop: 14 }}
            >
              <FacetSelect
                label="Cities"
                placeholder="Select cities…"
                options={facets?.cities || []}
                value={form.filter_cities}
                onChange={(v) => setForm({ ...form, filter_cities: v })}
              />
              <FacetSelect
                label="States / regions"
                placeholder="Select states…"
                options={facets?.states || []}
                value={form.filter_states}
                onChange={(v) => setForm({ ...form, filter_states: v })}
              />
              <FacetSelect
                label="Countries"
                placeholder="Select countries…"
                options={facets?.countries || []}
                value={form.filter_countries}
                onChange={(v) => setForm({ ...form, filter_countries: v })}
              />

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                <FacetSelect
                  label="Device type"
                  placeholder="Any device"
                  options={facets?.device_types || []}
                  value={form.filter_device_types}
                  onChange={(v) => setForm({ ...form, filter_device_types: v })}
                />
                <FacetSelect
                  label="Operating system"
                  placeholder="Any OS"
                  options={facets?.os || []}
                  value={form.filter_os}
                  onChange={(v) => setForm({ ...form, filter_os: v })}
                />
              </div>

              <FacetSelect
                label="Browser"
                placeholder="Any browser"
                options={facets?.browsers || []}
                value={form.filter_browsers}
                onChange={(v) => setForm({ ...form, filter_browsers: v })}
              />

              <FacetSelect
                label="Gender"
                placeholder="Any gender"
                options={(facets?.genders || []).map((g) => ({
                  ...g,
                  key: g.key,
                }))}
                value={form.filter_genders}
                onChange={(v) => setForm({ ...form, filter_genders: v })}
                renderLabel={(k) => prettyGender(k)}
              />

              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 13,
                  color: A.fg,
                  cursor: "pointer",
                  marginTop: 4,
                }}
              >
                <input
                  type="checkbox"
                  checked={form.filter_customers_only}
                  onChange={(e) =>
                    setForm({ ...form, filter_customers_only: e.target.checked })
                  }
                  style={{ accentColor: "rgb(var(--color-primary))" }}
                />
                <span>
                  Logged-in customers only{" "}
                  <span style={{ color: A.fgSubtle, fontSize: 12 }}>
                    (skip anonymous subscribers)
                  </span>
                </span>
              </label>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: 10,
              flexWrap: "wrap",
              marginTop: 12,
            }}
          >
            <Button variant="primary" disabled={busy} onClick={onSend}>
              {busy ? "Sending…" : "Send Now"}
            </Button>
            <Button variant="secondary" disabled={busy} onClick={onDryRun}>
              Estimate Reach
            </Button>
            <Button variant="secondary" disabled={busy} onClick={onTest}>
              Send Test (latest device)
            </Button>
            <Button
              variant="secondary"
              disabled={busy}
              onClick={() => setForm(EMPTY_FORM)}
            >
              Clear
            </Button>
          </div>
        </div>

        {/* Right column — preview + history */}
        <div>
          <div style={adminSection}>
            <h3 style={adminSectionTitle}>Live Preview</h3>
            <p style={adminDescription}>How it appears in the user's notification tray.</p>
            <NotificationPreview form={form} />
          </div>

          <div style={adminSection}>
            <h3 style={adminSectionTitle}>Recent Campaigns</h3>
            {history.length === 0 ? (
              <p style={{ fontSize: 13, color: A.fgSubtle, marginTop: 8 }}>
                You haven't sent any campaigns yet.
              </p>
            ) : (
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                  marginTop: 10,
                }}
              >
                {history.slice(0, 12).map((c) => (
                  <div
                    key={c.id}
                    style={{
                      border: A.border,
                      borderRadius: 8,
                      padding: 12,
                      background: A.bgField,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: 4,
                      }}
                    >
                      <span style={{ fontWeight: 600, color: A.fg, fontSize: 13 }}>
                        {c.title}
                      </span>
                      <Badge size="xsmall" color={STATUS_COLORS[c.status] || "grey"}>
                        {c.status}
                      </Badge>
                    </div>
                    <p
                      style={{
                        fontSize: 12,
                        color: A.fgSubtle,
                        margin: "4px 0",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {c.body}
                    </p>
                    <div
                      style={{
                        display: "flex",
                        gap: 14,
                        fontSize: 11,
                        color: A.fgMuted,
                        marginTop: 6,
                      }}
                    >
                      <span>📨 {c.total_sent}/{c.total_targeted}</span>
                      {(c.total_clicked || 0) > 0 && (
                        <span title="Clicks">
                          👆 {c.total_clicked}
                          {c.total_sent > 0 && (
                            <span style={{ color: A.fgSubtle, marginLeft: 4 }}>
                              (
                              {Math.round(
                                ((c.total_clicked || 0) / c.total_sent) * 100
                              )}
                              % CTR)
                            </span>
                          )}
                        </span>
                      )}
                      {c.total_failed > 0 && (
                        <span style={{ color: A.danger }}>⚠ {c.total_failed} failed</span>
                      )}
                      <span style={{ marginLeft: "auto" }}>
                        {c.sent_at
                          ? new Date(c.sent_at).toLocaleString()
                          : new Date(c.created_at).toLocaleString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </Container>
  )
}

const Field = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div>
    <Label style={{ display: "block", marginBottom: 6, color: A.fg }}>
      {label}
    </Label>
    {children}
  </div>
)

/**
 * Searchable multi-select chip control. Options are pre-fetched from the
 * `/admin/push-subscriptions/facets` endpoint so the marketer can only
 * pick values that actually exist in the live subscriber set — no typos.
 *
 * Each option carries a subscriber `count` which we render next to the
 * label so reach is visible at glance ("Lahore (324)").
 */
function FacetSelect({
  label,
  placeholder,
  options,
  value,
  onChange,
  renderLabel,
}: {
  label: string
  placeholder: string
  options: Facet[]
  value: string[]
  onChange: (next: string[]) => void
  /**
   * Optional display transform for the raw stored key. Useful when the
   * stored value is a code like "male" but we want the chip and dropdown
   * row to read "Male". Counts + internal selection still use the raw key.
   */
  renderLabel?: (key: string) => string
}) {
  const display = renderLabel || ((k: string) => k)
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState("")
  const containerRef = useRef<HTMLDivElement>(null)

  // Close on outside click / Escape
  useEffect(() => {
    if (!open) return
    const onDoc = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false)
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false)
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("keydown", onKey)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("keydown", onKey)
    }
  }, [open])

  const selectedSet = new Set(value.map((v) => v.toLowerCase()))
  const filtered = options.filter((o) => {
    if (!query.trim()) return true
    return o.key.toLowerCase().includes(query.trim().toLowerCase())
  })

  const toggle = (key: string) => {
    if (selectedSet.has(key.toLowerCase())) {
      onChange(value.filter((v) => v.toLowerCase() !== key.toLowerCase()))
    } else {
      onChange([...value, key])
    }
  }

  const clearAll = () => onChange([])

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      <Label style={{ display: "block", marginBottom: 6, color: A.fg }}>
        {label}
      </Label>

      <div
        onClick={() => setOpen((o) => !o)}
        style={{
          minHeight: 38,
          display: "flex",
          flexWrap: "wrap",
          alignItems: "center",
          gap: 6,
          padding: "6px 10px",
          border: A.border,
          borderRadius: 8,
          background: A.bgField,
          cursor: "text",
        }}
      >
        {value.length === 0 ? (
          <span style={{ color: A.fgSubtle, fontSize: 13 }}>{placeholder}</span>
        ) : (
          value.map((v) => (
            <span
              key={v}
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
                padding: "2px 8px",
                borderRadius: 999,
                background: "rgb(var(--color-primary))",
                color: "white",
                fontSize: 12,
                fontWeight: 500,
              }}
            >
              {display(v)}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggle(v)
                }}
                style={{
                  marginLeft: 2,
                  background: "transparent",
                  border: "none",
                  color: "white",
                  cursor: "pointer",
                  padding: 0,
                  lineHeight: 1,
                  fontSize: 14,
                }}
                aria-label={`Remove ${v}`}
              >
                ×
              </button>
            </span>
          ))
        )}
        <span style={{ marginLeft: "auto", color: A.fgSubtle, fontSize: 11 }}>
          {value.length > 0 && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                clearAll()
              }}
              style={{
                background: "transparent",
                border: "none",
                color: A.fgSubtle,
                cursor: "pointer",
                padding: 0,
                fontSize: 11,
                marginRight: 6,
              }}
            >
              Clear
            </button>
          )}
          ▾
        </span>
      </div>

      {open && (
        <div
          style={{
            position: "absolute",
            top: "calc(100% + 4px)",
            left: 0,
            right: 0,
            zIndex: 30,
            border: A.border,
            borderRadius: 8,
            background: A.bg,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            maxHeight: 280,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <div style={{ padding: 8, borderBottom: A.border }}>
            <Input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={`Search ${label.toLowerCase()}…`}
            />
          </div>
          <div style={{ overflowY: "auto", flex: 1 }}>
            {filtered.length === 0 ? (
              <div
                style={{
                  padding: 14,
                  fontSize: 13,
                  color: A.fgSubtle,
                  textAlign: "center",
                }}
              >
                {options.length === 0
                  ? "No subscribers yet"
                  : "No matches"}
              </div>
            ) : (
              filtered.map((o) => {
                const isSelected = selectedSet.has(o.key.toLowerCase())
                return (
                  <button
                    key={o.key}
                    type="button"
                    onClick={() => toggle(o.key)}
                    style={{
                      width: "100%",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      padding: "8px 12px",
                      border: "none",
                      background: isSelected ? A.bgField : "transparent",
                      color: A.fg,
                      cursor: "pointer",
                      fontSize: 13,
                      textAlign: "left",
                    }}
                    onMouseEnter={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        A.bgField)
                    }
                    onMouseLeave={(e) =>
                      ((e.currentTarget as HTMLButtonElement).style.background =
                        isSelected ? A.bgField : "transparent")
                    }
                  >
                    <span
                      style={{
                        width: 16,
                        height: 16,
                        borderRadius: 4,
                        border: A.border,
                        background: isSelected
                          ? "rgb(var(--color-primary))"
                          : "transparent",
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        color: "white",
                        fontSize: 11,
                        flexShrink: 0,
                      }}
                    >
                      {isSelected && "✓"}
                    </span>
                    <span style={{ flex: 1, minWidth: 0 }}>{display(o.key)}</span>
                    <span style={{ color: A.fgSubtle, fontSize: 12 }}>
                      {o.count}
                    </span>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

const NotificationPreview = ({ form }: { form: Form }) => {
  const title = form.title || "Your notification title"
  const body = form.body || "Notification body text appears here."
  return (
    <div
      style={{
        marginTop: 12,
        background: "#f3f4f6",
        borderRadius: 12,
        padding: 14,
        boxShadow: "0 4px 14px rgba(0,0,0,0.18)",
        color: "#111827",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 8,
            background: form.icon_url ? `url(${form.icon_url}) center/cover` : "#9ca3af",
            flexShrink: 0,
          }}
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 11,
              color: "#6b7280",
              fontWeight: 500,
              marginBottom: 2,
            }}
          >
            yourstore.com • now
          </div>
          <div
            style={{
              fontWeight: 700,
              fontSize: 14,
              lineHeight: 1.3,
              color: "#111",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {title}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "#374151",
              marginTop: 2,
              lineHeight: 1.4,
              display: "-webkit-box",
              WebkitLineClamp: 2,
              WebkitBoxOrient: "vertical",
              overflow: "hidden",
            }}
          >
            {body}
          </div>
        </div>
      </div>
      {form.image_url && (
        <img
          src={form.image_url}
          alt=""
          style={{
            width: "100%",
            marginTop: 10,
            borderRadius: 8,
            maxHeight: 180,
            objectFit: "cover",
          }}
        />
      )}
    </div>
  )
}

/**
 * Pretty-print a stored gender code. Mirrors the helper used on the
 * subscriber list page so the two screens stay in sync; kept local
 * instead of shared because the admin route tree doesn't yet have a
 * common utils barrel and duplicating five lines is cheaper than
 * introducing one.
 */
function prettyGender(raw: string): string {
  const v = (raw || "").toLowerCase()
  if (v === "male") return "Male"
  if (v === "female") return "Female"
  if (v === "other") return "Other"
  if (v === "prefer_not_to_say") return "Prefer not to say"
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

export const config = defineRouteConfig({
  label: "Push Campaigns",
})

export default Page
