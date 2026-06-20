import { useCallback, useEffect, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  cancelOrder,
  completeOrder,
  fulfillOrder,
  getOrder,
} from "../api"
import { formatMoney, statusClass, timeAgo } from "../util"
import TopBar from "../components/TopBar"

export default function OrderDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [order, setOrder] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [acting, setActing] = useState<string | null>(null)
  const [toast, setToast] = useState<{ msg: string; err?: boolean } | null>(null)

  const flash = (msg: string, err = false) => {
    setToast({ msg, err })
    setTimeout(() => setToast(null), 3500)
  }

  const load = useCallback(async (isSilent = false) => {
    if (!id) return
    if (!isSilent) setLoading(true)
    setRefreshing(true)
    try {
      const data = await getOrder(id)
      setOrder(data.order)
    } catch (e: any) {
      if (e?.status === 401) return navigate("/login", { replace: true })
      flash(e?.message || "Failed to load order", true)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [id, navigate])

  useEffect(() => {
    load()
  }, [load])

  async function runAction(label: string, fn: () => Promise<any>) {
    if (!confirm(`${label} this order?`)) return
    setActing(label)
    try {
      await fn()
      flash(`${label} done.`)
      await load(true)
    } catch (e: any) {
      flash(e?.message || `${label} failed`, true)
    } finally {
      setActing(null)
    }
  }

  if (loading) {
    return (
      <div className="screen">
        <TopBar onBack={() => navigate("/orders")} title="Loading Order..." loading={true} showBrand={false} />
        <div className="content"><div className="loading">Loading details…</div></div>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="screen">
        <TopBar onBack={() => navigate("/orders")} title="Order Not Found" showBrand={false} />
        <div className="content"><div className="loading">Order not found.</div></div>
      </div>
    )
  }

  const cur = order.currency_code || "PKR"
  const addr = order.shipping_address || {}
  const meta = order.metadata || {}
  const cartMeta = order.cart?.metadata || {}
  const lat = parseFloat(String(meta.map_lat ?? cartMeta.map_lat))
  const lng = parseFloat(String(meta.map_lng ?? cartMeta.map_lng))
  const hasGeo = !isNaN(lat) && !isNaN(lng)
  const mapAddress = meta.map_address || cartMeta.map_address || ""
  const items: any[] = order.items || []
  const fulfillItems = items.map((i) => ({ id: i.id, quantity: i.quantity }))

  const isFulfilled = order.fulfillment_status === "fulfilled" || order.status === "completed"
  const isCanceled = order.status === "canceled"
  const isCompleted = order.status === "completed"

  return (
    <div className="screen">
      <TopBar
        onBack={() => navigate("/orders")}
        title={`Order #${order.display_id}`}
        showBrand={false}
        loading={refreshing}
        right={
          <button className="iconbtn" onClick={() => load(true)} title="Refresh order details">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l.73-.73" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
        }
      />

      <div className="content">
        {/* Status card */}
        <div className="card">
          <div className="spread mb8">
            <span className="small">Placed {timeAgo(order.created_at)}</span>
            <div className="badge-group">
              <span className={`badge ${statusClass(order.status)}`}>{order.status}</span>
              {order.payment_status && (
                <span className={`badge ${statusClass(order.payment_status)}`}>
                  {order.payment_status}
                </span>
              )}
              {order.fulfillment_status && (
                <span className={`badge ${statusClass(order.fulfillment_status)}`}>
                  {order.fulfillment_status}
                </span>
              )}
            </div>
          </div>
          <div className="spread mt" style={{ paddingTop: 10, borderTop: "1px solid var(--border)" }}>
            <span className="muted" style={{ fontSize: 13, fontWeight: 500 }}>Total amount</span>
            <span className="bold" style={{ fontSize: 18, color: "var(--accent)" }}>{formatMoney(order.total, cur)}</span>
          </div>
        </div>

        {/* Customer info card */}
        <div className="card">
          <div className="card-header">Customer Details</div>
          <div className="bold" style={{ fontSize: 15 }}>
            {`${addr.first_name || ""} ${addr.last_name || ""}`.trim() || order.email || "Guest Customer"}
          </div>
          {order.email && <div className="small mt8" style={{ display: "flex", alignItems: "center", gap: 6 }}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><path d="m22 6-10 7L2 6"/></svg> {order.email}</div>}
          {addr.phone && <div className="small mt8" style={{ display: "flex", alignItems: "center", gap: 6 }}><svg width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/></svg> {addr.phone}</div>}
          
          {(addr.address_1 || addr.city) && (
            <div className="muted mt" style={{ fontSize: 13, borderTop: "1px solid var(--border)", paddingTop: 12 }}>
              <div style={{ fontWeight: 600, color: "var(--fg)", marginBottom: 4 }}>Shipping Address</div>
              {[addr.address_1, addr.address_2, addr.city, addr.province, addr.postal_code, addr.country_code]
                .filter(Boolean)
                .join(", ")}
            </div>
          )}
          
          {mapAddress && (
            <div className="small mt" style={{ background: "rgba(255,255,255,0.03)", padding: "8px 12px", borderRadius: 8, display: "flex", alignItems: "flex-start", gap: 6 }}>
              <span>📍</span>
              <div style={{ flex: 1 }}>{mapAddress}</div>
            </div>
          )}

          {hasGeo && (
            <a
              className="btn sm mt"
              style={{ background: "rgba(16, 165, 233, 0.08)", borderColor: "rgba(14, 165, 233, 0.2)", color: "#38bdf8", marginTop: 12 }}
              href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`}
              target="_blank"
              rel="noreferrer"
            >
              🌐 View delivery location on map
            </a>
          )}
        </div>

        {/* Items card */}
        <div className="card">
          <div className="card-header">Items ({items.length})</div>
          {items.map((it) => (
            <div className="item" key={it.id}>
              {it.thumbnail ? (
                <img className="thumb" src={it.thumbnail} alt="" />
              ) : (
                <div className="thumb" style={{ display: "flex", alignItems: "center", justifyContent: "center" }}>📦</div>
              )}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontWeight: 600, fontSize: 14 }}>
                  {it.title}
                </div>
                <div className="small" style={{ marginTop: 2 }}>
                  {it.variant_title ? <span className="chip sm" style={{ padding: "2px 6px", fontSize: 10, marginRight: 6 }}>{it.variant_title}</span> : ""}Qty {it.quantity}
                </div>
              </div>
              <div className="bold" style={{ fontSize: 14 }}>{formatMoney((it.unit_price || 0) * (it.quantity || 1), cur)}</div>
            </div>
          ))}
          
          <div className="mt" style={{ borderTop: "1px solid var(--border)", paddingTop: 12 }}>
            <div className="spread small" style={{ margin: "4px 0" }}>
              <span className="muted">Subtotal</span>
              <span style={{ color: "var(--fg)" }}>{formatMoney(order.subtotal, cur)}</span>
            </div>
            {!!order.shipping_total && (
              <div className="spread small" style={{ margin: "4px 0" }}>
                <span className="muted">Shipping</span>
                <span style={{ color: "var(--fg)" }}>{formatMoney(order.shipping_total, cur)}</span>
              </div>
            )}
            {!!order.tax_total && (
              <div className="spread small" style={{ margin: "4px 0" }}>
                <span className="muted">Tax</span>
                <span style={{ color: "var(--fg)" }}>{formatMoney(order.tax_total, cur)}</span>
              </div>
            )}
            {!!order.discount_total && (
              <div className="spread small" style={{ margin: "4px 0" }}>
                <span className="muted">Discount</span>
                <span style={{ color: "var(--green)" }}>-{formatMoney(order.discount_total, cur)}</span>
              </div>
            )}
            <div className="spread bold mt" style={{ borderTop: "1px solid var(--border)", paddingTop: 10, fontSize: 15 }}>
              <span>Total</span>
              <span style={{ color: "var(--accent)" }}>{formatMoney(order.total, cur)}</span>
            </div>
          </div>
        </div>

        {/* Action Panel */}
        {!isCanceled && !isCompleted && (
          <div className="card">
            <div className="card-header">Fulfillment & Operations</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {!isFulfilled && (
                <button
                  className="btn primary"
                  disabled={!!acting}
                  onClick={() => runAction("Mark fulfilled", () => fulfillOrder(order.id, fulfillItems))}
                >
                  {acting === "Mark fulfilled" ? "Fulfilling…" : "📦 Fulfill Order Items"}
                </button>
              )}
              
              <button
                className="btn primary"
                style={{ background: isFulfilled ? "var(--accent)" : "rgba(255,255,255,0.05)", color: isFulfilled ? "#000" : "var(--fg)" }}
                disabled={!!acting}
                onClick={() => runAction("Complete", () => completeOrder(order.id))}
              >
                {acting === "Complete" ? "Completing…" : "✅ Complete Order"}
              </button>
              
              <button
                className="btn danger"
                disabled={!!acting}
                onClick={() => runAction("Cancel", () => cancelOrder(order.id))}
              >
                {acting === "Cancel" ? "Canceling…" : "✕ Cancel Order"}
              </button>
            </div>
          </div>
        )}
      </div>

      {toast && <div className={`toast ${toast.err ? "err" : ""}`}>{toast.msg}</div>}
    </div>
  )
}
