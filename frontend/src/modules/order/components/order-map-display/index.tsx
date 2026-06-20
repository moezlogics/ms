"use client"

import dynamic from "next/dynamic"

/**
 * OrderMapDisplay — Shows the delivery pin on a read-only Leaflet map.
 * Only renders when the order has map_lat / map_lng in metadata.
 *
 * We lazy-load the Leaflet client component (SSR=false) because Leaflet
 * depends on `window`. The fallback skeleton mimics the final height
 * so layout is stable.
 */
const MapPicker = dynamic(
  () => import("@modules/checkout/components/map-picker/_client"),
  {
    ssr: false,
    loading: () => (
      <div
        className="flex items-center justify-center rounded-xl border border-line bg-surface"
        style={{ height: 300 }}
      >
        <div className="flex items-center gap-2 text-ink/60 text-sm">
          <i className="ph ph-map-pin text-[18px]" aria-hidden />
          Loading map…
        </div>
      </div>
    ),
  }
)

type Props = {
  metadata: Record<string, any> | null | undefined
}

/**
 * Renders a "Delivery Location" card with an interactive read-only map
 * when the order metadata contains map_lat + map_lng (set during checkout).
 *
 * Falls back to nothing if no coordinates exist — the template already
 * renders text-only shipping details via <ShippingDetails />.
 */
const OrderMapDisplay = ({ metadata }: Props) => {
  const meta = metadata || {}
  const lat =
    typeof meta.map_lat === "number"
      ? meta.map_lat
      : meta.map_lat
      ? parseFloat(String(meta.map_lat))
      : undefined
  const lng =
    typeof meta.map_lng === "number"
      ? meta.map_lng
      : meta.map_lng
      ? parseFloat(String(meta.map_lng))
      : undefined
  const address = meta.map_address || ""
  const source = meta.map_source || "form"

  if (typeof lat !== "number" || typeof lng !== "number" || isNaN(lat) || isNaN(lng)) {
    return null
  }

  return (
    <div data-testid="order-map-display">
      {/* Section heading */}
      <div className="flex items-center gap-2 mb-4">
        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-success/10 text-success">
          <i className="ph-fill ph-map-pin text-[16px]" aria-hidden />
        </span>
        <h3 className="text-base font-semibold text-ink">Delivery Location</h3>
        <span className="text-[10px] uppercase tracking-widest font-semibold text-ink/40 bg-surface px-2 py-0.5 rounded">
          {source === "map" ? "Pin Placed" : "Auto-detected"}
        </span>
      </div>

      {/* Map */}
      <div className="rounded-xl overflow-hidden shadow-soft">
        <MapPicker
          initialLat={lat}
          initialLng={lng}
          initialZoom={16}
          height={300}
          readOnly
          onPick={() => {}}
        />
      </div>

      {/* Address text below map */}
      {address && (
        <div className="mt-3 flex items-start gap-2 text-sm text-ink/70 bg-surface rounded-lg px-4 py-3">
          <i className="ph ph-navigation-arrow text-[14px] mt-0.5 text-primary" aria-hidden />
          <span className="leading-relaxed">{address}</span>
        </div>
      )}

      {/* Coordinates (subtle) */}
      <p className="mt-2 text-[11px] text-ink/40 tabular-nums">
        {lat.toFixed(6)}, {lng.toFixed(6)}
      </p>
    </div>
  )
}

export default OrderMapDisplay
