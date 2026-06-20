import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Button, Table, Badge, Text } from "@medusajs/ui"
import {
  ChartPie,
  ShoppingCart,
  Users,
  Cash,
  ArrowPath,
  CubeSolid,
} from "@medusajs/icons"
import { useEffect, useState, type ReactNode } from "react"
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
import { A, adminSection } from "../../lib/admin-theme"

type Stats = {
  totalSales: number
  salesGrowth: number
  totalOrders: number
  ordersGrowth: number
  averageOrderValue: number
  aovGrowth: number
  customerCount: number
  newCustomers: number
  newCustomersGrowth: number
  productCount: number
  completedOrders: number
  pendingOrders: number
  canceledOrders: number
}

type ChartItem = { date: string; sales: number; orders: number; rawDate: string }

type RecentOrder = {
  id: string
  display_id: number
  created_at: string
  status: string
  total: number
  currency_code: string
  customer_name: string
  city: string
  items_count: number
}

type TopProduct = { title: string; quantity: number; sales: number; thumbnail: string }
type LowStockItem = { title: string; sku: string; quantity: number; thumbnail: string }

type DashboardData = {
  period: string
  currency: string
  stats: Stats
  statusBreakdown: Record<string, number>
  chartData: ChartItem[]
  recentOrders: RecentOrder[]
  topProducts: TopProduct[]
  lowStock: LowStockItem[]
  generatedAt: string
}

type Period = "7d" | "30d" | "90d" | "12m"

const PERIOD_LABELS: Record<Period, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  "12m": "Last 12 months",
}

const STATUS_HEX: Record<string, string> = {
  completed: "#22c55e",
  fulfilled: "#22c55e",
  paid: "#22c55e",
  pending: "#eab308",
  processing: "#eab308",
  requires_action: "#f97316",
  canceled: "#ef4444",
  failed: "#ef4444",
  draft: "#6b7280",
}

const formatCurrency = (amount: number, currency = "PKR") => {
  // Medusa v2 stores money in major units (no /100) — matches the storefront.
  const val = Number(amount) || 0
  try {
    return new Intl.NumberFormat("en-PK", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(val)
  } catch {
    return `${currency.toUpperCase()} ${Math.round(val).toLocaleString()}`
  }
}

const formatCompact = (n: number) =>
  Math.abs(n) >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`

/* ── Growth badge: ▲ green when positive, ▼ red when negative ── */
function GrowthBadge({ value, invert = false }: { value: number; invert?: boolean }) {
  if (value === 0) {
    return <span style={{ fontSize: 11, color: A.fgMuted }}>—</span>
  }
  const positive = invert ? value < 0 : value > 0
  const color = positive ? A.success : A.danger
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 3,
        fontSize: 11,
        fontWeight: 600,
        color,
        background: positive ? "rgba(34,197,94,0.12)" : "rgba(239,68,68,0.12)",
        padding: "2px 6px",
        borderRadius: 6,
      }}
    >
      <span style={{ fontSize: 9, lineHeight: 1 }}>{value > 0 ? "▲" : "▼"}</span>
      {Math.abs(value)}%
    </span>
  )
}

function StatCard({
  label,
  value,
  growth,
  sub,
  icon,
  iconBg,
  iconColor,
}: {
  label: string
  value: string | number
  growth?: number
  sub?: string
  icon: ReactNode
  iconBg: string
  iconColor: string
}) {
  return (
    <div style={{ ...adminSection, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <Text className="text-xs font-semibold text-ui-fg-subtle uppercase tracking-wider">
          {label}
        </Text>
        <div style={{ padding: 6, borderRadius: 6, background: iconBg, color: iconColor }}>
          {icon}
        </div>
      </div>
      <Heading level="h2" className="text-2xl font-bold mt-1">
        {value}
      </Heading>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        {growth !== undefined && <GrowthBadge value={growth} />}
        {sub && <Text className="text-xs text-ui-fg-muted">{sub}</Text>}
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [period, setPeriod] = useState<Period>("30d")
  const [chartView, setChartView] = useState<"sales" | "orders">("sales")
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const loadData = async (p: Period = period) => {
    setRefreshing(true)
    try {
      const res = await fetch(`/admin/dashboard-stats?period=${p}`, {
        credentials: "include",
      })
      if (res.ok) {
        setData(await res.json())
        setErrorMsg(null)
      } else {
        const text = await res.text()
        console.error("Failed to load dashboard stats", res.status, text)
        // Surface the reason in the UI instead of silently showing zeros.
        setErrorMsg(`Failed to load dashboard data (HTTP ${res.status}). ${text.slice(0, 300)}`)
      }
    } catch (e: any) {
      console.error("Error fetching stats:", e)
      setErrorMsg(`Could not reach the dashboard API: ${e?.message || e}`)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    loadData(period)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  if (loading && !data) {
    return (
      <Container className="p-8">
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 400 }}>
          <Text className="text-ui-fg-subtle">Loading your store dashboard…</Text>
        </div>
      </Container>
    )
  }

  const stats = data?.stats
  const currency = data?.currency || "PKR"

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "fulfilled":
      case "paid":
        return "green"
      case "pending":
      case "processing":
        return "orange"
      case "canceled":
      case "failed":
        return "red"
      default:
        return "grey"
    }
  }

  const statusEntries = Object.entries(data?.statusBreakdown || {}).sort(
    (a, b) => b[1] - a[1]
  )
  const statusTotal = statusEntries.reduce((s, [, n]) => s + n, 0)

  return (
    <Container className="p-8" style={{ background: A.bgSubtle, color: A.fg }}>
      {/* ── Header + period selector ── */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <Heading level="h1" className="text-2xl font-bold flex items-center gap-2">
            <ChartPie /> Dashboard
          </Heading>
          <Text className="text-ui-fg-subtle text-sm mt-1">
            {PERIOD_LABELS[period]} · compared to the previous period
          </Text>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 4, background: A.bgField, padding: 4, borderRadius: 8, border: A.border }}>
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <Button
                key={p}
                variant={period === p ? "primary" : "transparent"}
                size="small"
                onClick={() => setPeriod(p)}
              >
                {p}
              </Button>
            ))}
          </div>
          <Button variant="secondary" onClick={() => loadData(period)} disabled={refreshing} className="flex items-center gap-2">
            <ArrowPath /> {refreshing ? "Refreshing…" : "Refresh"}
          </Button>
        </div>
      </div>

      {/* ── Error banner (so a failing API isn't mistaken for "no data") ── */}
      {errorMsg && (
        <div
          style={{
            marginBottom: 24,
            padding: "12px 16px",
            borderRadius: 8,
            border: "1px solid rgba(239,68,68,0.4)",
            background: "rgba(239,68,68,0.08)",
            color: A.danger,
            fontSize: 13,
          }}
        >
          <strong>Dashboard data couldn't load.</strong> {errorMsg}
        </div>
      )}

      {/* ── Stat cards ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 20, marginBottom: 24 }}>
        <StatCard
          label="Revenue"
          value={stats ? formatCurrency(stats.totalSales, currency) : "—"}
          growth={stats?.salesGrowth}
          sub="vs prev. period"
          icon={<Cash />}
          iconBg="rgba(34, 197, 94, 0.1)"
          iconColor={A.success}
        />
        <StatCard
          label="Orders"
          value={stats ? stats.totalOrders : 0}
          growth={stats?.ordersGrowth}
          sub={stats ? `${stats.completedOrders} done · ${stats.pendingOrders} pending` : ""}
          icon={<ShoppingCart />}
          iconBg="rgba(234, 179, 8, 0.1)"
          iconColor={A.warning}
        />
        <StatCard
          label="Avg Order Value"
          value={stats ? formatCurrency(stats.averageOrderValue, currency) : "—"}
          growth={stats?.aovGrowth}
          sub="per order"
          icon={<Cash />}
          iconBg="rgba(143, 119, 243, 0.1)"
          iconColor="#8F77F3"
        />
        <StatCard
          label="New Customers"
          value={stats ? stats.newCustomers : 0}
          growth={stats?.newCustomersGrowth}
          sub={stats ? `${stats.customerCount} total` : ""}
          icon={<Users />}
          iconBg="rgba(59, 130, 246, 0.1)"
          iconColor={A.info}
        />
      </div>

      {/* ── Chart + status donut ── */}
      <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(0, 1fr)", gap: 24, marginBottom: 24 }}>
        {/* Trend chart */}
        <div style={{ ...adminSection, padding: 24, margin: 0, minWidth: 0 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
            <div>
              <Heading level="h2" className="text-base font-semibold">Performance Trend</Heading>
              <Text className="text-xs text-ui-fg-subtle mt-0.5">Revenue and orders over {PERIOD_LABELS[period].toLowerCase()}</Text>
            </div>
            <div style={{ display: "flex", gap: 8, background: A.bgField, padding: 4, borderRadius: 8, border: A.border }}>
              <Button variant={chartView === "sales" ? "primary" : "transparent"} size="small" onClick={() => setChartView("sales")}>Sales</Button>
              <Button variant={chartView === "orders" ? "primary" : "transparent"} size="small" onClick={() => setChartView("orders")}>Orders</Button>
            </div>
          </div>

          {!data || data.chartData.length === 0 ? (
            <div style={{ height: 300, display: "flex", alignItems: "center", justifyContent: "center", color: A.fgMuted }}>
              No trend data available.
            </div>
          ) : (
            <div style={{ width: "100%", height: 300 }}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={data.chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={chartView === "sales" ? "#FF7433" : "#8F77F3"} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={chartView === "sales" ? "#FF7433" : "#8F77F3"} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={A.borderVal} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fill: A.fgSubtle, fontSize: 10 }} minTickGap={20} />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: A.fgSubtle, fontSize: 10 }}
                    tickFormatter={(v) => (chartView === "sales" ? `Rs.${formatCompact(v)}` : `${v}`)}
                  />
                  <Tooltip
                    contentStyle={{ background: A.bgCard, borderColor: A.borderVal, borderRadius: 8, color: A.fg, fontSize: 12 }}
                    formatter={(value: any) => [
                      chartView === "sales" ? formatCurrency(value, currency) : `${value} orders`,
                      chartView === "sales" ? "Revenue" : "Orders",
                    ]}
                    labelStyle={{ fontWeight: "bold", color: A.fg }}
                  />
                  <Area
                    type="monotone"
                    dataKey={chartView === "sales" ? "sales" : "orders"}
                    stroke={chartView === "sales" ? "#FF7433" : "#8F77F3"}
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#chartGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Order status breakdown */}
        <div style={{ ...adminSection, padding: 24, margin: 0, minWidth: 0 }}>
          <Heading level="h2" className="text-base font-semibold">Order Status</Heading>
          <Text className="text-xs text-ui-fg-subtle mt-0.5 mb-3">Distribution in this period</Text>

          {statusTotal === 0 ? (
            <div style={{ height: 200, display: "flex", alignItems: "center", justifyContent: "center", color: A.fgMuted }}>
              No orders in this period.
            </div>
          ) : (
            <>
              <div style={{ width: "100%", height: 180 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusEntries.map(([name, value]) => ({ name, value }))}
                      dataKey="value"
                      nameKey="name"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={2}
                    >
                      {statusEntries.map(([name], i) => (
                        <Cell key={i} fill={STATUS_HEX[name.toLowerCase()] || "#6b7280"} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ background: A.bgCard, borderColor: A.borderVal, borderRadius: 8, color: A.fg, fontSize: 12 }}
                      formatter={(v: any, n: any) => [`${v} orders`, String(n).toUpperCase()]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginTop: 12 }}>
                {statusEntries.map(([name, value]) => (
                  <div key={name} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", fontSize: 12 }}>
                    <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ width: 10, height: 10, borderRadius: 3, background: STATUS_HEX[name.toLowerCase()] || "#6b7280" }} />
                      <span style={{ textTransform: "capitalize", color: A.fgSubtle }}>{name.replace(/_/g, " ")}</span>
                    </span>
                    <span style={{ fontWeight: 600 }}>
                      {value} <span style={{ color: A.fgMuted, fontWeight: 400 }}>({Math.round((value / statusTotal) * 100)}%)</span>
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Recent orders + Top products ── */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(400px, 1fr))", gap: 24, marginBottom: 24 }}>
        {/* Recent orders */}
        <div style={{ ...adminSection, margin: 0, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <Heading level="h2" className="text-base font-semibold">Recent Orders</Heading>
            <Text className="text-xs text-ui-fg-subtle">Latest checkouts on your storefront</Text>
          </div>
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Order</Table.HeaderCell>
                <Table.HeaderCell>Customer</Table.HeaderCell>
                <Table.HeaderCell>Items</Table.HeaderCell>
                <Table.HeaderCell>Total</Table.HeaderCell>
                <Table.HeaderCell>Status</Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {!data || data.recentOrders.length === 0 ? (
                <Table.Row>
                  <Table.Cell colSpan={5} className="text-center py-6 text-ui-fg-muted text-xs">
                    No orders recorded yet.
                  </Table.Cell>
                </Table.Row>
              ) : (
                data.recentOrders.map((order) => (
                  <Table.Row key={order.id} style={{ cursor: "pointer" }} onClick={() => (window.location.href = `/app/orders/${order.id}`)}>
                    <Table.Cell className="font-semibold text-xs">#{order.display_id}</Table.Cell>
                    <Table.Cell className="text-xs">
                      <div className="flex flex-col">
                        <span className="font-medium">{order.customer_name}</span>
                        {order.city && <span className="text-[10px] text-ui-fg-muted">{order.city}</span>}
                      </div>
                    </Table.Cell>
                    <Table.Cell className="text-xs">{order.items_count} {order.items_count === 1 ? "item" : "items"}</Table.Cell>
                    <Table.Cell className="text-xs font-medium">{formatCurrency(order.total, order.currency_code)}</Table.Cell>
                    <Table.Cell>
                      <Badge color={getStatusColor(order.status)}>{order.status.toUpperCase()}</Badge>
                    </Table.Cell>
                  </Table.Row>
                ))
              )}
            </Table.Body>
          </Table>
        </div>

        {/* Top products */}
        <div style={{ ...adminSection, margin: 0, padding: 20 }}>
          <div style={{ marginBottom: 16 }}>
            <Heading level="h2" className="text-base font-semibold">Top Selling Products</Heading>
            <Text className="text-xs text-ui-fg-subtle">By quantity sold in this period</Text>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {!data || data.topProducts.length === 0 ? (
              <div style={{ textAlign: "center", padding: 40, color: A.fgMuted, fontSize: 13 }}>
                No product sales data.
              </div>
            ) : (
              data.topProducts.map((prod, idx) => (
                <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, border: A.border, background: A.bgField }}>
                  <div style={{ position: "relative", width: 44, height: 44, borderRadius: 6, background: A.bgSubtle, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: A.border, flexShrink: 0 }}>
                    {prod.thumbnail ? (
                      <img src={prod.thumbnail} alt={prod.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                    ) : (
                      <CubeSolid style={{ color: A.fgMuted }} />
                    )}
                    <span style={{ position: "absolute", top: -6, left: -6, width: 18, height: 18, borderRadius: "50%", background: A.interactive, color: "#fff", fontSize: 10, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>
                      {idx + 1}
                    </span>
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{prod.title}</div>
                    <div style={{ fontSize: 11, color: A.fgSubtle, marginTop: 2 }}>{prod.quantity} sold</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <span style={{ fontSize: 13, fontWeight: 700, color: A.interactive }}>{formatCurrency(prod.sales, currency)}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* ── Low stock alerts ── */}
      <div style={{ ...adminSection, margin: 0, padding: 20 }}>
        <div style={{ marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
          <div
            style={{
              width: 22,
              height: 22,
              borderRadius: "50%",
              background: "rgba(234,179,8,0.15)",
              color: A.warning,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 700,
              fontSize: 13,
              flexShrink: 0,
            }}
          >
            !
          </div>
          <div>
            <Heading level="h2" className="text-base font-semibold">Low Stock Alerts</Heading>
            <Text className="text-xs text-ui-fg-subtle">Variants at or below 5 units available — restock soon</Text>
          </div>
        </div>
        {!data || data.lowStock.length === 0 ? (
          <div style={{ textAlign: "center", padding: 28, color: A.fgMuted, fontSize: 13 }}>
            All tracked products are well stocked. 🎉
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(260px, 1fr))", gap: 12 }}>
            {data.lowStock.map((item, idx) => (
              <div key={idx} style={{ display: "flex", alignItems: "center", gap: 12, padding: "8px 12px", borderRadius: 8, border: A.border, background: A.bgField }}>
                <div style={{ width: 40, height: 40, borderRadius: 6, background: A.bgSubtle, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", border: A.border, flexShrink: 0 }}>
                  {item.thumbnail ? (
                    <img src={item.thumbnail} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                  ) : (
                    <CubeSolid style={{ color: A.fgMuted }} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.title}</div>
                  {item.sku && <div style={{ fontSize: 10, color: A.fgMuted, marginTop: 2 }}>SKU: {item.sku}</div>}
                </div>
                <Badge color={item.quantity <= 0 ? "red" : "orange"}>
                  {item.quantity <= 0 ? "Out" : `${item.quantity} left`}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </div>

      {data?.generatedAt && (
        <Text className="text-[10px] text-ui-fg-muted" style={{ marginTop: 16, display: "block", textAlign: "right" }}>
          Updated {new Date(data.generatedAt).toLocaleString()}
        </Text>
      )}
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Dashboard",
  icon: ChartPie,
})
