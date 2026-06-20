import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { Container, Heading, Text } from "@medusajs/ui"
import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { A } from "../lib/admin-theme"

/**
 * Admin order widget — shows a Leaflet map with the customer's pinned
 * delivery location when the order has map metadata (set during checkout).
 *
 * Uses a lightweight iframe-based OpenStreetMap embed so we don't need
 * to install leaflet/react-leaflet in the admin package.
 */
const OrderMapWidget = () => {
  const { id: orderId } = useParams()
  const [mapData, setMapData] = useState<{
    lat: number
    lng: number
    address: string
    source: string
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) return

    // Ask for the linked cart's metadata too. The location is written to
    // the CART at checkout and is only copied onto the order by the
    // order.placed subscriber. If that subscriber didn't run (e.g. worker
    // not processing events) the order has no map_* yet — so we fall back
    // to reading it straight off the cart so the pin still shows.
    fetch(`/admin/orders/${orderId}?fields=*metadata,*cart.metadata`, {
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    })
      .then((r) => r.json())
      .then((data) => {
        const order = data.order
        const meta = order?.metadata || {}
        const cartMeta = order?.cart?.metadata || {}
        // Prefer order metadata; fall back to the cart's.
        const pick = (k: string) =>
          meta[k] !== undefined && meta[k] !== null && meta[k] !== ""
            ? meta[k]
            : cartMeta[k]
        const lat = parseFloat(String(pick("map_lat")))
        const lng = parseFloat(String(pick("map_lng")))
        if (!isNaN(lat) && !isNaN(lng)) {
          setMapData({
            lat,
            lng,
            address: String(pick("map_address") || ""),
            source: String(pick("map_source") || "form"),
          })
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <Container className="p-0 overflow-hidden">
        <div
          style={{
            padding: 20,
            borderBottom: A.border,
            background: A.bgCard,
          }}
        >
          <Heading>Delivery Location</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            Loading map…
          </Text>
        </div>
      </Container>
    )
  }

  if (!mapData) return null

  return (
    <Container className="p-0 overflow-hidden">
      {/* Header */}
      <div
        style={{
          padding: 20,
          borderBottom: A.border,
          background: A.bgCard,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
        }}
      >
        <div>
          <Heading>📍 Delivery Location</Heading>
          <Text size="small" className="text-ui-fg-subtle mt-1">
            {mapData.source === "map"
              ? "Browser geolocation recorded during checkout."
              : "Auto-detected from the shipping address."}
          </Text>
        </div>
        <span
          style={{
            fontSize: 10,
            fontWeight: 700,
            textTransform: "uppercase",
            letterSpacing: 0.6,
            background: mapData.source === "map" ? "#dcfce7" : "#e0f2fe",
            color: mapData.source === "map" ? "#166534" : "#0369a1",
            padding: "3px 8px",
            borderRadius: 4,
          }}
        >
          {mapData.source === "map" ? "Coordinates Captured" : "Auto-detected"}
        </span>
      </div>

      {/* Coordinates and Button */}
      <div
        style={{
          padding: 20,
          background: A.bgSubtle,
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {mapData.address && mapData.address !== "Browser Geolocation" && (
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: 8,
            }}
          >
            <span style={{ fontSize: 14 }}>📍</span>
            <Text size="small" className="text-ui-fg-base" style={{ lineHeight: 1.5 }}>
              {mapData.address}
            </Text>
          </div>
        )}
        
        <div style={{ display: "flex", gap: 24 }}>
          <div>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Latitude</span>
            <Text size="small" style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
              {mapData.lat.toFixed(6)}
            </Text>
          </div>
          <div>
            <span style={{ fontSize: 10, fontWeight: 600, color: "#6b7280", textTransform: "uppercase", display: "block", marginBottom: 2 }}>Longitude</span>
            <Text size="small" style={{ fontFamily: "monospace", fontSize: 13, fontWeight: 600 }}>
              {mapData.lng.toFixed(6)}
            </Text>
          </div>
        </div>

        <a
          href={`https://www.google.com/maps/search/?api=1&query=${mapData.lat},${mapData.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 8,
            height: 38,
            padding: "0 16px",
            background: "#1e1b4b",
            color: "#ffffff",
            borderRadius: 6,
            fontSize: 13,
            fontWeight: 600,
            textDecoration: "none",
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
            transition: "background 0.2s",
            alignSelf: "flex-start",
          }}
          onMouseOver={(e) => (e.currentTarget.style.background = "#312e81")}
          onMouseOut={(e) => (e.currentTarget.style.background = "#1e1b4b")}
        >
          🌐 View Location on Google Maps
        </a>
      </div>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details.after",
})

export default OrderMapWidget
