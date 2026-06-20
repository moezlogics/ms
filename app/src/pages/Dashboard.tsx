import { useCallback, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { getDashboard } from "../api"
import { formatMoney, statusClass, timeAgo } from "../util"
import { useLiveRefresh } from "../useLiveRefresh"
import TopBar from "../components/TopBar"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts"

type Period = "7d" | "30d" | "90d" | "12m"
const PERIODS: Period[] = ["7d", "30d", "90d", "12m"]

const STATUS_HEX: Record<string, string> = {
  completed: "#10b981",
  fulfilled: "#10b981",
  paid: "#10b981",
  pending: "#f59e0b",
  processing: "#f59e0b",
  requires_action: "#ef4444",
  canceled: "#ef4444",
  failed: "#ef4444",
  draft: "#52525b",
}

const formatCompact = (n: number) =>
  Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`

/* ── Inline SVG Icons ── */
const CashIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="1" x2="12" y2="23"></line>
    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path>
  </svg>
)

const CartIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="9" cy="21" r="1"></circle>
    <circle cx="20" cy="21" r="1"></circle>
    <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path>
  </svg>
)

const UsersIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
    <circle cx="9" cy="7" r="4"></circle>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
  </svg>
)

const RefreshIcon = ({ className }: { className?: string }) => (
  <svg className={className} width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
  </svg>
)

const WarningIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--orange)", flexShrink: 0 }}>
    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path>
    <line x1="12" y1="9" x2="12" y2="13"></line>
    <line x1="12" y1="17" x2="12.01" y2="17"></line>
  </svg>
)

const CubeIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--fg-mut)" }}>
    <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
    <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
    <line x1="12" y1="22.08" x2="12" y2="12"></line>
  </svg>
)

/* ── KPI Growth Badge ── */
function Growth({ v }: { v?: number }) {
  if (v === undefined || v === 0) return <span className="growth flat">—</span>
  const up = v > 0
  return <span className={`growth ${up ? "up" : "down"}`}>{up ? "▲" : "▼"} {Math.abs(v)}%</span>
}

/* ── Custom Recharts Tooltip ── */
const CustomAreaTooltip = ({ active, payload, label, metric, cur }: any) => {
  if (active && payload && payload.length) {
    const val = payload[0].value
    return (
      <div className="recharts-custom-tooltip">
        <p className="label">{label}</p>
        <p className="val">
          {metric === "sales" ? formatMoney(val, cur) : `${val} orders`}
        </p>
      </div>
    )
  }
  return null
}

export default function Dashboard() {
  const navigate = useNavigate()
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<Period>("30d")
  const [metric, setMetric] = useState<"sales" | "orders">("sales")
  const [firstLoad, setFirstLoad] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(
    async (p: Period = period) => {
      setRefreshing(true)
      try {
        const d = await getDashboard(p)
        setData(d)
        setError(null)
      } catch (e: any) {
        if (e?.status === 401) {
          navigate("/login", { replace: true })
        } else {
          setError(e?.message || "Failed to load dashboard statistics.")
        }
      } finally {
        setLoading(false)
        setFirstLoad(false)
        setRefreshing(false)
      }
    },
    [period, navigate]
  )

  useEffect(() => {
    setLoading(true)
    load(period)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  useLiveRefresh(() => load(period), 4000)

  const s = data?.stats
  const cur = data?.currency || "PKR"

  const statusEntries = Object.entries(data?.statusBreakdown || {}).sort(
    (a: any, b: any) => b[1] - a[1]
  )
  const statusTotal = statusEntries.reduce((acc, [, val]: any) => acc + val, 0)

  return (
    <div className="screen">
      <TopBar 
        subtitle="Dashboard" 
        loading={refreshing} 
        right={
          <button 
            className="iconbtn" 
            onClick={() => load(period)} 
            disabled={refreshing} 
            title="Refresh Dashboard"
            style={{ border: "1px solid var(--border)", display: "flex", alignItems: "center", justifyContent: "center" }}
          >
            <RefreshIcon className={refreshing ? "spin" : ""} />
          </button>
        }
      />
      <div className="content">
        {/* Period chips */}
        <div className="chips mb">
          {PERIODS.map((p) => (
            <button key={p} className={`chip ${period === p ? "on" : ""}`} onClick={() => setPeriod(p)}>
              {p}
            </button>
          ))}
        </div>

        {/* Error banner */}
        {error && (
          <div className="error-banner">
            <strong>Dashboard data couldn't load.</strong>
            <span>{error}</span>
          </div>
        )}

        {firstLoad && loading ? (
          <div className="loading">Loading dashboard…</div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="statgrid mb">
              <div className="stat">
                <div className="stat-top">
                  <span className="stat-label">Revenue</span>
                  <div style={{ color: "var(--green)" }}><CashIcon /></div>
                </div>
                <div className="stat-val">{s ? formatMoney(s.totalSales, cur) : "—"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <Growth v={s?.salesGrowth} />
                  <span className="small">vs prev. period</span>
                </div>
              </div>
              <div className="stat">
                <div className="stat-top">
                  <span className="stat-label">Orders</span>
                  <div style={{ color: "var(--orange)" }}><CartIcon /></div>
                </div>
                <div className="stat-val">{s?.totalOrders ?? 0}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <Growth v={s?.ordersGrowth} />
                  {s && <span className="small">{s.completedOrders} done · {s.pendingOrders} pending</span>}
                </div>
              </div>
              <div className="stat">
                <div className="stat-top">
                  <span className="stat-label">Avg order</span>
                  <div style={{ color: "var(--violet)" }}><CashIcon /></div>
                </div>
                <div className="stat-val">{s ? formatMoney(s.averageOrderValue, cur) : "—"}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <Growth v={s?.aovGrowth} />
                  <span className="small">per order</span>
                </div>
              </div>
              <div className="stat">
                <div className="stat-top">
                  <span className="stat-label">New customers</span>
                  <div style={{ color: "var(--blue)" }}><UsersIcon /></div>
                </div>
                <div className="stat-val">{s?.newCustomers ?? 0}</div>
                <div style={{ display: "flex", alignItems: "center", gap: "6px", flexWrap: "wrap" }}>
                  <Growth v={s?.newCustomersGrowth} />
                  {s && <span className="small">{s.customerCount} total</span>}
                </div>
              </div>
            </div>

            {/* Trend chart */}
            <div className="card mb">
              <div className="spread mb">
                <span className="bold" style={{ fontSize: "14px" }}>Performance Trend</span>
                <div className="chips">
                  <button className={`chip sm ${metric === "sales" ? "on" : ""}`} onClick={() => setMetric("sales")}>Sales</button>
                  <button className={`chip sm ${metric === "orders" ? "on" : ""}`} onClick={() => setMetric("orders")}>Orders</button>
                </div>
              </div>
              <div style={{ width: "100%", height: 160 }}>
                {!data || !data.chartData || data.chartData.length === 0 ? (
                  <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-mut)", fontSize: 13 }}>
                    No trend data available.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <defs>
                        <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor={metric === "sales" ? "#ffffff" : "#8b5cf6"} stopOpacity={0.3} />
                          <stop offset="95%" stopColor={metric === "sales" ? "#ffffff" : "#8b5cf6"} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255, 255, 255, 0.05)" />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: "var(--fg-sub)", fontSize: 10 }} minTickGap={20} />
                      <YAxis
                        tickLine={false}
                        axisLine={false}
                        tick={{ fill: "var(--fg-sub)", fontSize: 10 }}
                        tickFormatter={(v) => (metric === "sales" ? `Rs.${formatCompact(v)}` : `${v}`)}
                      />
                      <Tooltip
                        content={<CustomAreaTooltip metric={metric} cur={cur} />}
                      />
                      <Area
                        type="monotone"
                        dataKey={metric === "sales" ? "sales" : "orders"}
                        stroke={metric === "sales" ? "#ffffff" : "#8b5cf6"}
                        strokeWidth={2}
                        fillOpacity={1}
                        fill="url(#chartGradient)"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* Order status breakdown */}
            <div className="card mb">
              <span className="bold" style={{ fontSize: "14px", display: "block", marginBottom: "8px" }}>Order Status Breakdown</span>
              {statusTotal === 0 ? (
                <div style={{ height: 160, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--fg-mut)", fontSize: 13 }}>
                  No order statuses recorded in this period.
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
                  <div style={{ width: 130, height: 130, margin: "0 auto" }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusEntries.map(([name, value]: any) => ({ name, value }))}
                          dataKey="value"
                          nameKey="name"
                          innerRadius={30}
                          outerRadius={50}
                          paddingAngle={2}
                        >
                          {statusEntries.map(([name]: any, i) => (
                            <Cell key={i} fill={STATUS_HEX[name.toLowerCase()] || "#52525b"} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div style={{ flex: "1 1 200px" }}>
                    <div className="pie-legend">
                      {statusEntries.map(([name, value]: any) => {
                        const pct = Math.round((value / statusTotal) * 100)
                        return (
                          <div key={name} className="pie-legend-item">
                            <span className="pie-legend-label">
                              <span className="pie-legend-dot" style={{ background: STATUS_HEX[name.toLowerCase()] || "#52525b" }} />
                              <span>{name.replace(/_/g, " ")}</span>
                            </span>
                            <span className="pie-legend-val">
                              {value}
                              <span className="pie-legend-pct">({pct}%)</span>
                            </span>
                          </div>
                        )
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Recent orders */}
            <div className="card mb">
              <div className="spread mb">
                <span className="bold" style={{ fontSize: "14px" }}>Recent Orders</span>
                <button className="link" onClick={() => navigate("/orders")}>View all</button>
              </div>
              {(data?.recentOrders || []).length === 0 ? (
                <div className="muted small">No orders yet.</div>
              ) : (
                (data.recentOrders || []).slice(0, 6).map((o: any) => (
                  <div className="rowline tap" key={o.id} onClick={() => navigate(`/orders/${o.id}`)}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="bold" style={{ fontSize: 13 }}>
                        #{o.display_id}{" "}
                        <span className="muted" style={{ fontWeight: 400, fontSize: 12 }}>
                          · {o.customer_name}
                        </span>
                      </div>
                      <div className="rowline-city">
                        {o.city ? `${o.city} · ` : ""}
                        {timeAgo(o.created_at)}
                      </div>
                    </div>
                    <div className="badge-group" style={{ marginRight: 6 }}>
                      <span className={`badge ${statusClass(o.status)}`}>{o.status}</span>
                      {o.payment_status && (
                        <span className={`badge ${statusClass(o.payment_status)}`}>
                          {o.payment_status}
                        </span>
                      )}
                    </div>
                    <span className="bold" style={{ marginLeft: 6, color: "var(--accent)", fontSize: "13px" }}>
                      {formatMoney(o.total, o.currency_code || cur)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Top products */}
            <div className="card mb">
              <div className="bold mb" style={{ fontSize: "14px" }}>Top Selling Products</div>
              {(data?.topProducts || []).length === 0 ? (
                <div className="muted small">No product sales data.</div>
              ) : (
                (data.topProducts || []).slice(0, 5).map((p: any, i: number) => (
                  <div className="rowline" key={i}>
                    <div className="thumb-container">
                      {p.thumbnail ? (
                        <img className="thumb sm" src={p.thumbnail} alt="" />
                      ) : (
                        <div className="thumb sm" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CubeIcon />
                        </div>
                      )}
                      <span className="thumb-rank">{i + 1}</span>
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px" }}>{p.title}</div>
                      <div className="small">{p.quantity} sold</div>
                    </div>
                    <span className="bold" style={{ fontSize: "13px" }}>{formatMoney(p.sales, cur)}</span>
                  </div>
                ))
              )}
            </div>

            {/* Low stock alerts */}
            {(data?.lowStock || []).length > 0 && (
              <div className="card mb">
                <div className="spread mb" style={{ alignItems: "center", gap: "8px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    <WarningIcon />
                    <span className="bold" style={{ fontSize: "14px" }}>Low Stock Alerts</span>
                  </div>
                </div>
                {data.lowStock.slice(0, 6).map((p: any, i: number) => (
                  <div className="rowline" key={i}>
                    <div className="thumb-container">
                      {p.thumbnail ? (
                        <img className="thumb sm" src={p.thumbnail} alt="" />
                      ) : (
                        <div className="thumb sm" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                          <CubeIcon />
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: "13px" }}>{p.title}</div>
                      {p.sku && <div className="small">SKU: {p.sku}</div>}
                    </div>
                    <span className={`badge ${p.quantity <= 0 ? "red" : "orange"}`}>
                      {p.quantity <= 0 ? "Out" : `${p.quantity} left`}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
