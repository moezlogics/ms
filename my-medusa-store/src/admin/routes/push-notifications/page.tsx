import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  Container,
  Heading,
  Button,
  Badge,
  Input,
  toast,
} from "@medusajs/ui"
import { useEffect, useMemo, useState } from "react"
import { A, adminSection, adminSectionTitle, adminDescription } from "../../lib/admin-theme"

type Subscriber = {
  id: string
  endpoint: string
  customer_id: string | null
  city: string | null
  state: string | null
  country: string | null
  device_browser: string | null
  user_agent: string | null
  gender: string | null
  created_at: string
  last_sent_at: string | null
}

type Stats = {
  total_active: number
  with_customer: number
  anonymous: number
  by_city: Array<{ key: string; count: number }>
  by_state: Array<{ key: string; count: number }>
  by_browser: Record<string, number>
  by_gender: Record<string, number>
}

async function fetchSubscribers(params: Record<string, string> = {}) {
  const qs = new URLSearchParams(params).toString()
  const url = "/admin/push-subscriptions" + (qs ? `?${qs}` : "")
  const res = await fetch(url, { credentials: "include" })
  if (!res.ok) throw new Error(await res.text())
  return res.json() as Promise<{
    subscribers: Subscriber[]
    count: number
    stats: Stats
  }>
}

async function deleteSubscriber(id: string) {
  const res = await fetch(`/admin/push-subscriptions/${id}`, {
    method: "DELETE",
    credentials: "include",
  })
  if (!res.ok) throw new Error(await res.text())
}

const Page = () => {
  const [subs, setSubs] = useState<Subscriber[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)

  // Filters
  const [city, setCity] = useState("")
  const [state, setState] = useState("")
  const [browser, setBrowser] = useState("")
  const [gender, setGender] = useState("")
  const [customersOnly, setCustomersOnly] = useState(false)

  const [search, setSearch] = useState("")

  const refresh = async () => {
    try {
      const params: Record<string, string> = {}
      if (city) params.city = city
      if (state) params.state = state
      if (browser) params.browser = browser
      if (gender) params.gender = gender
      if (customersOnly) params.customers_only = "1"
      const data = await fetchSubscribers(params)
      setSubs(data.subscribers)
      setStats(data.stats)
      setCount(data.count)
    } catch (e) {
      toast.error("Load failed: " + (e as Error).message)
    }
  }

  useEffect(() => {
    setLoading(true)
    refresh().finally(() => setLoading(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [city, state, browser, gender, customersOnly])

  const onDelete = async (id: string) => {
    if (!window.confirm("Remove this subscriber?")) return
    try {
      await deleteSubscriber(id)
      toast.success("Subscriber removed")
      await refresh()
    } catch (e) {
      toast.error("Delete failed: " + (e as Error).message)
    }
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return subs
    const q = search.toLowerCase()
    return subs.filter(
      (s) =>
        s.city?.toLowerCase().includes(q) ||
        s.state?.toLowerCase().includes(q) ||
        s.device_browser?.toLowerCase().includes(q) ||
        s.endpoint.toLowerCase().includes(q) ||
        s.customer_id?.toLowerCase().includes(q)
    )
  }, [search, subs])

  if (loading) {
    return (
      <Container className="p-6">
        <p>Loading subscribers...</p>
      </Container>
    )
  }

  return (
    <Container className="p-6">
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 20,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <Heading>Web Push — Subscribers</Heading>
          <p style={{ fontSize: 13, color: A.fgSubtle, marginTop: 4 }}>
            Manage subscribers and review reach by city, state and browser.
          </p>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <a href="/app/push-notifications/campaigns" style={{ textDecoration: "none" }}>
            <Button variant="primary">Send Campaign</Button>
          </a>
        </div>
      </div>

      {/* Stat tiles */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <StatTile label="Total Active" value={stats.total_active} accent="#22c55e" />
          <StatTile label="Logged-in" value={stats.with_customer} accent="#3b82f6" />
          <StatTile label="Anonymous" value={stats.anonymous} accent="#a78bfa" />
          <StatTile
            label="Top City"
            value={stats.by_city[0]?.key || "—"}
            sub={stats.by_city[0] ? `${stats.by_city[0].count} subs` : ""}
            accent="#f59e0b"
          />
        </div>
      )}

      {/* Filter row */}
      <div style={{ ...adminSection, padding: 14 }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 10,
            alignItems: "end",
          }}
        >
          <FilterCol label="City">
            <Input
              placeholder="e.g. Lahore"
              value={city}
              onChange={(e) => setCity(e.target.value)}
            />
          </FilterCol>
          <FilterCol label="State">
            <Input
              placeholder="e.g. Punjab"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </FilterCol>
          <FilterCol label="Browser">
            <select
              value={browser}
              onChange={(e) => setBrowser(e.target.value)}
              style={selectStyle}
            >
              <option value="">All</option>
              <option value="Chrome">Chrome</option>
              <option value="Firefox">Firefox</option>
              <option value="Edge">Edge</option>
              <option value="Safari">Safari</option>
              <option value="Opera">Opera</option>
              <option value="Other">Other</option>
            </select>
          </FilterCol>
          <FilterCol label="Gender">
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={selectStyle}
            >
              <option value="">All</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
              <option value="prefer_not_to_say">Prefer not to say</option>
            </select>
          </FilterCol>
          <FilterCol label="Search">
            <Input
              placeholder="Filter visible rows…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </FilterCol>
          <FilterCol label="Audience">
            <label
              style={{
                display: "flex",
                alignItems: "center",
                gap: 6,
                fontSize: 13,
                color: A.fg,
                paddingTop: 4,
              }}
            >
              <input
                type="checkbox"
                checked={customersOnly}
                onChange={(e) => setCustomersOnly(e.target.checked)}
              />
              Customers only
            </label>
          </FilterCol>
        </div>
      </div>

      {/* Top distributions */}
      {stats && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
            marginBottom: 20,
          }}
        >
          <DistroPanel title="Top Cities" items={stats.by_city} />
          <DistroPanel title="Top States" items={stats.by_state} />
          <DistroPanel
            title="Browsers"
            items={Object.entries(stats.by_browser).map(([key, count]) => ({
              key,
              count: count as number,
            }))}
          />
          <DistroPanel
            title="Gender"
            items={Object.entries(stats.by_gender || {}).map(([key, count]) => ({
              key: prettyGender(key),
              count: count as number,
            }))}
          />
        </div>
      )}

      {/* Subscriber table */}
      <div style={{ ...adminSection, padding: 0, overflow: "hidden" }}>
        <div style={{ padding: "12px 16px", borderBottom: A.border, background: A.bgSubtle }}>
          <h3 style={adminSectionTitle}>Subscribers ({filtered.length} of {count})</h3>
          <p style={adminDescription}>Newest first.</p>
        </div>
        {filtered.length === 0 ? (
          <div style={{ padding: 40, textAlign: "center", color: A.fgSubtle }}>
            No subscribers match your filters.
          </div>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ background: A.bgSubtle, color: A.fgSubtle }}>
                  <Th>City</Th>
                  <Th>State</Th>
                  <Th>Gender</Th>
                  <Th>Browser</Th>
                  <Th>Customer</Th>
                  <Th>Subscribed</Th>
                  <Th>Last Sent</Th>
                  <Th align="right"></Th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((s) => (
                  <tr key={s.id} style={{ borderTop: A.border }}>
                    <Td>{s.city || <span style={{ color: A.fgMuted }}>—</span>}</Td>
                    <Td>{s.state || <span style={{ color: A.fgMuted }}>—</span>}</Td>
                    <Td>
                      {s.gender ? (
                        <Badge size="xsmall" color={genderBadgeColor(s.gender)}>
                          {prettyGender(s.gender)}
                        </Badge>
                      ) : (
                        <span style={{ color: A.fgMuted }}>—</span>
                      )}
                    </Td>
                    <Td>
                      {s.device_browser ? (
                        <Badge size="xsmall">{s.device_browser}</Badge>
                      ) : (
                        <span style={{ color: A.fgMuted }}>—</span>
                      )}
                    </Td>
                    <Td>
                      {s.customer_id ? (
                        <Badge size="xsmall" color="blue">
                          {s.customer_id.slice(0, 12)}…
                        </Badge>
                      ) : (
                        <span style={{ color: A.fgMuted }}>Anonymous</span>
                      )}
                    </Td>
                    <Td>{new Date(s.created_at).toLocaleDateString()}</Td>
                    <Td>
                      {s.last_sent_at ? (
                        new Date(s.last_sent_at).toLocaleDateString()
                      ) : (
                        <span style={{ color: A.fgMuted }}>Never</span>
                      )}
                    </Td>
                    <Td align="right">
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => onDelete(s.id)}
                      >
                        Remove
                      </Button>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Container>
  )
}

const StatTile = ({
  label,
  value,
  sub,
  accent,
}: {
  label: string
  value: number | string
  sub?: string
  accent: string
}) => (
  <div
    style={{
      ...adminSection,
      padding: 16,
      marginBottom: 0,
      borderLeft: `3px solid ${accent}`,
    }}
  >
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: A.fgSubtle,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
      }}
    >
      {label}
    </div>
    <div style={{ fontSize: 24, fontWeight: 700, color: A.fg, marginTop: 4 }}>
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: 11, color: A.fgMuted, marginTop: 2 }}>{sub}</div>
    )}
  </div>
)

const FilterCol = ({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}) => (
  <div>
    <div
      style={{
        fontSize: 11,
        fontWeight: 600,
        color: A.fgSubtle,
        textTransform: "uppercase",
        letterSpacing: "0.05em",
        marginBottom: 4,
      }}
    >
      {label}
    </div>
    {children}
  </div>
)

const DistroPanel = ({
  title,
  items,
}: {
  title: string
  items: Array<{ key: string; count: number }>
}) => {
  const total = items.reduce((s, i) => s + i.count, 0) || 1
  const top = items.slice(0, 6)
  return (
    <div style={{ ...adminSection, padding: 14, marginBottom: 0 }}>
      <h4 style={{ fontSize: 13, fontWeight: 600, color: A.fg, margin: "0 0 10px" }}>
        {title}
      </h4>
      {top.length === 0 ? (
        <p style={{ fontSize: 12, color: A.fgMuted, margin: 0 }}>No data yet.</p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {top.map((i) => {
            const pct = (i.count / total) * 100
            return (
              <div key={i.key}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 12,
                    color: A.fg,
                    marginBottom: 3,
                  }}
                >
                  <span>{i.key}</span>
                  <span style={{ color: A.fgSubtle }}>{i.count}</span>
                </div>
                <div
                  style={{
                    height: 4,
                    background: A.bgField,
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      width: `${pct}%`,
                      height: "100%",
                      background: "#818cf8",
                    }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

const selectStyle: React.CSSProperties = {
  width: "100%",
  background: A.bgField,
  color: A.fg,
  border: A.border,
  borderRadius: 6,
  padding: "8px 10px",
  fontSize: 13,
  outline: "none",
}

const Th = ({
  children,
  align,
}: {
  children?: React.ReactNode
  align?: "left" | "right"
}) => (
  <th
    style={{
      textAlign: align || "left",
      padding: "10px 14px",
      fontSize: 11,
      fontWeight: 600,
      textTransform: "uppercase",
      letterSpacing: "0.05em",
    }}
  >
    {children}
  </th>
)

const Td = ({
  children,
  align,
}: {
  children?: React.ReactNode
  align?: "left" | "right"
}) => (
  <td style={{ padding: "10px 14px", textAlign: align || "left", color: A.fg }}>
    {children}
  </td>
)

/**
 * Map stored gender values (lowercase, underscore-joined) to the
 * human-readable labels we render in the UI. Keeps the column /
 * distro / badge output consistent wherever gender is shown.
 */
function prettyGender(raw: string): string {
  const v = (raw || "").toLowerCase()
  if (v === "male") return "Male"
  if (v === "female") return "Female"
  if (v === "other") return "Other"
  if (v === "prefer_not_to_say") return "Prefer not to say"
  // Unknown / future values — Title-case and swap underscores for spaces
  return v.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())
}

/** Colour the Gender badge to make the table scannable at a glance. */
function genderBadgeColor(raw: string): "blue" | "purple" | "green" | "grey" {
  const v = (raw || "").toLowerCase()
  if (v === "male") return "blue"
  if (v === "female") return "purple"
  if (v === "other") return "green"
  return "grey"
}

export const config = defineRouteConfig({
  label: "Web Push",
})

export default Page
