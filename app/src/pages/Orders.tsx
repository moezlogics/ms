import { useCallback, useEffect, useRef, useState } from "react"
import { useNavigate } from "react-router-dom"
import { clearToken, listOrders, OrderListItem, sendTestPush } from "../api"
import { enablePush, getPushStatus, PushStatus } from "../push"
import { useLiveRefresh } from "../useLiveRefresh"
import { formatMoney, statusClass, timeAgo } from "../util"
import TopBar from "../components/TopBar"

const PAGE = 20
const FILTERS = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "completed", label: "Completed" },
  { key: "canceled", label: "Canceled" },
]

export default function Orders() {
  const navigate = useNavigate()
  const [orders, setOrders] = useState<OrderListItem[]>([])
  const [count, setCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const [filter, setFilter] = useState("all")
  const [search, setSearch] = useState("")
  const [pushStatus, setPushStatus] = useState<PushStatus>("off")
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null)
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const lastTopId = useRef<number | null>(null)
  const firstLoad = useRef(true)

  const flash = (msg: string, err = false) => {
    setToast({ msg, err })
    setTimeout(() => setToast(null), 3200)
  }

  const refreshPushStatus = useCallback(() => {
    getPushStatus().then(setPushStatus).catch(() => setPushStatus("off"))
  }, [])

  useEffect(() => {
    const handlePrompt = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener("beforeinstallprompt", handlePrompt)
    return () => window.removeEventListener("beforeinstallprompt", handlePrompt)
  }, [])

  const triggerInstall = async () => {
    if (!deferredPrompt) return
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === "accepted") {
      setDeferredPrompt(null)
    }
  }

  const load = useCallback(async () => {
    setRefreshing(true)
    try {
      const data = await listOrders(0, PAGE)
      const list = data.orders || []
      // New-order detection (skip the very first load).
      const topId = list[0]?.display_id ?? null
      if (!firstLoad.current && topId && lastTopId.current && topId > lastTopId.current) {
        flash(`🛒 New order #${topId}`)
        try { navigator.vibrate?.(150) } catch {}
      }
      if (topId) lastTopId.current = topId
      firstLoad.current = false
      setOrders(list)
      setCount(data.count || 0)
    } catch (e: any) {
      if (e?.status === 401) return navigate("/login", { replace: true })
      flash(e?.message || "Failed to load orders", true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [navigate])

  useEffect(() => {
    load()
    refreshPushStatus()
  }, [load, refreshPushStatus])

  // Live: poll every 2.5s + instant on push message + on foreground.
  useLiveRefresh(load, 2500)

  async function loadMore() {
    setLoadingMore(true)
    try {
      const data = await listOrders(orders.length, PAGE)
      setOrders((prev) => [...prev, ...(data.orders || [])])
    } catch (e: any) {
      flash(e?.message || "Failed to load more", true)
    } finally {
      setLoadingMore(false)
    }
  }

  async function onBell() {
    // 1) ALWAYS (re)register THIS device with the backend first — even if
    //    it already shows "on". A device that has notification permission
    //    but was never saved on the server gets no pushes; re-registering
    //    here guarantees every phone/desktop is in the fleet.
    const reg = await enablePush().catch((e) => ({ ok: false, message: e?.message }))
    refreshPushStatus()
    if (!reg.ok) {
      flash(reg.message || "Could not enable notifications on this device", true)
      return
    }
    // 2) Then send a test to ALL registered admin devices.
    const t = await sendTestPush().catch((e) => ({ ok: false, error: e?.message }))
    flash(t.ok ? "✅ Test sent to all admin devices." : t.error || "Test failed", !t.ok)
  }

  function logout() {
    clearToken()
    navigate("/login", { replace: true })
  }

  const visible = orders.filter((o) => {
    const st = (o.status || "").toLowerCase()
    const matchFilter =
      filter === "all" ||
      (filter === "pending" && (st === "pending" || st === "processing" || st === "requires_action")) ||
      (filter === "completed" && (st === "completed" || st === "fulfilled" || st === "paid")) ||
      (filter === "canceled" && (st === "canceled" || st === "failed"))
    if (!matchFilter) return false
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const name = `${o.shipping_address?.first_name || ""} ${o.shipping_address?.last_name || ""} ${o.email || ""}`.toLowerCase()
    return String(o.display_id).includes(q) || name.includes(q) || (o.shipping_address?.city || "").toLowerCase().includes(q)
  })

  const bellClass = pushStatus === "on" ? "on" : pushStatus === "denied" ? "denied" : "off"

  return (
    <div className="screen">
      <TopBar
        subtitle={`${count} orders`}
        loading={refreshing}
        right={
          <div className="topactions">
            <button className={`iconbtn bell ${bellClass}`} onClick={onBell} title="Order alerts">
              <svg width="22" height="22" viewBox="0 0 24 24"><path d="M12 22a2.5 2.5 0 0 0 2.45-2h-4.9A2.5 2.5 0 0 0 12 22zm6-6v-5a6 6 0 0 0-5-5.91V4a1 1 0 1 0-2 0v1.09A6 6 0 0 0 6 11v5l-1.7 1.7A1 1 0 0 0 5 19h14a1 1 0 0 0 .7-1.3L18 16z" fill="currentColor"/></svg>
            </button>
            <button className="iconbtn" onClick={logout} title="Logout">
              <svg width="22" height="22" viewBox="0 0 24 24"><path d="M16 17v-3H9v-4h7V7l5 5-5 5zM14 2a2 2 0 0 1 2 2v2h-2V4H5v16h9v-2h2v2a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9z" fill="currentColor"/></svg>
            </button>
          </div>
        }
      />

      <div className="content">
        {/* Search */}
        <input
          className="search mb"
          placeholder="Search order #, customer, city…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Filter chips */}
        <div className="chips mb">
          {FILTERS.map((f) => (
            <button key={f.key} className={`chip ${filter === f.key ? "on" : ""}`} onClick={() => setFilter(f.key)}>
              {f.label}
            </button>
          ))}
        </div>

        {deferredPrompt && (
          <div className="banner mb" style={{ background: "rgba(255,255,255,0.02)", borderColor: "var(--border)", color: "#fff", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontWeight: 500 }}>📱 Install Mobile Store App</span>
            <button className="btn sm primary" style={{ width: "auto", padding: "6px 12px" }} onClick={triggerInstall}>Install</button>
          </div>
        )}

        {pushStatus === "denied" && (
          <div className="banner mb">🔕 Notifications blocked. Chrome → site settings → Notifications → Allow, then tap the bell.</div>
        )}

        {loading ? (
          <div className="loading">Loading orders…</div>
        ) : visible.length === 0 ? (
          <div className="loading">{search || filter !== "all" ? "No matching orders." : "No orders yet."}</div>
        ) : (
          <>
            {visible.map((o) => {
              const name =
                `${o.shipping_address?.first_name || ""} ${o.shipping_address?.last_name || ""}`.trim() ||
                o.email || "Guest"
              return (
                <div key={o.id} className="ordercard tap" onClick={() => navigate(`/orders/${o.id}`)}>
                  <div className="spread">
                    <span className="bold" style={{ fontSize: 16 }}>#{o.display_id}</span>
                    <div className="badge-group">
                      <span className={`badge ${statusClass(o.status)}`}>{o.status}</span>
                      {o.payment_status && (
                        <span className={`badge ${statusClass(o.payment_status)}`}>
                          {o.payment_status}
                        </span>
                      )}
                      {o.fulfillment_status && (
                        <span className={`badge ${statusClass(o.fulfillment_status)}`}>
                          {o.fulfillment_status}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="spread mt8">
                    <div style={{ minWidth: 0 }}>
                      <div className="ellipsis" style={{ fontWeight: 600, fontSize: 14 }}>{name}</div>
                      <div className="small">
                        {o.shipping_address?.city ? `${o.shipping_address.city} · ` : ""}
                        {o.items?.length || 0} items · {timeAgo(o.created_at)}
                      </div>
                    </div>
                    <span className="bold price" style={{ color: "var(--accent)" }}>{formatMoney(o.total, o.currency_code)}</span>
                  </div>
                </div>
              )
            })}
            {orders.length < count && !search && filter === "all" && (
              <button className="btn ghost mt" onClick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            )}
          </>
        )}
      </div>

      {toast && <div className={`toast ${toast.err ? "err" : ""}`}>{toast.msg}</div>}
    </div>
  )
}
