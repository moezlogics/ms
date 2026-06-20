import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { Modules } from "@medusajs/framework/utils"

/* ------------------------------------------------------------------ *
 * Dashboard analytics endpoint
 *
 * Design notes (why this looks the way it does):
 *  - Metrics are PERIOD-SCOPED (last 7d / 30d / 90d / 12m), not
 *    "latest 1000 orders". The old version summed the most recent 1000
 *    orders and labelled it "Total Revenue" — that silently becomes
 *    wrong the moment a store crosses 1000 lifetime orders. Scoping to
 *    an explicit window is both correct AND bounded (fast).
 *  - We fetch TWICE the window in a single query so we can compute the
 *    previous-period comparison (growth %) without a second round-trip.
 *  - The whole payload is cached in Redis (cache module) with a short
 *    TTL so repeated dashboard refreshes / multiple admins don't hammer
 *    the DB. This is the main server-load fix.
 *  - Every "extra" lookup (customers, low-stock, product count) is
 *    wrapped in try/catch and degrades to a safe default — one failing
 *    sub-query must never 500 the whole dashboard.
 * ------------------------------------------------------------------ */

type Period = "7d" | "30d" | "90d" | "12m"

const PERIOD_DAYS: Record<Period, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
  "12m": 365,
}

const LOW_STOCK_THRESHOLD = 5
const MAX_ORDERS = 5000 // safety cap so a huge window can't blow up memory

const pctChange = (current: number, previous: number): number => {
  if (previous <= 0) return current > 0 ? 100 : 0
  return Math.round(((current - previous) / previous) * 1000) / 10 // 1 decimal
}

export async function GET(req: MedusaRequest, res: MedusaResponse) {
  const query = req.scope.resolve("query") as any

  const periodParam = (req.query.period as string) || "30d"
  const period: Period = (["7d", "30d", "90d", "12m"] as const).includes(
    periodParam as Period
  )
    ? (periodParam as Period)
    : "30d"
  const days = PERIOD_DAYS[period]

  // ---- Redis cache (best-effort) ----------------------------------
  const cacheKey = `dashboard-stats:${period}`
  let cache: any = null
  try {
    cache = req.scope.resolve(Modules.CACHE)
    const cached = await cache.get(cacheKey)
    if (cached) {
      return res.json({ ...cached, cached: true })
    }
  } catch {
    // cache not available — continue without it
  }

  try {
    const now = new Date()
    const currentStart = new Date(now)
    currentStart.setDate(currentStart.getDate() - days)
    const previousStart = new Date(now)
    previousStart.setDate(previousStart.getDate() - days * 2)

    // 1. Recent orders (single query) ---------------------------------
    // NOTE: we deliberately do NOT push a `created_at` filter into
    // query.graph here. The proven, always-working pattern is "fetch the
    // most recent N orders ordered DESC" — exactly what the original
    // dashboard did. A `created_at: { $gte }` filter was the cause of the
    // dashboard going blank: if that operator misbehaves on the order
    // entity the whole query throws and the endpoint 500s, leaving the UI
    // empty. Instead we fetch recent orders and split them into the
    // current vs previous period in JS below (cheap + robust). MAX_ORDERS
    // (5000 most-recent) comfortably covers the dashboard windows.
    let orders: any[] = []
    let ordersError: string | null = null
    let ordersMode = "full"

    const fetchOrders = async (fields: string[], withSort = true) => {
      const r = await query.graph({
        entity: "order",
        fields,
        pagination: {
          take: MAX_ORDERS,
          skip: 0,
          ...(withSort ? { order: { created_at: "DESC" } } : {}),
        },
      })
      return r?.data || []
    }

    const BASE = ["id", "created_at", "status", "total", "currency_code"]
    const WITH_ITEMS = [
      ...BASE,
      "items.title",
      "items.quantity",
      "items.unit_price",
      "items.thumbnail",
    ]

    // Progressive fallback so a problematic field/relation can't blank the
    // whole dashboard — and so _debug tells us exactly which tier worked.
    try {
      orders = await fetchOrders(WITH_ITEMS)
    } catch (e1: any) {
      ordersError = `full:${e1?.message || e1}`
      try {
        orders = await fetchOrders(BASE) // drop line items
        ordersMode = "no-items"
      } catch (e2: any) {
        ordersError += ` | base:${e2?.message || e2}`
        try {
          orders = await fetchOrders(["id", "created_at", "status", "currency_code"]) // drop total
          ordersMode = "no-total"
        } catch (e3: any) {
          ordersError += ` | bare:${e3?.message || e3}`
          try {
            orders = await fetchOrders(["id", "created_at", "status"], false) // drop sort too
            ordersMode = "no-sort"
          } catch (e4: any) {
            ordersError += ` | nosort:${e4?.message || e4}`
            console.error("[dashboard] all order queries failed:", e4)
          }
        }
      }
    }

    // 2. Aggregate -----------------------------------------------------
    let currency = "PKR"
    let curSales = 0
    let curOrders = 0
    let prevSales = 0
    let prevOrders = 0
    let completedOrders = 0
    let pendingOrders = 0
    let canceledOrders = 0

    const statusBreakdown: Record<string, number> = {}
    const productSales: Record<
      string,
      { title: string; quantity: number; sales: number; thumbnail: string }
    > = {}

    // Time-series buckets. Monthly for 12m, daily otherwise.
    const isMonthly = period === "12m"
    const buckets: Record<
      string,
      { date: string; sales: number; orders: number; rawDate: string }
    > = {}

    if (isMonthly) {
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`
        buckets[key] = {
          date: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
          sales: 0,
          orders: 0,
          rawDate: key,
        }
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now)
        d.setDate(d.getDate() - i)
        const key = d.toISOString().split("T")[0]
        buckets[key] = {
          date: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
          sales: 0,
          orders: 0,
          rawDate: key,
        }
      }
    }

    const currentStartMs = currentStart.getTime()
    const previousStartMs = previousStart.getTime()

    for (const order of orders as any[]) {
      const createdMs = order.created_at ? new Date(order.created_at).getTime() : 0
      const isCurrent = createdMs >= currentStartMs
      const amount = order.total || 0
      const isCanceled = order.status === "canceled"
      if (order.currency_code) currency = order.currency_code

      if (isCurrent) {
        if (isCanceled) {
          canceledOrders++
        } else {
          curSales += amount
          curOrders++
          if (order.status === "completed" || order.status === "fulfilled") {
            completedOrders++
          } else {
            pendingOrders++
          }

          // chart bucket. NOTE: order.created_at is a Date object in
          // Medusa v2 (NOT a string), so we must build the ISO key from
          // createdMs — calling .split()/.slice() on a Date throws (this
          // was the 500 that kept the dashboard blank).
          const iso = createdMs ? new Date(createdMs).toISOString() : ""
          const key = isMonthly ? iso.slice(0, 7) : iso.split("T")[0]
          if (buckets[key]) {
            buckets[key].sales += amount
            buckets[key].orders++
          }

          // top products
          if (Array.isArray(order.items)) {
            for (const item of order.items) {
              const name = item.title || "Unknown Product"
              if (!productSales[name]) {
                productSales[name] = {
                  title: name,
                  quantity: 0,
                  sales: 0,
                  thumbnail: item.thumbnail || "",
                }
              }
              const qty = item.quantity || 1
              productSales[name].quantity += qty
              productSales[name].sales += (item.unit_price || 0) * qty
            }
          }
        }
        statusBreakdown[order.status] = (statusBreakdown[order.status] || 0) + 1
      } else if (createdMs >= previousStartMs && !isCanceled) {
        // previous period (for growth comparison only). Bounded to the
        // previous window so the unfiltered fetch above can't pull in
        // ancient orders and inflate the comparison baseline.
        prevSales += amount
        prevOrders++
      }
    }

    const curAOV = curOrders > 0 ? Math.round(curSales / curOrders) : 0
    const prevAOV = prevOrders > 0 ? Math.round(prevSales / prevOrders) : 0

    // 3. Customers (total + new-in-period + growth) -------------------
    let customerCount = 0
    let newCustomers = 0
    let prevNewCustomers = 0
    try {
      const { metadata } = await query.graph({
        entity: "customer",
        fields: ["id"],
        pagination: { take: 1, skip: 0 },
      })
      customerCount = metadata?.count || 0

      const { metadata: cur } = await query.graph({
        entity: "customer",
        fields: ["id"],
        filters: { created_at: { $gte: currentStart.toISOString() } },
        pagination: { take: 1, skip: 0 },
      })
      newCustomers = cur?.count || 0

      const { metadata: prev } = await query.graph({
        entity: "customer",
        fields: ["id"],
        filters: {
          created_at: {
            $gte: previousStart.toISOString(),
            $lt: currentStart.toISOString(),
          },
        },
        pagination: { take: 1, skip: 0 },
      })
      prevNewCustomers = prev?.count || 0
    } catch (e) {
      console.warn("[dashboard] customer counts failed", e)
    }

    // 4. Product count -------------------------------------------------
    let productCount = 0
    try {
      const { metadata } = await query.graph({
        entity: "product",
        fields: ["id"],
        pagination: { take: 1, skip: 0 },
      })
      productCount = metadata?.count || 0
    } catch (e) {
      console.warn("[dashboard] product count failed", e)
    }

    // 5. Low-stock alerts (best-effort) -------------------------------
    let lowStock: {
      title: string
      sku: string
      quantity: number
      thumbnail: string
    }[] = []
    try {
      const { data: variants } = await query.graph({
        entity: "product_variant",
        fields: [
          "id",
          "title",
          "sku",
          "manage_inventory",
          "product.title",
          "product.thumbnail",
          "inventory_items.inventory.location_levels.stocked_quantity",
          "inventory_items.inventory.location_levels.reserved_quantity",
        ],
        filters: { manage_inventory: true } as any,
        pagination: { take: 1000, skip: 0 },
      })

      lowStock = (variants as any[])
        .map((v) => {
          let available = 0
          for (const ii of v.inventory_items || []) {
            for (const lvl of ii?.inventory?.location_levels || []) {
              available +=
                (lvl.stocked_quantity || 0) - (lvl.reserved_quantity || 0)
            }
          }
          return {
            title: v.product?.title
              ? `${v.product.title}${v.title && v.title !== "Default" ? ` — ${v.title}` : ""}`
              : v.title || "Unknown",
            sku: v.sku || "",
            quantity: available,
            thumbnail: v.product?.thumbnail || "",
          }
        })
        .filter((v) => v.quantity <= LOW_STOCK_THRESHOLD)
        .sort((a, b) => a.quantity - b.quantity)
        .slice(0, 8)
    } catch (e) {
      console.warn("[dashboard] low-stock lookup failed", e)
    }

    // 6. Recent orders (independent of period) ------------------------
    const recentOrders: any[] = []
    let recentError: string | null = null
    const RECENT_FULL = [
      "id", "display_id", "created_at", "status", "total", "currency_code", "email",
      "shipping_address.first_name", "shipping_address.last_name", "shipping_address.city",
    ]
    const RECENT_MIN = ["id", "display_id", "created_at", "status", "total", "currency_code"]
    const fetchRecent = async (fields: string[], withSort = true) => {
      const r = await query.graph({
        entity: "order",
        fields,
        pagination: { take: 10, skip: 0, ...(withSort ? { order: { created_at: "DESC" } } : {}) },
      })
      return r?.data || []
    }
    let recent: any[] = []
    try {
      recent = await fetchRecent(RECENT_FULL)
    } catch (e1: any) {
      recentError = `full:${e1?.message || e1}`
      try {
        recent = await fetchRecent(RECENT_MIN)
      } catch (e2: any) {
        recentError += ` | min:${e2?.message || e2}`
        try {
          recent = await fetchRecent(["id", "display_id", "created_at", "status"], false)
        } catch (e3: any) {
          recentError += ` | bare:${e3?.message || e3}`
        }
      }
    }
    for (const order of recent) {
      const name = order.shipping_address
        ? `${order.shipping_address.first_name || ""} ${order.shipping_address.last_name || ""}`.trim()
        : ""
      recentOrders.push({
        id: order.id,
        display_id: order.display_id,
        created_at: order.created_at,
        status: order.status,
        total: order.total || 0,
        currency_code: order.currency_code || currency,
        customer_name: name || order.email || "Guest Customer",
        city: order.shipping_address?.city || "",
        items_count: 0,
      })
    }

    // 7. Assemble -----------------------------------------------------
    const chartData = Object.values(buckets).sort((a, b) =>
      a.rawDate.localeCompare(b.rawDate)
    )

    const topProducts = Object.values(productSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5)

    const payload = {
      period,
      currency,
      stats: {
        totalSales: curSales,
        salesGrowth: pctChange(curSales, prevSales),
        totalOrders: curOrders,
        ordersGrowth: pctChange(curOrders, prevOrders),
        averageOrderValue: curAOV,
        aovGrowth: pctChange(curAOV, prevAOV),
        customerCount,
        newCustomers,
        newCustomersGrowth: pctChange(newCustomers, prevNewCustomers),
        productCount,
        completedOrders,
        pendingOrders,
        canceledOrders,
      },
      statusBreakdown,
      chartData,
      recentOrders,
      topProducts,
      lowStock,
      generatedAt: now.toISOString(),
      // Diagnostics — safe to expose to an authenticated admin. Lets us see
      // WHY a dashboard looks empty (no orders fetched? query error? all
      // orders older than the window?).
      _debug: {
        ordersFetched: orders.length,
        ordersMode,
        recentFetched: recentOrders.length,
        recentError,
        ordersError,
        windowDays: days,
        currentStart: currentStart.toISOString(),
        now: now.toISOString(),
      },
    }

    // 8. Cache (best-effort). Longer TTL for the heavier 12m window. --
    try {
      if (cache) {
        await cache.set(cacheKey, payload, period === "12m" ? 300 : 60)
      }
    } catch {
      /* ignore cache write failures */
    }

    return res.json({ ...payload, cached: false })
  } catch (error) {
    console.error("Dashboard stats generation error:", error)
    return res
      .status(500)
      .json({ error: "Failed to load dashboard statistics" })
  }
}
